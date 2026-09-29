-- ══════════════════════════════════════════════════════════════════════
-- 兑换码（redeem code）
--
-- 背景：线上函数列表里没有 redeem_code，但边缘函数 handleCreditsAction 会调它
--       （action = 'credits-redeem' / 'redeem'）→ 兑换码功能一用就报错。
--       本迁移补建该函数 + 它依赖的两张表。
--
-- 契约对齐 credits-store.js 的本地实现（redeem()）：
--   入参：p_user_id uuid, p_code text（调用方已 upper/trim）
--   成功：{ok:true, points, balance, plan, plan_expires_at}
--   失败：{ok:false, error: invalid_code | expired_code | code_exhausted | already_redeemed}
-- ══════════════════════════════════════════════════════════════════════

-- ① 兑换码表（管理员在 SQL Editor 里 insert 即可发码）
create table if not exists public.redeem_codes (
  code       text        primary key,               -- 大写码，如 ALYEMA-XXXX-XXXX
  points     integer     not null default 0,        -- 赠送积分
  plan       text,                                  -- 'pro' 则同时开通/续期 Pro
  plan_days  integer     not null default 0,        -- Pro 天数（plan='pro' 时生效）
  max_uses   integer     not null default 1,        -- 全局可用次数
  uses       integer     not null default 0,        -- 已用次数
  expires_at timestamptz,                           -- null = 不过期
  note       text,
  created_at timestamptz not null default now(),
  constraint redeem_codes_points_nonneg check (points >= 0),
  constraint redeem_codes_uses_nonneg   check (uses >= 0),
  constraint redeem_codes_max_uses_pos  check (max_uses >= 1),
  constraint redeem_codes_plan_valid    check (plan is null or plan in ('pro', 'free'))
);

comment on table public.redeem_codes is '兑换码：管理员 insert 发放，用户通过 redeem_code() 兑换';

-- ② 兑换记录表（每用户每码只能兑一次；同时留审计「谁在何时兑了什么」）
create table if not exists public.redeem_redemptions (
  id          bigint      generated always as identity primary key,
  code        text        not null references public.redeem_codes(code) on delete cascade,
  user_id     uuid        not null,
  points      integer     not null default 0,
  plan        text,
  plan_days   integer     not null default 0,
  redeemed_at timestamptz not null default now(),
  unique (code, user_id)
);

comment on table public.redeem_redemptions is '兑换记录：每用户对每张码只能有一条';

-- ③ 兑换函数
create or replace function public.redeem_code(
  p_user_id uuid,
  p_code    text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code    text := upper(btrim(coalesce(p_code, '')));
  v_row     public.redeem_codes%rowtype;
  v_pts     integer;
  v_plan    text;
  v_expires timestamptz;
begin
  if p_user_id is null or v_code = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  -- 同一张码串行处理，避免并发把 max_uses 刷爆
  perform pg_advisory_xact_lock(hashtextextended('redeem:' || v_code, 0));

  select * into v_row from public.redeem_codes where code = v_code;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if v_row.expires_at is not null and v_row.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired_code');
  end if;
  if v_row.uses >= v_row.max_uses then
    return jsonb_build_object('ok', false, 'error', 'code_exhausted');
  end if;
  if exists (select 1 from public.redeem_redemptions r
              where r.code = v_code and r.user_id = p_user_id) then
    return jsonb_build_object('ok', false, 'error', 'already_redeemed');
  end if;

  -- 账户行兜底：前端登录时会建，这里防止极早期兑换时缺失导致后续读不到状态
  insert into public.profiles (id) values (p_user_id)
  on conflict (id) do nothing;

  v_pts := greatest(0, coalesce(v_row.points, 0));

  -- 发积分。注意 credit_ledger 有 amount <> 0 约束，
  -- 所以「只送 Pro、不送积分」的码不写流水，靠 redeem_redemptions 保证幂等。
  if v_pts > 0 then
    insert into public.credit_ledger
      (user_id, action, amount, ledger_type, ref, cost_usd, status, estimated_points)
    values
      (p_user_id, 'redeem', v_pts, 'reward', 'redeem:' || v_code, 0, 'settled', v_pts);
  end if;

  insert into public.redeem_redemptions (code, user_id, points, plan, plan_days)
  values (v_code, p_user_id, v_pts, v_row.plan, v_row.plan_days);

  update public.redeem_codes set uses = uses + 1 where code = v_code;

  -- Pro：从「当前到期时间」往后顺延；已是永久 Pro（expires_at 为空）则保持不动
  if lower(coalesce(v_row.plan, '')) = 'pro' then
    select p.plan, p.plan_expires_at into v_plan, v_expires
      from public.profiles p where p.id = p_user_id;

    if not (lower(coalesce(v_plan, 'free')) = 'pro' and v_expires is null) then
      v_expires := greatest(coalesce(v_expires, now()), now())
                   + make_interval(days => greatest(1, coalesce(v_row.plan_days, 30)));
      update public.profiles
         set plan = 'pro', plan_expires_at = v_expires
       where id = p_user_id;
    end if;
  end if;

  select p.plan, p.plan_expires_at into v_plan, v_expires
    from public.profiles p where p.id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'points', v_pts,
    'balance', public.credit_balance(p_user_id),
    'plan', coalesce(v_plan, 'free'),
    'plan_expires_at', v_expires
  );
end $$;

comment on function public.redeem_code(uuid, text) is '兑换码：发放积分 + 可选开通/续期 Pro；同码同用户只能兑一次';

-- ④ 权限：两张表对客户端完全不可见；函数只给 service_role
alter table public.redeem_codes       enable row level security;
alter table public.redeem_redemptions enable row level security;

revoke all on public.redeem_codes       from public, anon, authenticated;
revoke all on public.redeem_redemptions from public, anon, authenticated;

revoke all on function public.redeem_code(uuid, text) from public, anon, authenticated;
grant execute on function public.redeem_code(uuid, text) to service_role;

-- ══════════════════════════════════════════════════════════════════════
-- 发码示例（管理员在 SQL Editor 执行；不需要跑，仅作参考）
--
--   insert into public.redeem_codes (code, points, note)
--   values ('ALYEMA-WELCOME-100', 100, '首批种子用户');
--
--   insert into public.redeem_codes (code, plan, plan_days, max_uses, expires_at, note)
--   values ('ALYEMA-PRO-30D', 'pro', 30, 50, now() + interval '60 days', 'Pro 体验码 30 天');
--
-- 自查：
--   select code, points, plan, plan_days, uses, max_uses, expires_at from public.redeem_codes;
--   select code, user_id, points, redeemed_at from public.redeem_redemptions order by redeemed_at desc;
-- ══════════════════════════════════════════════════════════════════════