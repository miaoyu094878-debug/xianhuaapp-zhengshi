-- ═══════════════════════════════════════════════════════════════════════
-- Alyema 积分系统 · Supabase 迁移
--
-- 权威账本放在这里（服务端记账，前端只能通过 Edge Function 读余额/扣费，
-- 无法直接改余额，防止刷分）。所有 RPC 均为 security definer 且已回收
-- anon/authenticated 执行权，只有 service_role（Edge Function / 本地服务端）能调用。
--
-- 执行方式：supabase db push 或直接把本文件贴到 Supabase SQL Editor 执行。
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────── 1. 钱包 ─────────────────────────
create table if not exists public.credit_wallets (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  balance         integer     not null default 0 check (balance >= 0),
  plan            text        not null default 'free' check (plan in ('free', 'pro')),
  plan_expires_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ───────────────────────── 2. 积分流水（每笔扣费/充值可审计） ─────────────────────────
create table if not exists public.credit_ledger (
  id            bigserial primary key,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  delta         integer     not null,                 -- 正=充值，负=消费
  balance_after integer     not null,
  reason        text        not null,                 -- signup_bonus | topup | admin_grant | redeem | spend:story | refund:story ...
  ref           text,                                 -- 幂等键：opId / 兑换码 / 订单号
  cost_usd      numeric(12, 6) not null default 0,    -- 该次调用的模型成本（用于算毛利）
  created_at    timestamptz not null default now()
);

create index if not exists credit_ledger_user_idx    on public.credit_ledger (user_id, created_at desc);
create index if not exists credit_ledger_reason_idx  on public.credit_ledger (reason);

-- 同一用户同一 ref 只记一次账 → 网络重试不会重复扣分；也让赠送/兑换天然幂等
create unique index if not exists credit_ledger_ref_uniq
  on public.credit_ledger (user_id, ref)
  where ref is not null;

-- ───────────────────────── 3. 兑换码（替代支付通道） ─────────────────────────
create table if not exists public.redeem_codes (
  code       text primary key,
  points     integer not null default 0,
  plan       text,                        -- 'pro' 则同时开通订阅；留空只发积分
  plan_days  integer not null default 0,
  max_uses   integer not null default 1,
  uses       integer not null default 0,
  expires_at timestamptz,
  note       text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── 4. RLS：用户只能读自己的账 ─────────────────────────
alter table public.credit_wallets enable row level security;
alter table public.credit_ledger  enable row level security;
alter table public.redeem_codes   enable row level security;

drop policy if exists credit_wallets_select_own on public.credit_wallets;
create policy credit_wallets_select_own on public.credit_wallets
  for select using (auth.uid() = user_id);

drop policy if exists credit_ledger_select_own on public.credit_ledger;
create policy credit_ledger_select_own on public.credit_ledger
  for select using (auth.uid() = user_id);

-- 兑换码表不给任何客户端策略：只有 service_role 能碰

-- ───────────────────────── 5. RPC：确保钱包存在 + 发放注册赠送（幂等） ─────────────────────────
create or replace function public.ensure_wallet(p_user_id uuid, p_bonus integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.credit_wallets;
  v_bonus  integer := greatest(coalesce(p_bonus, 0), 0);
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  insert into public.credit_wallets (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  -- 注册赠送：ref 固定，靠唯一索引保证只发一次
  if v_bonus > 0 then
    insert into public.credit_ledger (user_id, delta, balance_after, reason, ref, cost_usd)
    select p_user_id, v_bonus, v_bonus, 'signup_bonus', 'signup_bonus', 0
    where not exists (
      select 1 from public.credit_ledger where user_id = p_user_id and ref = 'signup_bonus'
    );

    if found then
      update public.credit_wallets
         set balance = balance + v_bonus, updated_at = now()
       where user_id = p_user_id;
    end if;
  end if;

  select * into v_wallet from public.credit_wallets where user_id = p_user_id;

  -- 订阅过期自动降级
  if v_wallet.plan = 'pro' and v_wallet.plan_expires_at is not null and v_wallet.plan_expires_at < now() then
    update public.credit_wallets set plan = 'free', updated_at = now() where user_id = p_user_id
    returning * into v_wallet;
  end if;

  return jsonb_build_object(
    'ok', true,
    'balance', v_wallet.balance,
    'plan', v_wallet.plan,
    'plan_expires_at', v_wallet.plan_expires_at
  );
end $$;

-- ───────────────────────── 6. RPC：原子扣分 ─────────────────────────
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text,
  p_ref     text default null,
  p_cost_usd numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_amount  integer := greatest(coalesce(p_amount, 0), 0);
  v_after   integer;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  if v_amount = 0 then
    select balance into v_balance from public.credit_wallets where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'balance', coalesce(v_balance, 0), 'charged', 0);
  end if;

  -- 幂等：同一 ref 已扣过就直接返回，不重复扣
  if p_ref is not null and exists (
    select 1 from public.credit_ledger where user_id = p_user_id and ref = p_ref
  ) then
    select balance into v_balance from public.credit_wallets where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'balance', coalesce(v_balance, 0), 'charged', 0, 'duplicate', true);
  end if;

  insert into public.credit_wallets (user_id, balance) values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into v_balance from public.credit_wallets where user_id = p_user_id for update;

  if v_balance < v_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient', 'balance', v_balance, 'required', v_amount);
  end if;

  update public.credit_wallets
     set balance = balance - v_amount, updated_at = now()
   where user_id = p_user_id
  returning balance into v_after;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, ref, cost_usd)
  values (p_user_id, -v_amount, v_after, coalesce(p_reason, 'spend'), p_ref, coalesce(p_cost_usd, 0));

  return jsonb_build_object('ok', true, 'balance', v_after, 'charged', v_amount);
end $$;

-- ───────────────────────── 7. RPC：发放积分（充值/管理员/退款） ─────────────────────────
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
  v_after integer;
  v_amount integer := coalesce(p_amount, 0);
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;
  if v_amount = 0 then
    select balance into v_after from public.credit_wallets where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'balance', coalesce(v_after, 0));
  end if;

  if p_ref is not null and exists (
    select 1 from public.credit_ledger where user_id = p_user_id and ref = p_ref
  ) then
    select balance into v_after from public.credit_wallets where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'balance', coalesce(v_after, 0), 'duplicate', true);
  end if;

  insert into public.credit_wallets (user_id, balance) values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update public.credit_wallets
     set balance = balance + v_amount, updated_at = now()
   where user_id = p_user_id
  returning balance into v_after;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, ref, cost_usd)
  values (p_user_id, v_amount, v_after, coalesce(p_reason, 'admin_grant'), p_ref, 0);

  return jsonb_build_object('ok', true, 'balance', v_after);
