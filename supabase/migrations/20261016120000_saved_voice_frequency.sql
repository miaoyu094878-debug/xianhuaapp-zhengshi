-- ═══════════════════════════════════════════════════════════════════════
-- 20261016120000_saved_voice_frequency.sql
-- 给「My Voices」里保存的语音记住「背景音（疗愈频率）」，供之后重播时选择。
--
-- 背景
--   saved_voices 之前只存内容与 voice / mood，没有记录生成时用的背景音。
--   新增 frequency 列；重播时弹选择框（No Ambient / 528 / 432 / 639 / bowl），
--   用户选定后写回该列，下次重播默认沿用。
--
-- 权限
--   saved_voices 现有 RLS 策略是 ALL / own rows（auth.uid() = user_id），
--   新增列同样受该策略约束 —— 用户只能改自己的行，无需额外授权。
--
-- 幂等：add column if not exists + comment，可重复执行
-- ═══════════════════════════════════════════════════════════════════════

alter table public.saved_voices
  add column if not exists frequency text not null default '';

comment on column public.saved_voices.frequency is
  '背景音/疗愈频率：off（无）| 528 | 432 | 639 | bowl。重播时可改并记住。';
