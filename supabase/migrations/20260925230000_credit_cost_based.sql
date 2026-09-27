-- ═══════════════════════════════════════════════════════════════════════
-- Alyema 积分系统 · 成本驱动定价 + LLM 用后结算
--
-- 上一版（20260925223000_credit_system_b.sql）是「每个动作固定积分」，
-- 由 credit_costs 表决定扣多少。问题：同一动作的成本随输入变化
-- （图片参考图张数 / 视频时长分辨率 / 语音字数），固定价必然在高成本档亏。
--
-- 本迁移做两件事（不新建表，保留 credit_costs 作兜底）：
--
--   1. consume_credits 增加 p_points 参数
--      · 传了 p_points  → 按它扣（成本驱动：积分由服务端按成本算好后传入）
--      · 没传           → 回退读 credit_costs（旧口径，保持向后兼容）
--
--   2. 新增 settle_credits —— LLM「用后结算」
--      LLM 的真实成本由 token 用量决定，调用前算不准，所以调用后按真实
--      成本下调这一笔扣费（只退不补，绝不二次扣款）。
--
-- 全程幂等，可重复执行。执行方式：贴进 Supabase SQL Editor 或 supabase db push。
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────── 1. 扣费：支持显式积分（成本驱动） ─────────────────────────
-- 函数签名变了，必须先 drop（create or replace 改不了参数列表）
drop function if exists public.consume_credits(uuid, text, text, numeric);

create or replace function public.consume_credits(
  p_user_id  uuid,
  p_action   text,
  p_ref      text default null,
  p_cost_usd numeric default 0,
  p_points   integer default null
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

  -- 定价：优先用服务端按成本算好的积分；没传才回退旧价目表
  if p_points is not null then
    v_cost := greatest(0, p_points);
  else
    select cost into v_cost from public.credit_costs where action = p_action;
    if v_cost is null then
      return jsonb_build_object('ok', false, 'error', 'cost_not_defined', 'action', p_action);
    end if;
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

-- ───────────────────────── 2. 结算：按真实用量下调（只退不补） ─────────────────────────
-- 用于 LLM：调用后拿到真实成本 → 换算成真实积分 → 把多扣的部分退回。
-- 若真实积分 >= 已扣积分，不做任何事（绝不二次扣款）。
-- 幂等：结算流水 ref = settle:<原流水 id>，唯一索引保证只结算一次。
create or replace function public.settle_credits(
  p_user_id       uuid,
  p_ledger_id     bigint,
  p_actual_points integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     public.credit_ledger;
  v_ref     text;
  v_refund  integer;
  v_balance integer;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  select * into v_row from public.credit_ledger
   where id = p_ledger_id and user_id = p_user_id and ledger_type = 'consume';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'ledger_not_settleable');
  end if;

  -- 原扣费 amount 是负数，取绝对值即「已扣积分」
  v_refund := (-v_row.amount) - greatest(0, coalesce(p_actual_points, 0));

  if v_refund <= 0 then
    -- 实际成本不低于预估 → 不补扣，直接视为已结清
    return jsonb_build_object('ok', true, 'balance', public.credit_balance(p_user_id),
                              'settled', 0, 'no_adjust', true);
  end if;

  v_ref := 'settle:' || v_row.id;
  if exists (select 1 from public.credit_ledger where user_id = p_user_id and ref = v_ref) then
    return jsonb_build_object('ok', true, 'balance', public.credit_balance(p_user_id), 'duplicate', true);
  end if;

  insert into public.credit_ledger (user_id, action, amount, ledger_type, ref, cost_usd)
  values (p_user_id, v_row.action, v_refund, 'refund', v_ref, 0);

  v_balance := public.credit_balance(p_user_id);
  return jsonb_build_object('ok', true, 'balance', v_balance, 'settled', v_refund);
end $$;

-- ───────────────────────── 3. 权限：只给 service_role ─────────────────────────
revoke all on function public.consume_credits(uuid, text, text, numeric, integer) from public, anon, authenticated;
revoke all on function public.settle_credits(uuid, bigint, integer)                  from public, anon, authenticated;

grant execute on function public.consume_credits(uuid, text, text, numeric, integer) to service_role;
grant execute on function public.settle_credits(uuid, bigint, integer)               to service_role;

-- ───────────────────────── 4. 运维备忘 ─────────────────────────
-- 定价口径：积分 = ceil(成本 ÷ (1 - 目标毛利) ÷ 0.01)，最小 1 分
--   · 目标毛利 0.85 → 系数 ≈ 666.67（即 1 分 ≈ $0.0015 成本）
--   · 成本表与毛利系数在代码里：supabase/functions/xianhuaapp/index.ts 的 COST_TABLE / POINT_MARGIN
--   · credit_costs 表现在只是「没传 p_points 时的兜底」，不再参与实际调价
-- 结算：LLM 调用成功后自动下调，流水里会多一条 ledger_type='refund'、ref='settle:<id>' 的记录
-- 查某人最近流水（含结算）：
--   select id, action, amount, ledger_type, ref, cost_usd, created_at
--     from public.credit_ledger where user_id = '<user-uuid>' order by id desc limit 20;