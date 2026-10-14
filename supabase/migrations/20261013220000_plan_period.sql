-- ═══════════════════════════════════════════════════════════════════════
-- 20261013220000_plan_period.sql
-- 记录用户当前订阅的【计费周期】monthly / yearly，供「换档规则」判定使用。
--
-- 背景
--   profiles 原本只有 plan（free / lite / pro）与 plan_expires_at，
--   **无法区分「Lite 月付」与「Lite 年付」**。而换档规则要求：
--       同档同周期  -> 禁止（防重复购买、防两笔订阅并存双扣）
--       月 -> 年    -> 允许
--       年 -> 月    -> 禁止
--       lite -> pro -> 允许（升级）
--       pro -> lite -> 禁止（降级）
--   因此必须真实存一份周期。
--
-- 为什么不能用「plan_expires_at 剩余天数」推断周期
--   年付用户在最后两个月剩余天数 < 60，会被误判成月付，
--   于是「再买一次年付」被放行 -> 开出第二笔年付订阅 -> 重复扣费 + 时长叠加
--   （set_plan 是 greatest(旧到期日, now) + days，会白送一整年）。
--
-- 权限
--   20260929010000 已收回 profiles 的【表级】INSERT / UPDATE，
--   只按列授予 name / area / desire。新增列不在授权清单内，
--   客户端（anon / authenticated）写不到，只有 service_role 能写 —— 无需额外 revoke。
--
-- 幂等：add column if not exists + create or replace，可重复执行
-- ═══════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists plan_period text;

comment on column public.profiles.plan_period is
  '当前订阅的计费周期：monthly / yearly。free 时为 null。由 activate_subscription 写入。';


-- ───────────────── 1. set_plan：降级为 free 时清空周期 ─────────────────
-- 不清会在 plan='free' 时残留 'yearly'，干扰下次换档判定。
-- 付费档的周期不在这里写（set_plan 没有周期参数），由 activate_subscription 负责。
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
  v_plan    text := lower(coalesce(p_plan, 'free'));
  v_col     text;
  v_expires timestamptz;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  -- 付费档白名单：只有 lite / pro，其余一律归 free
  if v_plan not in ('lite', 'pro') then
    v_plan := 'free';
  end if;

  select case when exists (
           select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
         ) then 'user_id' else 'id' end
    into v_col;

  if v_plan in ('lite', 'pro') then
    -- 续期从「当前到期时间」或「现在」往后加，避免叠加时缩短
    execute format(
      'select greatest(coalesce(plan_expires_at, now()), now()) from public.profiles where %I = $1', v_col
    ) into v_expires using p_user_id;
    v_expires := coalesce(v_expires, now()) + (greatest(coalesce(p_days, 30), 1) || ' days')::interval;
  else
    v_expires := null;
  end if;

  execute format(
    'update public.profiles
        set plan            = $1,
            plan_expires_at = $2,
            plan_period     = case when $1 = ''free'' then null::text else plan_period end
      where %I = $3', v_col
  ) using v_plan, v_expires, p_user_id;

  return jsonb_build_object('ok', true, 'plan', v_plan, 'plan_expires_at', v_expires);
end $$;

