-- ═══════════════════════════════════════════════════════════════════════
-- Alyema 积分系统 · 就地补齐（不新建钱包表）
--
-- 线上已有一套简易实现：credit_ledger（action / amount / ledger_type）+
-- credit_costs 价目表 + consume_credits / refund_credits / credit_balance。
-- 本迁移保留这张表与这套命名，只补齐它缺的四件东西：
--
--   1. 幂等 —— 加 ref 列 + 唯一索引，网络重试/双击不会重复扣分
--   2. 并发安全 —— 用顾问锁串行化同一用户的扣费（没有钱包行可锁）
--   3. 成本审计 —— 加 cost_usd 列，可反算真实毛利率
--   4. 订阅（Pro）—— 写 profiles.plan / plan_expires_at
--
-- 同时把所有积分函数收归 service_role：扣费与退款只能由服务端发起。
-- 全程幂等，可重复执行。执行方式：贴进 Supabase SQL Editor 或 supabase db push。
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────── 1. 流水表：补幂等键与成本列 ─────────────────────────
alter table public.credit_ledger add column if not exists ref      text;
alter table public.credit_ledger add column if not exists cost_usd numeric(12, 6) not null default 0;

-- 同一用户同一 ref 只记一次账（部分索引：ref 为空的旧数据不参与约束）
create unique index if not exists credit_ledger_ref_uniq
  on public.credit_ledger (user_id, ref)
  where ref is not null;

-- ───────────────────────── 2. 流水一致性约束 ─────────────────────────
alter table public.credit_ledger drop constraint if exists credit_ledger_amount_nonzero;
alter table public.credit_ledger add  constraint credit_ledger_amount_nonzero check (amount <> 0);

alter table public.credit_ledger drop constraint if exists credit_ledger_type_valid;
alter table public.credit_ledger add  constraint credit_ledger_type_valid
  check (ledger_type in ('reward', 'consume', 'refund'));

-- ───────────────────────── 3. 价目表：补齐缺失的动作 ─────────────────────────
-- 缺行会让 consume_credits 返回 cost_not_defined，这里按 0（免费）补上占位。
insert into public.credit_costs (action, cost) values ('optimize-video-prompt', 0)
on conflict (action) do nothing;

-- ───────────────────────── 4. 订阅列（Pro 状态存在 profiles 上） ─────────────────────────
-- 注意：plan 列必须显式补齐。原线上 profiles 没有这一列，
-- 缺了它 wallet_summary / set_plan 会直接报错（column plan does not exist），
-- 导致前端读到的余额恒为 0、订阅恒为 free。
alter table public.profiles add column if not exists plan text not null default 'free';
alter table public.profiles add column if not exists plan_expires_at timestamptz;

-- ───────────────────────── 5. RLS：客户端只读自己的流水 ─────────────────────────
alter table public.credit_ledger enable row level security;
alter table public.credit_costs  enable row level security;

drop policy if exists "own credit_ledger" on public.credit_ledger;
drop policy if exists credit_ledger_select_own on public.credit_ledger;
create policy credit_ledger_select_own on public.credit_ledger
  for select using (auth.uid() = user_id);

-- 价目表可读不可写（防止客户端把价格改成 0）
drop policy if exists "read credit_costs" on public.credit_costs;
create policy "read credit_costs" on public.credit_costs for select using (true);

revoke insert, update, delete, truncate, references, trigger on public.credit_ledger from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.credit_costs  from anon, authenticated;

-- ───────────────────────── 6. 余额：显式传用户（服务端口径） ─────────────────────────
drop function if exists public.credit_balance();

