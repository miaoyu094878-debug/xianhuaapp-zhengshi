-- 订阅赠送积分：开通 / 续期 Pro 时按周期发放积分
--   月付 30 天 → 990 积分
--   年付 365 天 → 10500 积分
--
-- 口径与边缘函数 supabase/functions/xianhuaapp/index.ts、
-- 以及根目录 credits-core.js 的 SUBSCRIPTION.monthlyCredits / yearlyCredits 保持一致。
--
-- 背景：产品当前未接入真实支付，Pro 由管理员手动开通。本函数把
--       「设 plan + 延长有效期 + 发积分」合成一步，避免漏发或重复发。
--       接入支付后，由支付回调以 service_role 调用同一个函数即可，前端不需要新接口。
--
-- 用法（Supabase SQL Editor，按邮箱开通年付）：
--   select public.activate_subscription(
--     (select id from public.profiles where email = 'user@example.com'),
--     'yearly'
--   );

create or replace function public.activate_subscription(
  p_user_id uuid,
  p_period  text default 'monthly'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days   integer;
  v_points integer;
  v_expiry date;
  v_ref    text;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if p_period not in ('monthly', 'yearly') then
    return jsonb_build_object('ok', false, 'error', 'bad_period', 'period', p_period);
  end if;

  if p_period = 'monthly' then
    v_days   := 30;
    v_points := 990;
  else
    v_days   := 365;
    v_points := 10500;
  end if;

  -- 幂等键：同一到期日只发一次；续期后到期日变化才会再发一批
  v_expiry := (now() + make_interval(days => v_days))::date;
  v_ref    := 'sub:' || p_period || ':' || to_char(v_expiry, 'YYYY-MM-DD');

  -- 1) 开通 / 续期 Pro（profiles.plan + plan_expires_at）
  perform public.set_plan(p_user_id, 'pro', v_days);

  -- 2) 发放随附积分（grant_credits 内部按 ref 幂等，重复调用不会重复发）
  perform public.grant_credits(p_user_id, v_points, 'subscription_' || p_period, v_ref);

  return jsonb_build_object(
    'ok',         true,
    'period',     p_period,
    'days',       v_days,
    'points',     v_points,
    'expires_at', v_expiry,
    'ref',        v_ref
  );
end $$;

revoke all on function public.activate_subscription(uuid, text) from public, anon, authenticated;
grant execute on function public.activate_subscription(uuid, text) to service_role;