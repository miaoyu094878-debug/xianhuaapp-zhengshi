/* ═══════════════════════════════════════════════════════════════════════
 * Alyema 积分账本 — 服务端权威存储层
 *
 * 两种落库模式（自动选择）：
 *   supabase : 配了 SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → 调 SQL RPC
 *              原子扣分（supabase/migrations/20260925120000_credit_system.sql）
 *   local    : 否则落到 data/credits.json（本地开发/自托管，进程内串行写入）
 *
 * 与积分有关的所有写操作都只在这里发生，前端无法直接改余额。
 * ═══════════════════════════════════════════════════════════════════════ */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SIGNUP_BONUS_POINTS, clientPriceSheet } from './credits-core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://bnxjwnvsmiqofbjiknwf.supabase.co').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueGp3bnZzbWlxb2ZiamlrbndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjE4NDUsImV4cCI6MjEwMjQzNzg0NX0.iggm8MViLJFsYoEFFL4ryoClFqrtB3MS9_15Yk6xi-o';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const LEDGER_MODE = SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'local';
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

/** 注册赠送积分：环境变量可覆盖（设 0 关闭） */
const SIGNUP_BONUS = process.env.SIGNUP_BONUS_POINTS != null
  ? Math.max(0, Number(process.env.SIGNUP_BONUS_POINTS) || 0)
  : SIGNUP_BONUS_POINTS;

/* ───────────────────────── 身份识别 ───────────────────────── */

/** 从 Authorization: Bearer <token> 解出用户；返回 { id, email, source } 或 null */
export async function resolveUser(req) {
  const auth = String(req.headers['authorization'] || '');
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';

  // Supabase 用户 token（非 anon key）→ 向 GoTrue 校验
  if (token && token !== SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
      });
      if (res.ok) {
        const u = await res.json();
        if (u && u.id) return { id: u.id, email: u.email || '', source: 'supabase' };
      }
    } catch (e) { /* 校验失败则退回设备号 */ }
  }

  // 本地开发：用设备号当账本主键
  const device = String(req.headers['x-device-id'] || '').trim();
  if (device) return { id: 'device:' + device.slice(0, 64), email: '', source: 'device' };

  return null;
}

/* ───────────────────────── Supabase 模式 ───────────────────────── */

async function rpc(fn, args) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify(args || {})
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
  if (!res.ok) {
    return { ok: false, error: (data && (data.message || data.hint || data.error)) || ('rpc_failed_' + res.status) };
  }
  return data || { ok: true };
}

function isSupabaseUserId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''));
}

/* ───────────────────────── 本地 JSON 模式 ───────────────────────── */

const DATA_DIR = path.join(__dirname, 'data');
const LEDGER_FILE = path.join(DATA_DIR, 'credits.json');

let _writeChain = Promise.resolve();

function loadLedger() {
  try {
    if (!fs.existsSync(LEDGER_FILE)) return { users: {}, codes: {} };
    const j = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
    return { users: j.users || {}, codes: j.codes || {} };
  } catch (e) {
    return { users: {}, codes: {} };
  }
}

function saveLedger(state) {
  // 串行写，避免并发扣分互相覆盖
  _writeChain = _writeChain.then(async () => {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = LEDGER_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
      fs.renameSync(tmp, LEDGER_FILE);
    } catch (e) {
      console.warn('[credits] 本地账本写入失败:', e.message);
    }
  });
  return _writeChain;
}

function localWallet(state, userId) {
  if (!state.users[userId]) {
    state.users[userId] = { balance: 0, plan: 'free', plan_expires_at: null, ledger: [] };
  }
  const w = state.users[userId];
  if (w.plan === 'pro' && w.plan_expires_at && new Date(w.plan_expires_at) < new Date()) {
    w.plan = 'free';
    w.plan_expires_at = null;
  }
  return w;
}

function localRecord(w, delta, reason, ref, costUsd) {
  w.balance += delta;
  if (w.balance < 0) w.balance = 0;
  w.ledger.push({
    delta, balance_after: w.balance, reason, ref: ref || null,
    cost_usd: Number(costUsd) || 0, created_at: new Date().toISOString()
  });
  if (w.ledger.length > 500) w.ledger = w.ledger.slice(-500);
}

function hasRef(w, ref) {
  return !!ref && w.ledger.some(r => r.ref === ref);
}

/* ───────────────────────── 对外统一 API ───────────────────────── */

/** 读取钱包（首次访问时按需创建并发放注册赠送积分） */
export async function ensureWallet(userId) {
  const bonus = SIGNUP_BONUS;
  if (LEDGER_MODE === 'supabase') {
    if (!isSupabaseUserId(userId)) return { ok: false, error: 'not_a_supabase_user' };
    return await rpc('ensure_wallet', { p_user_id: userId, p_bonus: bonus });
  }
  const state = loadLedger();
  const w = localWallet(state, userId);
  if (bonus > 0 && !hasRef(w, 'signup_bonus')) {
    localRecord(w, bonus, 'signup_bonus', 'signup_bonus', 0);
  }
  await saveLedger(state);
  return { ok: true, balance: w.balance, plan: w.plan, plan_expires_at: w.plan_expires_at };
}

