-- ═══════════════════════════════════════════════════════════════════════
-- Alyema 积分系统 · 单行账本（把「预扣 + 退差价」合并成同一条记录）
--
-- 背景：上一版「预扣 → 再插一条 refund 行」会导致一次生成产生 2 条流水
--       （consume + refund），后台看起来冗余、不好核对。
--
-- 本迁移把「退差价 / 退款」从「INSERT 新行」改成「UPDATE 原行」，于是：
--       一次生成 = 永远只有 1 条 credit_ledger 记录
--
-- 只动 1 张表：credit_ledger（新增 status / estimated_points 两列）
--
--   amount            这条流水「当前的有效金额」，结算后被改成真实积分
--   estimated_points  预扣时的预估积分，保留下来方便审计「估了多少 / 实际多少」
--   status            pending = 已预扣、尚未结算（可能是拿不到真实成本）
--                     settled = 已按真实成本最终确定
--                     void    = 生成失败，已作废（不计入余额）
--
-- 余额口径不变：credit_balance = sum(amount)，但排除 status = 'void' 的行。
-- 预扣保护（余额不足直接拒绝）全部保留，不做「事后才扣」。
--
-- 全程幂等，可重复执行。
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────── 1. 表：新增两列 ─────────────────────────
alter table public.credit_ledger add column if not exists status           text    not null default 'settled';
alter table public.credit_ledger add column if not exists estimated_points integer;

alter table public.credit_ledger drop constraint if exists credit_ledger_status_valid;
alter table public.credit_ledger add  constraint credit_ledger_status_valid
  check (status in ('pending', 'settled', 'void'));

-- 历史行沿用默认值 'settled'（含老的 refund 行）→ 余额完全不受影响
-- 说明：老的 consume + refund 两条记录不会被合并，只对「新产生的流水」生效

-- ───────────────────────── 2. 余额：排除作废行 ─────────────────────────
create or replace function public.credit_balance(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::integer
    from public.credit_ledger
   where user_id = p_user_id
     and status <> 'void';
$$;

-- ───────────────────────── 3. 扣费：预扣记为 pending ─────────────────────────
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

  -- 预扣：1 条记录，status = pending，等真实成本回来后再 UPDATE 这一条
  insert into public.credit_ledger
         (user_id, action, amount, ledger_type, ref, cost_usd, status, estimated_points)
  values (p_user_id, p_action, -v_cost, 'consume', p_ref, coalesce(p_cost_usd, 0), 'pending', v_cost)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'balance', v_balance - v_cost,
                            'ledger_id', v_id, 'charged', v_cost);
exception
  when unique_violation then
    -- 并发下同一 ref 被另一个请求抢先写入 → 视为重复，不重复扣
    return jsonb_build_object('ok', true, 'balance', public.credit_balance(p_user_id),
                              'charged', 0, 'duplicate', true);
end $$;

-- ───────────────────────── 4. 结算：UPDATE 原行（只退不补） ─────────────────────────
-- LLM / 生图调用后拿到真实成本 → 换算成真实积分 → 把这一条的 amount 改成真实值。
-- 真实积分 >= 已扣积分时，按已扣算（绝不二次扣款）。
-- 幂等：靠原行的 status（已 settled / void 就不再处理）。
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
  v_actual  integer;
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

  -- 已结算 / 已作废 → 幂等返回，不重复处理
  if v_row.status <> 'pending' then
    return jsonb_build_object('ok', true, 'balance', public.credit_balance(p_user_id),
                              'duplicate', true, 'status', v_row.status);
  end if;

  -- 原 amount 是负数，取绝对值即「已扣积分」；真实积分更高时按已扣算（不补扣）
  v_actual := least(-v_row.amount, greatest(0, coalesce(p_actual_points, 0)));

  update public.credit_ledger
     set amount = -v_actual,
         status = 'settled'
   where id = v_row.id;

  v_balance := public.credit_balance(p_user_id);
  return jsonb_build_object('ok', true, 'balance', v_balance,
                            'settled', (-v_row.amount) - v_actual);
end $$;

-- ───────────────────────── 5. 退款：把原行标为 void ─────────────────────────
-- 生成失败时调用。不再插正数行，直接把原扣费行作废（不计入余额）。
create or replace function public.refund_credits(p_user_id uuid, p_ledger_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row      public.credit_ledger;
  v_refunded integer;
  v_balance  integer;
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

  -- 已作废 → 幂等返回
  if v_row.status = 'void' then
    return jsonb_build_object('ok', true, 'balance', public.credit_balance(p_user_id), 'duplicate', true);
  end if;

  v_refunded := -v_row.amount;

  update public.credit_ledger
     set status = 'void'
   where id = v_row.id;

  v_balance := public.credit_balance(p_user_id);
  return jsonb_build_object('ok', true, 'balance', v_balance, 'refunded', v_refunded);
end $$;

-- ───────────────────────── 6. 权限：只给 service_role ─────────────────────────
revoke all on function public.consume_credits(uuid, text, text, numeric, integer) from public, anon, authenticated;
revoke all on function public.settle_credits(uuid, bigint, integer)               from public, anon, authenticated;
revoke all on function public.refund_credits(uuid, bigint)                        from public, anon, authenticated;
revoke all on function public.credit_balance(uuid)                                from public, anon, authenticated;

grant execute on function public.consume_credits(uuid, text, text, numeric, integer) to service_role;
grant execute on function public.settle_credits(uuid, bigint, integer)               to service_role;
grant execute on function public.refund_credits(uuid, bigint)                        to service_role;
grant execute on function public.credit_balance(uuid)                                to service_role;

-- ───────────────────────── 7. 运维备忘 ─────────────────────────
-- 一次生成在 credit_ledger 里只有 1 条记录：
--   status='pending'  → 已按预估预扣，尚未拿到真实成本（语音/视频可能长期这样）
--   status='settled'  → 已按真实成本最终确定（story / 生图）
--   status='void'     → 生成失败，已作废，不计入余额
-- 查某人最近流水：
--   select id, action, amount, estimated_points, cost_usd, status, ref, created_at
--     from public.credit_ledger where user_id = '<user-uuid>' order by id desc limit 20;
-- ⚠️ 若你自建的 profiles_overview 视图是直接 sum(credit_ledger.amount)，
--    需要补上 and status <> 'void'，或直接改成 credit_balance(id)。