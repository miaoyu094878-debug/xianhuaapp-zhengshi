-- 修复 profiles_overview 视图
--
-- 问题：视图里的 credit_balance 是 `sum(credit_ledger.amount)` 直接算的，没有排除 status='void'。
--       在「单行账本」下，生成失败会把原扣费行标记为 void（amount 仍为负数），
--       若不排除，作废的消费依然会被算进余额 => 管理看板看到的余额比真实值偏小。
--
-- 顺带：原视图只有 plan_expires_at、没有 plan，看不到谁在订阅。本次在末尾追加 plan 列
--       （CREATE OR REPLACE VIEW 允许在末尾新增列；前 9 列的名称/顺序/类型保持不变）。
--
-- 替换前原定义（2026-09-29 线上实测 pg_get_viewdef）：
--   SELECT p.id, p.name, p.area, p.desire, p.created_at, p.updated_at, p.email, p.plan_expires_at,
--          COALESCE(cl.balance, 0::bigint) AS credit_balance
--     FROM profiles p
--     LEFT JOIN ( SELECT credit_ledger.user_id, sum(credit_ledger.amount) AS balance
--                   FROM credit_ledger GROUP BY credit_ledger.user_id) cl ON cl.user_id = p.id

create or replace view public.profiles_overview as
select
  p.id,
  p.name,
  p.area,
  p.desire,
  p.created_at,
  p.updated_at,
  p.email,
  p.plan_expires_at,
  coalesce(cl.balance, 0::bigint) as credit_balance,
  p.plan
from public.profiles p
left join (
  select l.user_id,
         sum(l.amount) as balance
    from public.credit_ledger l
   where l.status <> 'void'
   group by l.user_id
) cl on cl.user_id = p.id;

-- 验证：视图余额应与 credit_balance() 函数完全一致（函数同样排除 void）
--   select p.email, p.plan, o.credit_balance as view_balance,
--          public.credit_balance(p.id) as fn_balance
--     from public.profiles p
--     join public.profiles_overview o on o.id = p.id;
--
-- 注意：若该视图原先设置过 reloptions（如 security_invoker），CREATE OR REPLACE 后需重新设置。
--   替换前后可对比：select reloptions from pg_class where oid = 'public.profiles_overview'::regclass;