end $$;

-- ───────────────────────── 8. RPC：订阅（开通/续期 Pro） ─────────────────────────
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
  v_expires timestamptz;
  v_plan    text := case when lower(coalesce(p_plan, 'free')) = 'pro' then 'pro' else 'free' end;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  insert into public.credit_wallets (user_id, balance) values (p_user_id, 0)
  on conflict (user_id) do nothing;

  if v_plan = 'pro' then
    -- 续期：从「当前到期时间」或「现在」往后加，避免叠加时缩短
    select greatest(coalesce(plan_expires_at, now()), now()) + (greatest(coalesce(p_days, 30), 1) || ' days')::interval
      into v_expires
      from public.credit_wallets where user_id = p_user_id;
  else
    v_expires := null;
  end if;

  update public.credit_wallets
     set plan = v_plan, plan_expires_at = v_expires, updated_at = now()
   where user_id = p_user_id;

  return jsonb_build_object('ok', true, 'plan', v_plan, 'plan_expires_at', v_expires);
end $$;

-- ───────────────────────── 9. RPC：兑换码 ─────────────────────────
create or replace function public.redeem_code(p_user_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code    public.redeem_codes;
  v_after   integer;
  v_wallet  public.credit_wallets;
  v_points  integer;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_user');
  end if;

  select * into v_code from public.redeem_codes
   where upper(code) = upper(trim(coalesce(p_code, '')))
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if v_code.expires_at is not null and v_code.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired_code');
  end if;
  if v_code.uses >= v_code.max_uses then
    return jsonb_build_object('ok', false, 'error', 'code_exhausted');
  end if;
  if exists (
    select 1 from public.credit_ledger
     where user_id = p_user_id and ref = 'redeem:' || upper(v_code.code)
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_redeemed');
  end if;

  insert into public.credit_wallets (user_id, balance) values (p_user_id, 0)
  on conflict (user_id) do nothing;

  v_points := greatest(coalesce(v_code.points, 0), 0);

  if v_points > 0 then
    update public.credit_wallets set balance = balance + v_points, updated_at = now()
     where user_id = p_user_id returning balance into v_after;
  else
    select balance into v_after from public.credit_wallets where user_id = p_user_id;
  end if;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, ref, cost_usd)
  values (p_user_id, v_points, v_after, 'redeem', 'redeem:' || upper(v_code.code), 0);

  if v_code.plan = 'pro' then
    update public.credit_wallets
       set plan = 'pro',
           plan_expires_at = greatest(coalesce(plan_expires_at, now()), now())
                             + (greatest(v_code.plan_days, 1) || ' days')::interval,
           updated_at = now()
     where user_id = p_user_id;
  end if;

  update public.redeem_codes set uses = uses + 1 where code = v_code.code;

  select * into v_wallet from public.credit_wallets where user_id = p_user_id;
  return jsonb_build_object(
    'ok', true,
    'points', v_points,
    'balance', v_wallet.balance,
    'plan', v_wallet.plan,
    'plan_expires_at', v_wallet.plan_expires_at
  );
end $$;

-- ───────────────────────── 10. 只允许 service_role 调用 ─────────────────────────
revoke all on function public.ensure_wallet(uuid, integer)                              from public, anon, authenticated;
revoke all on function public.spend_credits(uuid, integer, text, text, numeric)          from public, anon, authenticated;
revoke all on function public.grant_credits(uuid, integer, text, text)                   from public, anon, authenticated;
revoke all on function public.set_plan(uuid, text, integer)                              from public, anon, authenticated;
revoke all on function public.redeem_code(uuid, text)                                    from public, anon, authenticated;

grant execute on function public.ensure_wallet(uuid, integer)                            to service_role;
grant execute on function public.spend_credits(uuid, integer, text, text, numeric)       to service_role;
grant execute on function public.grant_credits(uuid, integer, text, text)                to service_role;
grant execute on function public.set_plan(uuid, text, integer)                           to service_role;
grant execute on function public.redeem_code(uuid, text)                                 to service_role;

-- ───────────────────────── 11. 兑换码使用说明 ─────────────────────────
-- 给用户发纯积分码（例：$9.99 的 1000 积分）：
--   insert into public.redeem_codes (code, points, note) values ('ALYEMA-1000-XXXX', 1000, 'creator pack');
-- 开通 30 天 Pro（解锁「肯定句 + 壁纸」无限使用）：
--   insert into public.redeem_codes (code, points, plan, plan_days, note) values ('ALYEMA-PRO-XXXX', 0, 'pro', 30, '1 month pro');
-- 也可两条一起给（先发积分再开订阅）。