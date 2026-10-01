-- 结算改为「按真实成本精确结算」：可下调，也可补扣差额（默认仍是不补扣，保持向后兼容）。
--
-- 背景：语音这类接口响应体里没有成本，只能在调用后用 OpenRouter 的
--       GET /api/v1/generation?id=<X-Generation-Id> 反查 total_cost（美元）。
--       反查是异步的，所以流程是「先预扣（pending）→ 拿到真实成本后结算（settled）」。
--       要做到「最终扣分 = 真实成本换算的积分」，结算必须能双向改：
--         真实 < 预扣 → 退差额
--         真实 > 预扣 → 补扣差额（最多扣到余额为 0，不产生负余额）
--
-- 新增参数 p_allow_topup：
--   false（默认）→ 只退不补，与旧行为一致
--   true         → 双向精确结算
--
-- ⚠️ 因为新签名多了一个参数（即使带默认值），必须先把旧的 3 参数版本删掉，
--    否则 3 参数的调用会产生歧义。

drop function if exists public.settle_credits(uuid, bigint, integer);

create or replace function public.settle_credits(
  p_user_id       uuid,
  p_ledger_id     bigint,
  p_actual_points integer,
  p_allow_topup   boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row      public.credit_ledger;
  v_charged  integer;   -- 预扣积分（正数）
  v_actual   integer;   -- 最终积分
  v_extra    integer;   -- 需要补扣的差额
  v_balance  integer;
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
                              'duplicate', true, 'status', v_row.status,
                              'charged', -v_row.amount);
  end if;

  v_charged := -v_row.amount;                        -- 原 amount 是负数
  v_actual  := greatest(0, coalesce(p_actual_points, 0));

  if p_allow_topup then
    if v_actual > v_charged then
      -- 补扣差额，但最多扣到余额为 0（不允许负余额）
      v_balance := public.credit_balance(p_user_id);
      v_extra   := least(v_actual - v_charged, greatest(0, v_balance));
      v_actual  := v_charged + v_extra;
    end if;
  else
    -- 只退不补：真实更高时按已扣算
    v_actual := least(v_charged, v_actual);
  end if;

  update public.credit_ledger
     set amount = -v_actual,
         status = 'settled'
   where id = v_row.id;

  return jsonb_build_object(
    'ok',       true,
    'balance',  public.credit_balance(p_user_id),
    'charged',  v_actual,            -- 最终实际扣分
    'refunded', v_charged - v_actual -- 正数=退回，负数=补扣
  );
end $$;

revoke all on function public.settle_credits(uuid, bigint, integer, boolean) from public, anon, authenticated;
grant execute on function public.settle_credits(uuid, bigint, integer, boolean) to service_role;