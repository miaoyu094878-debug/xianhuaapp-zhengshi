-- 修复「越权开 Pro」漏洞
--
-- 问题：盘点线上权限发现 authenticated 对 public.profiles 有表级 INSERT / UPDATE 权限，
--       同时 RLS 策略 "owner all profiles" 是 FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id)。
--       两者叠加 => 任何登录用户都能 PATCH 自己那一行，把 plan 改成 'pro'、plan_expires_at 改成 null，
--       从而免费获得永久 Pro（完全绕过后台/订阅收费逻辑）。
--
-- 方案：按列收回 plan / plan_expires_at 的写权限。
--       保留表级其它列的写权限（前端 onboarding 需要写 name / area / desire）。
--       service_role 不受影响，边缘函数（xianhuaapp）写这两列照常工作。

revoke insert (plan, plan_expires_at) on public.profiles from anon, authenticated;
revoke update (plan, plan_expires_at) on public.profiles from anon, authenticated;

-- 验证：下面两条应分别返回 false / false
--   select has_column_privilege('anon',          'public.profiles', 'plan', 'UPDATE');
--   select has_column_privilege('authenticated', 'public.profiles', 'plan', 'UPDATE');
--
-- 端到端验证（登录状态下在浏览器控制台执行，应返回 403 permission denied）：
--   fetch('https://bnxjwnvsmiqofbjiknwf.supabase.co/rest/v1/profiles?id=eq.<自己的 uid>', {
--     method: 'PATCH',
--     headers: { apikey: <ANON>, Authorization: 'Bearer ' + <自己的 token>, 'Content-Type': 'application/json' },
--     body: JSON.stringify({ plan: 'pro' })
--   }).then(r => console.log(r.status, r.statusText));