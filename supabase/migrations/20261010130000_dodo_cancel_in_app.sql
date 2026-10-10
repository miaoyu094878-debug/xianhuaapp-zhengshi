-- ═══════════════════════════════════════════════════════════════════════
-- 产品内取消订阅（方案 C）：把「取消」从 Dodo 门户搬回我们自己的界面
--
-- 为什么必须做
--   原路径只有「跳 Dodo 门户 → 输邮箱 → 收 magic link 邮件 → 点链接 → 取消」，
--   步骤比注册还多。加州 ARL / ROSCA 要求提供「简单机制」停止扣款，
--   CCPA(Cal. Civ. Code §1798.140) 更是把「取消比注册难」直接归为 dark pattern。
--   改成本方案后：My Profile 内一键取消，后端直接调 Dodo API，全程不离开产品。
--
-- 为什么要存这三个字段
--   1) dodo_subscription_id
--      调 PATCH /subscriptions/{id} 取消时必须提供订阅 ID，
--      而 webhook 的 subscription.active / renewed 是唯一能稳定拿到它的时机 ——
--      之前从来没存过，所以产品内取消根本无法实现。
--   2) dodo_customer_id
--      将来做「生成门户直达链接」(POST /customers/{id}/customer-portal/session) 要用。
--   3) dodo_cancel_scheduled_at  ← 最关键
--      Dodo 文档明确：设置 cancel_at_next_billing_date **不会发送任何 webhook**，
--      只有真正取消那一刻才发 subscription.cancelled。
--      所以「已排定取消，到期后转 Free」这个状态只能自己记，
--      否则前端无从显示，用户会以为没取消成功、进而找银行发起拒付。
--
-- 幂等：add column if not exists + create or replace，可重复执行，不影响已有数据
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────── 1. profiles 新增三列 ─────────────────
alter table public.profiles add column if not exists dodo_customer_id        text;
alter table public.profiles add column if not exists dodo_subscription_id    text;
alter table public.profiles add column if not exists dodo_cancel_scheduled_at timestamptz;

comment on column public.profiles.dodo_subscription_id is 'Dodo 订阅 ID（sub_xxx），取消 / 换档时调用 API 要用';
comment on column public.profiles.dodo_customer_id     is 'Dodo 客户 ID（cus_xxx），生成门户直达链接要用';
comment on column public.profiles.dodo_cancel_scheduled_at is '排定取消的时间；非空表示「本期末自动转 Free」。Dodo 不发此事件的 webhook，只能自己记';


