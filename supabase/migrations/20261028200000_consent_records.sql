-- ═══════════════════════════════════════════════════════════════════════
-- 20261028200000_consent_records.sql
-- 结账前的「自动续订明示同意」留痕表。
--
-- 背景
--   加州 ARL（AB 2863）与 EU/UK 消费者法都要求商家能证明用户在扣款前
--   明确同意了自动续订条款。此前前端只做内存判断（两个勾选框），跳转
--   Dodo 后没有任何记录，用户日后主张「我没同意」时无法举证。
--
-- 写入方式
--   前端在发起 create-checkout 前用 authenticated 身份插入一行；
--   表是 append-only：不提供 update / delete 策略，用户无法篡改历史记录。
--   删号时由外键 on delete cascade 随 auth 用户一并清除。
--
-- 幂等：create table / index / policy 均带 if not exists
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.consent_records (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  plan            text not null,                 -- lite / pro
  period          text not null,                 -- monthly / yearly
  amount_usd      numeric(10, 2),                -- 本次授权的金额（USD）
  currency        text not null default 'USD',
  terms_version   text not null,                 -- 条款版本串，便于回溯当时文本
  terms_checked   boolean not null default true, -- ① 同意 Terms / Privacy / Refund
  renew_checked   boolean not null default true, -- ② 单独授权自动续订
  consent_text    text,                          -- 用户实际看到的授权文案快照
  user_agent      text,
  locale          text,
  page            text,
  created_at      timestamptz not null default now()
);

comment on table public.consent_records is
  '结账前自动续订明示同意的留痕（append-only）。加州 ARL / EU 消费者法举证用。';

create index if not exists consent_records_user_idx
  on public.consent_records (user_id, created_at desc);

alter table public.consent_records enable row level security;

-- 只允许本人插入 / 读取；不建 update / delete 策略 → 历史不可篡改
drop policy if exists consent_records_insert_own on public.consent_records;
create policy consent_records_insert_own on public.consent_records
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists consent_records_select_own on public.consent_records;
create policy consent_records_select_own on public.consent_records
  for select to authenticated
  using (auth.uid() = user_id);

-- 收紧表级授权：anon 一律无权；authenticated 仅 insert / select
revoke all on public.consent_records from anon, authenticated;
grant select, insert on public.consent_records to authenticated;