-- 权限保持：签名未变，重复授权幂等
revoke all on function public.set_plan(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.set_plan(uuid, text, integer) to service_role;


-- ───────────────── 2. activate_subscription：写入周期 ─────────────────
-- 只在真正开通/续期时写入。走「升级保护」提前 return 的分支（已是 Pro 收到 Lite）
-- 不动周期，因为那笔订阅被跳过、档位根本没变。
create or replace function public.activate_subscription(
  p_user_id uuid,
  p_period  text default 'monthly',
  p_plan    text default 'pro'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan    text := lower(coalesce(p_plan, 'pro'));
  v_days    integer;
  v_points  integer;
  v_expiry  date;
  v_ref     text;
  v_col     text;
  v_cur     text;
  v_cur_exp timestamptz;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if p_period not in ('monthly', 'yearly') then
    return jsonb_build_object('ok', false, 'error', 'bad_period', 'period', p_period);
  end if;

  if v_plan not in ('lite', 'pro') then
    return jsonb_build_object('ok', false, 'error', 'bad_plan', 'plan', p_plan);
  end if;

  if p_period = 'monthly' then
    v_days := 30;
  else
    v_days := 365;
  end if;

  -- 积分：仅 Pro 随附。Lite 不含 AI 能力，给了也用不掉，故为 0
  if v_plan = 'pro' then
    v_points := case when p_period = 'monthly' then 990 else 10500 end;
  else
    v_points := 0;
  end if;

  select case when exists (
           select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
         ) then 'user_id' else 'id' end
    into v_col;

  execute format('select plan, plan_expires_at from public.profiles where %I = $1', v_col)
    into v_cur, v_cur_exp using p_user_id;

  -- 升级保护：已是 Pro 且未过期时，收到 Lite 订阅【不降级】。
  -- 场景：用户先买 Pro 又买了 Lite（换档/误购），不应把 AI 权限收走。
  if v_plan = 'lite' and v_cur = 'pro' and (v_cur_exp is null or v_cur_exp > now()) then
    return jsonb_build_object(
      'ok', true, 'skipped', true, 'reason', 'already_pro',
      'plan', 'pro', 'period', p_period, 'points', 0, 'expires_at', v_cur_exp
    );
  end if;

  -- 幂等键：区分档位，避免 Pro 与 Lite 共用同一 ref 导致积分漏发
  v_expiry := (now() + make_interval(days => v_days))::date;
  v_ref    := 'sub:' || v_plan || ':' || p_period || ':' || to_char(v_expiry, 'YYYY-MM-DD');

  -- 1) 开通 / 续期（profiles.plan + plan_expires_at）
  perform public.set_plan(p_user_id, v_plan, v_days);

  -- 1b) 记录本次的计费周期（换档规则判定用）
  execute format(
    'update public.profiles set plan_period = $1 where %I = $2', v_col
  ) using p_period, p_user_id;

  -- 2) 发放随附积分（grant_credits 内部按 ref 幂等，重复调用不会重复发）
  if v_points > 0 then
    perform public.grant_credits(p_user_id, v_points, 'subscription_' || p_period, v_ref);
  end if;

  return jsonb_build_object(
    'ok',         true,
    'plan',       v_plan,
    'period',     p_period,
    'days',       v_days,
    'points',     v_points,
    'expires_at', v_expiry,
    'ref',        v_ref
  );
end $$;

revoke all on function public.activate_subscription(uuid, text, text) from public, anon, authenticated;
grant execute on function public.activate_subscription(uuid, text, text) to service_role;


-- ───────────────── 3. wallet_summary：返回周期给前端 ─────────────────
-- 签名不变，仅在返回 jsonb 里多加一个 key，不影响任何现有调用方。
-- 过期自动降级时同时清空周期。
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
  v_period  text;
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
    'select plan, plan_expires_at, dodo_cancel_scheduled_at, plan_period from public.profiles where %I = $1', v_col
  ) into v_plan, v_expires, v_cancel, v_period using p_user_id;

  -- 订阅过期自动降级：lite 与 pro 都要覆盖
  if v_plan in ('pro', 'lite') and v_expires is not null and v_expires < now() then
    execute format(
      'update public.profiles
          set plan = ''free'', plan_expires_at = null, dodo_cancel_scheduled_at = null, plan_period = null
        where %I = $1', v_col
    ) using p_user_id;
    v_plan   := 'free';
    v_expires := null;
    v_cancel := null;
    v_period := null;
  end if;

  return jsonb_build_object(
    'ok', true,
    'balance', public.credit_balance(p_user_id),
    'plan', coalesce(v_plan, 'free'),
    'plan_expires_at', v_expires,
    'cancel_scheduled', v_cancel is not null,
    'plan_period', v_period
  );
end $$;

revoke all on function public.wallet_summary(uuid) from public, anon, authenticated;
grant execute on function public.wallet_summary(uuid) to service_role;


-- ═══════════════════════════════════════════════════════════════════════
-- 迁移后自检（应看到 plan_period 有值）：
--   select email, plan, plan_period, plan_expires_at
--     from public.profiles
--    where email = 'nikluasdame@outlook.com';
--
-- 说明：本迁移【不回填】历史订阅的周期 —— 迁移前就在订阅的老用户 plan_period 为 null。
--   前端把 null 当作「周期未知」，此时【不禁用】按钮（宁可放行也不能把真实用户锁死）；
--   老用户下一次续费/新购时，activate_subscription 会自动把周期写上，之后规则即生效。
-- ═══════════════════════════════════════════════════════════════════════
