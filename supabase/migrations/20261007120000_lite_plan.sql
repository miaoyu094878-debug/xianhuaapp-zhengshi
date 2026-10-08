-- ═══════════════════════════════════════════════════════════════════════
-- 新增 Lite 档位：plan 由二元（free / pro）扩展为三元（free / lite / pro）
--
-- 档位定义
--   free : 未订阅。可浏览内置肯定语、编辑壁纸；收藏 / 自定义 / 下载 全部拦住
--   lite : $5 / 月，$29 / 年。解锁「收藏 + 自定义肯定语 + 壁纸下载 + Studio」
--          不含任何 AI 能力，因此【不发放积分】
--   pro  : $9.90 / 月，$70 / 年。以上全部 + 全部 AI 能力，随附积分
--          （月付 990 / 年付 10500）
--
-- 为什么必须改这三个函数（不改会出事）
--   1) set_plan       : 原实现 `= 'pro' then 'pro' else 'free'`，传 'lite' 会被
--                       静默降级成 free，Lite 用户付了钱却什么都不解锁
--   2) wallet_summary : 原过期降级只判 `plan = 'pro'`，Lite 到期后
--                       【永远不会自动降级】，等于永久白嫖
--   3) activate_subscription : 原签名只有 (user, period)，无法指定档位
--
-- 幂等：全部 create or replace，可重复执行，不影响已有数据
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────── 1. set_plan：支持 lite ─────────────────
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
    'update public.profiles set plan = $1, plan_expires_at = $2 where %I = $3', v_col
  ) using v_plan, v_expires, p_user_id;

  return jsonb_build_object('ok', true, 'plan', v_plan, 'plan_expires_at', v_expires);
end $$;

-- 权限保持：签名未变，重复授权幂等
revoke all on function public.set_plan(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.set_plan(uuid, text, integer) to service_role;


-- ───────────────── 2. activate_subscription：增加 p_plan ─────────────────
-- 旧签名 (uuid, text) 必须先删除，否则两参数调用会与新函数产生歧义
drop function if exists public.activate_subscription(uuid, text);

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


-- ───────────────── 3. wallet_summary：过期降级覆盖 lite ─────────────────
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

  -- 订阅过期自动降级：lite 与 pro 都要覆盖
  -- （原实现只判 plan = 'pro'，若不改，Lite 到期后永远停在 lite）
  if v_plan in ('pro', 'lite') and v_expires is not null and v_expires < now() then
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

-- 权限保持：签名未变，重复授权幂等
revoke all on function public.wallet_summary(uuid) from public, anon, authenticated;
grant execute on function public.wallet_summary(uuid) to service_role;


-- ═══════════════════════════════════════════════════════════════════════
-- 执行后验证（Supabase SQL Editor）
--
--   select proname, pg_get_function_identity_arguments(oid) as args
--     from pg_proc where proname = 'activate_subscription';
--   -- 预期：只有一行 activate_subscription(p_user_id uuid, p_period text, p_plan text)
--
-- 手动开通示例：
--   -- Lite 月付
--   select public.activate_subscription(
--     (select id from public.profiles where email = 'user@example.com'), 'monthly', 'lite');
--   -- Pro 年付
--   select public.activate_subscription(
--     (select id from public.profiles where email = 'user@example.com'), 'yearly', 'pro');
--
-- 查看档位：
--   select id, email, plan, plan_expires_at from public.profiles order by plan;
-- ═══════════════════════════════════════════════════════════════════════