/** 原子扣分。返回 { ok, balance } 或 { ok:false, error:'insufficient', balance, required } */
export async function spend(userId, amount, reason, ref, costUsd) {
  const amt = Math.max(0, Math.round(Number(amount) || 0));
  if (LEDGER_MODE === 'supabase') {
    if (!isSupabaseUserId(userId)) return { ok: false, error: 'not_a_supabase_user' };
    return await rpc('spend_credits', {
      p_user_id: userId, p_amount: amt, p_reason: reason || 'spend',
      p_ref: ref || null, p_cost_usd: Number(costUsd) || 0
    });
  }
  const state = loadLedger();
  const w = localWallet(state, userId);
  if (amt === 0) return { ok: true, balance: w.balance, charged: 0 };
  if (hasRef(w, ref)) return { ok: true, balance: w.balance, charged: 0, duplicate: true };
  if (w.balance < amt) {
    return { ok: false, error: 'insufficient', balance: w.balance, required: amt };
  }
  localRecord(w, -amt, reason || 'spend', ref, costUsd);
  await saveLedger(state);
  return { ok: true, balance: w.balance, charged: amt };
}

/** 发放积分（退款 / 管理员 / 兑换） */
export async function grant(userId, amount, reason, ref) {
  const amt = Math.round(Number(amount) || 0);
  if (LEDGER_MODE === 'supabase') {
    if (!isSupabaseUserId(userId)) return { ok: false, error: 'not_a_supabase_user' };
    return await rpc('grant_credits', { p_user_id: userId, p_amount: amt, p_reason: reason || 'admin_grant', p_ref: ref || null });
  }
  const state = loadLedger();
  const w = localWallet(state, userId);
  if (amt === 0) return { ok: true, balance: w.balance };
  if (hasRef(w, ref)) return { ok: true, balance: w.balance, duplicate: true };
  localRecord(w, amt, reason || 'admin_grant', ref, 0);
  await saveLedger(state);
  return { ok: true, balance: w.balance };
}

/** 开通 / 续期 Pro（解锁「肯定句 + 壁纸」无限使用） */
export async function setPlan(userId, plan, days) {
  if (LEDGER_MODE === 'supabase') {
    if (!isSupabaseUserId(userId)) return { ok: false, error: 'not_a_supabase_user' };
    return await rpc('set_plan', { p_user_id: userId, p_plan: plan, p_days: days });
  }
  const state = loadLedger();
  const w = localWallet(state, userId);
  const isPro = String(plan || '').toLowerCase() === 'pro';
  if (isPro) {
    const base = (w.plan === 'pro' && w.plan_expires_at) ? new Date(w.plan_expires_at) : new Date();
    const from = base > new Date() ? base : new Date();
    from.setDate(from.getDate() + Math.max(1, Number(days) || 30));
    w.plan = 'pro';
    w.plan_expires_at = from.toISOString();
  } else {
    w.plan = 'free';
    w.plan_expires_at = null;
  }
  await saveLedger(state);
  return { ok: true, plan: w.plan, plan_expires_at: w.plan_expires_at };
}

/** 兑换码 */
export async function redeem(userId, code) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return { ok: false, error: 'invalid_code' };

  if (LEDGER_MODE === 'supabase') {
    if (!isSupabaseUserId(userId)) return { ok: false, error: 'not_a_supabase_user' };
    return await rpc('redeem_code', { p_user_id: userId, p_code: clean });
  }

  const state = loadLedger();
  const w = localWallet(state, userId);
  const c = state.codes[clean];
  if (!c) return { ok: false, error: 'invalid_code' };
  if (c.expires_at && new Date(c.expires_at) < new Date()) return { ok: false, error: 'expired_code' };
  if ((c.uses || 0) >= (c.max_uses || 1)) return { ok: false, error: 'code_exhausted' };
  const ref = 'redeem:' + clean;
  if (hasRef(w, ref)) return { ok: false, error: 'already_redeemed' };

  const pts = Math.max(0, Number(c.points) || 0);
  localRecord(w, pts, 'redeem', ref, 0);
  if (String(c.plan || '').toLowerCase() === 'pro') {
    const base = (w.plan === 'pro' && w.plan_expires_at) ? new Date(w.plan_expires_at) : new Date();
    const from = base > new Date() ? base : new Date();
    from.setDate(from.getDate() + Math.max(1, Number(c.plan_days) || 30));
    w.plan = 'pro';
    w.plan_expires_at = from.toISOString();
  }
  c.uses = (c.uses || 0) + 1;
  await saveLedger(state);
  return { ok: true, points: pts, balance: w.balance, plan: w.plan, plan_expires_at: w.plan_expires_at };
}

/** 管理员批量生成兑换码（本地模式才有意义；线上直接 insert 到 redeem_codes 表） */
export async function createCodes(list) {
  if (LEDGER_MODE !== 'local') return { ok: false, error: 'codes_live_in_supabase' };
  const state = loadLedger();
  const created = [];
  for (const c of list || []) {
    const code = String(c.code || '').trim().toUpperCase();
    if (!code) continue;
    state.codes[code] = {
      points: Math.max(0, Number(c.points) || 0),
      plan: c.plan || null,
      plan_days: Math.max(0, Number(c.plan_days) || 0),
      max_uses: Math.max(1, Number(c.max_uses) || 1),
      uses: state.codes[code] ? state.codes[code].uses : 0,
      expires_at: c.expires_at || null,
      note: c.note || ''
    };
    created.push(code);
  }
  await saveLedger(state);
  return { ok: true, created };
}

/** 前端需要的价目表 + 当前钱包状态 */
export function priceSheet() {
  return Object.assign({ signupBonus: SIGNUP_BONUS }, clientPriceSheet());
}

export async function walletSummary(userId) {
  const w = await ensureWallet(userId);
  return {
    ok: !!w.ok,
    balance: w.balance ?? 0,
    plan: w.plan || 'free',
    plan_expires_at: w.plan_expires_at || null,
    mode: LEDGER_MODE
  };
}

export function isAdmin(req) {
  if (!ADMIN_TOKEN) return false;
  const t = String(req.headers['x-admin-token'] || '');
  return t && t === ADMIN_TOKEN;
}