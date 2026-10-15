-- ═══════════════════════════════════════════════════════════════════════
-- 20261015120000_saved_voice_favorite.sql
-- 给「My Voices」里保存的语音加一个「收藏」标记，用于在列表中区分。
--
-- 背景
--   saved_voices 目前只有内容字段（title / story / voice / created_at ...），
--   无法区分「常听/喜欢」的语音与其余语音。新增 favorited 布尔列，
--   前端列表把收藏项排到最前并显示实心 ♥。
--
-- 权限
--   saved_voices 现有 RLS 策略是 ALL / own rows（auth.uid() = user_id），
--   新增列同样受该策略约束 —— 用户只能改自己的行，无需额外授权。
--
-- 幂等：add column if not exists + comment，可重复执行
-- ═══════════════════════════════════════════════════════════════════════

alter table public.saved_voices
  add column if not exists favorited boolean not null default false;

comment on column public.saved_voices.favorited is
  '是否收藏（喜欢）。true 时前端把该语音排在列表最前并显示实心 ♥。';

-- 列表查询按收藏优先排序时可命中索引；数据量小，普通索引即可。
create index if not exists saved_voices_user_fav_idx
  on public.saved_voices (user_id, favorited, created_at desc);
