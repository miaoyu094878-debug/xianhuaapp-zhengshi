-- 修复「越权开 Pro」漏洞
--
-- 问题：盘点线上权限发现 anon / authenticated 对 public.profiles 持有【表级】INSERT / UPDATE
--       （Supabase 对新表的默认权限），同时 RLS 策略 "owner all profiles" 是
--       FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id)。
--       两者叠加 => 任何登录用户都能 PATCH 自己那一行，把 plan 改成 'pro'、plan_expires_at 改成 null，
--       免费获得永久 Pro（完全绕过后台/订阅收费逻辑）。
--
-- 关键：单独 REVOKE UPDATE (plan, ...) 这种【列级】回收是无效的。
--       PostgreSQL 中表级授权与列级授权相互独立：只要角色还持有表级 UPDATE，
--       它就仍然能更新该表的所有列，列级 revoke 影响不到它。
--       正确做法：先收回【表级】写权限，再按【列】授予前端真正需要的列。
--
-- 前端实际写入的列（见 app.js: seedProfile / persistProfile）：id, name, area, desire

revoke insert, update on public.profiles from anon, authenticated;

grant insert (id, name, area, desire) on public.profiles to authenticated;
grant update (name, area, desire) on public.profiles to authenticated;

-- 说明：
--   * 不给 anon 授予任何写权限（未登录没有 auth.uid()，本来就写不进）
--   * plan / plan_expires_at 不再有任何客户端写权限，只有 service_role（边缘函数）能写
--   * SQL Editor 走高权限连接，你后台手动改积分/订阅不受影响

-- 验证（预期依次为 false / false / true）：
--   select has_table_privilege ('authenticated', 'public.profiles', 'UPDATE');
--   select has_column_privilege('authenticated', 'public.profiles', 'plan', 'UPDATE');
--   select has_column_privilege('authenticated', 'public.profiles', 'name', 'UPDATE');
--
-- 端到端验证（登录状态下在浏览器控制台执行，应返回 403 permission denied）：
--   fetch('https://bnxjwnvsmiqofbjiknwf.supabase.co/rest/v1/profiles?id=eq.<自己的 uid>', {
--     method: 'PATCH',
--     headers: { apikey: <ANON>, Authorization: 'Bearer ' + <自己的 token>, 'Content-Type': 'application/json' },
--     body: JSON.stringify({ plan: 'pro' })
--   }).then(r => console.log(r.status, r.statusText));