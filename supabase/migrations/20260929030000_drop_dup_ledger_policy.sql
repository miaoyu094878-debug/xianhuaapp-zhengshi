-- 清理 credit_ledger 上重复的 SELECT 策略
--
-- `own credit_ledger read` 是早期手工创建（不在任何迁移文件里），
-- 与迁移 `20260925223000_credit_system_b.sql` 创建的 `credit_ledger_select_own`
-- 条件完全相同（FOR SELECT USING auth.uid() = user_id），属纯冗余。
-- 保留后者（有迁移记录），删除前者。

drop policy if exists "own credit_ledger read" on public.credit_ledger;

-- 验证：应只剩 credit_ledger_select_own 一条
--   select policyname, cmd, qual from pg_policies
--    where schemaname = 'public' and tablename = 'credit_ledger';