create or replace function public.credit_balance(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::integer
    from public.credit_ledger
   where user_id = p_user_id;
$$;

-- ───────────────────────── 7. 扣费：幂等 + 顾问锁 + 成本审计 ─────────────────────────
drop function if exists public.consume_credits(text);

create or replace function public.consume_credits(
  p_user_id  uuid,
  p_action   text,
  p_ref      text default null,
  p_cost_usd numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost    integer;
  v_balance integer;
  v_id      bigint;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  -- 没有钱包行可锁，用顾问锁把同一用户的扣费串行化（事务结束自动释放）
  perform pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  -- 幂等：同一 ref 已记过账就直接返回
  if p_ref is not null then
    select id into v_id from public.credit_ledger
     where user_id = p_user_id and ref = p_ref
     limit 1;
    if found then
      return jsonb_build_object('ok', true, 'balance', public.credit_balance(p_user_id),
                                'ledger_id', v_id, 'charged', 0, 'duplicate', true);
    end if;
  end if;

  select cost into v_cost from public.credit_costs where action = p_action;
  if v_cost is null then
    return jsonb_build_object('ok', false, 'error', 'cost_not_defined', 'action', p_action);
  end if;

  v_balance := public.credit_balance(p_user_id);

  if v_balance < v_cost then
    return jsonb_build_object('ok', false, 'error', 'insufficient',
                              'balance', v_balance, 'required', v_cost);
  end if;

  -- 免费动作不落流水（amount 约束禁止 0 值行）
  if v_cost = 0 then
    return jsonb_build_object('ok', true, 'balance', v_balance, 'charged', 0, 'free', true);
  end if;

  insert into public.credit_ledger (user_id, action, amount, ledger_type, ref, cost_usd)
  values (p_user_id, p_action, -v_cost, 'consume', p_ref, coalesce(p_cost_usd, 0))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'balance', v_balance - v_cost,
                            'ledger_id', v_id, 'charged', v_cost);
exception
  when unique_violation then
    -- 并发下同一 ref 被另一个请求抢先写入 → 视为重复，不重复扣
    return jsonb_build_object('ok', true, 'balance', public.credit_balance(p_user_id),
                              'charged', 0, 'duplicate', true);
end $$;

-- ───────────────────────── 8. 退款：按扣费流水退回，每笔只能退一次 ─────────────────────────
drop function if exists public.refund_credits(bigint);

create or replace function public.refund_credits(p_user_id uuid, p_ledger_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     public.credit_ledger;
  v_ref     text;
  v_balance integer;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  select * into v_row from public.credit_ledger
   where id = p_ledger_id and user_id = p_user_id and ledger_type = 'consume';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'ledger_not_refundable');
  end if;

  -- 退款流水自带 ref = refund:<原流水 id>，唯一索引保证只退一次
  v_ref := 'refund:' || v_row.id;
  if exists (select 1 from public.credit_ledger where user_id = p_user_id and ref = v_ref) then
    return jsonb_build_object('ok', true, 'balance', public.credit_balance(p_user_id), 'duplicate', true);
  end if;

  insert into public.credit_ledger (user_id, action, amount, ledger_type, ref, cost_usd)
  values (p_user_id, v_row.action, -v_row.amount, 'refund', v_ref, 0);

  v_balance := public.credit_balance(p_user_id);
  return jsonb_build_object('ok', true, 'balance', v_balance, 'refunded', -v_row.amount);
end $$;

-- ───────────────────────── 9. 发放：管理员充值 / 补偿（幂等） ─────────────────────────
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text default 'admin_grant',
  p_ref     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount integer := coalesce(p_amount, 0);
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;
  if v_amount = 0 then
    return jsonb_build_object('ok', true, 'balance', public.credit_balance(p_user_id));
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  if p_ref is not null and exists (
    select 1 from public.credit_ledger where user_id = p_user_id and ref = p_ref
  ) then
    return jsonb_build_object('ok', true, 'balance', public.credit_balance(p_user_id), 'duplicate', true);
  end if;

  insert into public.credit_ledger (user_id, action, amount, ledger_type, ref, cost_usd)
  values (p_user_id, coalesce(p_reason, 'admin_grant'), v_amount, 'reward', p_ref, 0);

  return jsonb_build_object('ok', true, 'balance', public.credit_balance(p_user_id), 'granted', v_amount);
end $$;

-- ───────────────────────── 10. 订阅：开通 / 续期 Pro（写 profiles） ─────────────────────────
-- profiles 的主键列名（id 或 user_id）不确定，运行时探测一次，两种都能用。
create or replace function public.set_plan(
  p_user_id uuid,
  p_plan    text,
  p_days    integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan    text := case when lower(coalesce(p_plan, 'free')) = 'pro' then 'pro' else 'free' end;
  v_col     text;
  v_expires timestamptz;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  select case when exists (
           select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
         ) then 'user_id' else 'id' end
    into v_col;

  if v_plan = 'pro' then
    -- 续期从「当前到期时间」或「现在」往后加，避免叠加时缩短
    execute format(
      'select greatest(coalesce(plan_expires_at, now()), now()) from public.profiles where %I = $1', v_col
    ) into v_expires using p_user_id;
    v_expires := coalesce(v_expires, now()) + (greatest(coalesce(p_days, 30), 1) || ' days')::interval;
  else
    v_expires := null;
  end if;

  execute format(
    'update public.profiles set plan = $1, plan_expires_at = $2 where %I = $3', v_col
  ) using v_plan, v_expires, p_user_id;

  return jsonb_build_object('ok', true, 'plan', v_plan, 'plan_expires_at', v_expires);
end $$;

-- ───────────────────────── 11. 账户汇总：余额 + 订阅（一个接口给前端） ─────────────────────────
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
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  select case when exists (
           select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
         ) then 'user_id' else 'id' end
    into v_col;

  execute format('select plan, plan_expires_at from public.profiles where %I = $1', v_col)
    into v_plan, v_expires using p_user_id;

  -- 订阅过期自动降级
  if v_plan = 'pro' and v_expires is not null and v_expires < now() then
    execute format(
      'update public.profiles set plan = ''free'', plan_expires_at = null where %I = $1', v_col
    ) using p_user_id;
    v_plan := 'free';
    v_expires := null;
  end if;

  return jsonb_build_object(
    'ok', true,
    'balance', public.credit_balance(p_user_id),
    'plan', coalesce(v_plan, 'free'),
    'plan_expires_at', v_expires
  );
end $$;

-- ───────────────────────── 12. 权限：积分函数只给 service_role ─────────────────────────
revoke all on function public.consume_credits(uuid, text, text, numeric) from public, anon, authenticated;
revoke all on function public.refund_credits(uuid, bigint)               from public, anon, authenticated;
revoke all on function public.credit_balance(uuid)                       from public, anon, authenticated;
revoke all on function public.grant_credits(uuid, integer, text, text)   from public, anon, authenticated;
revoke all on function public.set_plan(uuid, text, integer)              from public, anon, authenticated;
revoke all on function public.wallet_summary(uuid)                       from public, anon, authenticated;

grant execute on function public.consume_credits(uuid, text, text, numeric) to service_role;
grant execute on function public.refund_credits(uuid, bigint)               to service_role;
grant execute on function public.credit_balance(uuid)                       to service_role;
grant execute on function public.grant_credits(uuid, integer, text, text)   to service_role;
grant execute on function public.set_plan(uuid, text, integer)              to service_role;
grant execute on function public.wallet_summary(uuid)                       to service_role;

-- ───────────────────────── 13. 运维备忘 ─────────────────────────
-- 调价：只改 credit_costs（前端价目、实际扣费都读它）
--   update public.credit_costs set cost = 167 where action = 'vision-video';
-- 手动发积分：
--   select public.grant_credits('<user-uuid>', 1000, 'manual_topup');
-- 开通 30 天 Pro：
--   select public.set_plan('<user-uuid>', 'pro', 30);
-- 查账（某人余额与最近流水）：
--   select public.credit_balance('<user-uuid>');
--   select id, action, amount, ledger_type, ref, cost_usd, created_at
--     from public.credit_ledger where user_id = '<user-uuid>' order by id desc limit 20;