-- ───────────────── 2. 写入订阅 ID ─────────────────
-- 由 webhook 在 subscription.active / renewed 时调用。
-- 同时清除排定取消标记：既然收到新的 active/renewed，说明是一次新的开通或续期，
-- 旧的「排定取消」不再成立（否则用户续费后仍被显示成"即将取消"）。
create or replace function public.set_dodo_subscription(
  p_user_id         uuid,
  p_customer_id     text,
  p_subscription_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_col text;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;
  if p_subscription_id is null or p_subscription_id = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_subscription_id');
  end if;

  select case when exists (
           select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
         ) then 'user_id' else 'id' end
    into v_col;

  execute format(
    'update public.profiles
        set dodo_customer_id         = coalesce($1, dodo_customer_id),
            dodo_subscription_id     = $2,
            dodo_cancel_scheduled_at = null
      where %I = $3', v_col
  ) using p_customer_id, p_subscription_id, p_user_id;

  return jsonb_build_object('ok', true, 'subscription_id', p_subscription_id);
end $$;

revoke all on function public.set_dodo_subscription(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_dodo_subscription(uuid, text, text) to service_role;


-- ───────────────── 3. 读取订阅信息（仅后端用，不暴露给前端） ─────────────────
-- 只授予 service_role：订阅 ID 无需下发到浏览器，取消动作在后端完成即可。
create or replace function public.dodo_subscription_of(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_col    text;
  v_sub_id text;
  v_cus_id text;
  v_cancel timestamptz;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  select case when exists (
           select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
         ) then 'user_id' else 'id' end
    into v_col;

  execute format(
    'select dodo_subscription_id, dodo_customer_id, dodo_cancel_scheduled_at
       from public.profiles where %I = $1', v_col
  ) into v_sub_id, v_cus_id, v_cancel using p_user_id;

  return jsonb_build_object(
    'ok', true,
    'subscription_id', v_sub_id,
    'customer_id', v_cus_id,
    'cancel_scheduled', v_cancel is not null
  );
end $$;

revoke all on function public.dodo_subscription_of(uuid) from public, anon, authenticated;
grant execute on function public.dodo_subscription_of(uuid) to service_role;


-- ───────────────── 4. 标记 / 清除排定取消 ─────────────────
-- 因为 Dodo 不为 cancel_at_next_billing_date 发 webhook，必须由我们在
-- 调用 API 成功后自己落库，前端才有得显示。
create or replace function public.set_dodo_cancel_scheduled(
  p_user_id   uuid,
  p_scheduled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_col text;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  select case when exists (
           select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
         ) then 'user_id' else 'id' end
    into v_col;

  execute format(
    'update public.profiles
        set dodo_cancel_scheduled_at = case when $1 then now() else null end
      where %I = $2', v_col
  ) using coalesce(p_scheduled, false), p_user_id;

  return jsonb_build_object('ok', true, 'cancel_scheduled', coalesce(p_scheduled, false));
end $$;

revoke all on function public.set_dodo_cancel_scheduled(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_dodo_cancel_scheduled(uuid, boolean) to service_role;


-- ───────────────── 5. wallet_summary：返回「已排定取消」给前端 ─────────────────
-- 签名不变，仅在返回 jsonb 里多加一个 key，不影响任何现有调用方。
-- 同时：过期自动降级时清除排定标记（已转 Free，不该继续显示"即将取消"）。
create or replace function public.wallet_summary(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_col     text;
  v_plan    text := 'free';
  v_expires timestamptz;
  v_cancel  timestamptz;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  select case when exists (
           select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
         ) then 'user_id' else 'id' end
    into v_col;

  execute format(
    'select plan, plan_expires_at, dodo_cancel_scheduled_at from public.profiles where %I = $1', v_col
  ) into v_plan, v_expires, v_cancel using p_user_id;

  -- 订阅过期自动降级：lite 与 pro 都要覆盖
  if v_plan in ('pro', 'lite') and v_expires is not null and v_expires < now() then
    execute format(
      'update public.profiles
          set plan = ''free'', plan_expires_at = null, dodo_cancel_scheduled_at = null
        where %I = $1', v_col
    ) using p_user_id;
    v_plan   := 'free';
    v_expires := null;
    v_cancel := null;
  end if;

  return jsonb_build_object(
    'ok', true,
    'balance', public.credit_balance(p_user_id),
    'plan', coalesce(v_plan, 'free'),
    'plan_expires_at', v_expires,
    'cancel_scheduled', v_cancel is not null
  );
end $$;

revoke all on function public.wallet_summary(uuid) from public, anon, authenticated;
grant execute on function public.wallet_summary(uuid) to service_role;


-- ═══════════════════════════════════════════════════════════════════════
-- 执行后验证（Supabase SQL Editor）
--
--   -- 列已加上
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='profiles'
--      and column_name like 'dodo%';
--   -- 预期：dodo_customer_id / dodo_subscription_id / dodo_cancel_scheduled_at
--
--   -- 三个新函数存在且只授给 service_role
--   select proname, pg_get_function_identity_arguments(oid) as args
--     from pg_proc
--    where proname in ('set_dodo_subscription','dodo_subscription_of','set_dodo_cancel_scheduled');
--
--   -- wallet_summary 多返回一个 key
--   select public.wallet_summary('<user_id>');
--   -- 预期含 "cancel_scheduled": false
--
--   -- 补写历史订阅的 ID（对已付费但字段为空的用户，从 Dodo 后台查 sub_xxx 后手动回填）
--   select public.set_dodo_subscription('<user_id>', 'cus_xxx', 'sub_xxx');
-- ═══════════════════════════════════════════════════════════════════════
