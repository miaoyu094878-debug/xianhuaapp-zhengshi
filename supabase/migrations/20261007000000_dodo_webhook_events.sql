-- Dodo Payments webhook 幂等表
--
-- Dodo 在重试同一个事件时 webhook-id 保持不变，因此用它做主键即可天然去重：
-- 边缘函数每次收到事件先 INSERT，主键冲突（409）说明是重复投递，直接回 2xx 忽略。
--
-- 建表后无需任何策略：开启 RLS 但不建 policy，意味着 anon / authenticated 全部被拒，
-- 只有 service_role（边缘函数）能读写。

create table if not exists public.dodo_webhook_events (
  webhook_id  text primary key,
  event_type  text,
  received_at timestamptz not null default now()
);

alter table public.dodo_webhook_events enable row level security;

comment on table public.dodo_webhook_events is
  'Dodo Payments webhook 去重表。边缘函数用主键冲突判断重复投递；表缺失时代码降级放行，不阻塞开通。';
