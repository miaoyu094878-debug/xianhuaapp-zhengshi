// ═══════════════════════════════════════════════════════════════════════
// Alyema 积分系统 · Supabase Edge Function 版
//
// 与根目录 credits-core.js / credits-store.js 保持同一套定价与扣费逻辑：
//   · 定价口径 = 每个动作固定积分，权威来源是 public.credit_costs 表
//   · 幂等 + 并发安全 + 成本审计 + 订阅（Pro）全部走 SQL RPC
// 迁移文件：supabase/migrations/20260925223000_credit_system_b.sql
// ═══════════════════════════════════════════════════════════════════════

/** 1 积分值多少美元（用户支付口径）。100 积分 = $1 */
export const POINT_VALUE_USD = 0.01;

/** 目标毛利率（用于反算 credit_costs 该填多少，运行时扣费不再用公式） */
export const TARGET_MARGIN = 0.85;

export const MIN_POINTS = 1;

/** 新用户注册赠送积分（当前按产品决策：不赠送） */
export const SIGNUP_BONUS_POINTS = 0;

/** Pro 订阅价（解锁肯定句 + 壁纸无限使用；这两个功能模型成本≈0） */
export const SUBSCRIPTION = {
  monthlyUsd: 7.99,
  yearlyUsd: 59.99,
  yearlySavePct: Math.round((1 - 59.99 / (7.99 * 12)) * 100),
};

/**
 * 模型成本表（美元）— 与 credits-core.js 一致，仅用于成本审计。
 * 实际扣费不看它，而看 public.credit_costs 表里的固定积分。
 */
export const COST_TABLE = {
  story: 0.006,
  ttsPer1kChars: 0.02,
  visionPhoto: { low: 0.015, medium: 0.045, high: 0.17 },
  visionVideoPerSec: { '480p': 0.05, '768p': 0.08 },
  optimizeVideoPrompt: 0.002,
};

/** 积分充值包 */
export const PACKAGES = [
  { id: 'starter', name: 'Starter', points: 300, priceUsd: 2.99, badge: '' },
  { id: 'creator', name: 'Creator', points: 1000, priceUsd: 9.99, badge: 'Popular' },
  { id: 'studio', name: 'Studio', points: 2500, priceUsd: 24.99, badge: 'Best value' },
];

/** 实际扣费价目（权威 = 数据库 credit_costs；这里是前端/兜底镜像） */
export const CREDIT_COSTS: Record<string, number> = {
  story: 5,
  voice: 5,
  'vision-photo': 20,
  'vision-video': 50,
  'optimize-video-prompt': 0,
};

/** Pro 订阅后不限量、不计费的动作（壁纸在客户端本地生成，不经过服务端） */
export const PRO_UNLIMITED_ACTIONS = ['story'];

function normalizeQuality(q: any): 'low' | 'medium' | 'high' {
  const v = String(q || '').toLowerCase();
  if (v === 'high' || v === 'hd' || v === 'pro') return 'high';
  if (v === 'low' || v === 'standard' || v === 'iphone7') return 'low';
  return 'medium';
}

function normalizeResolution(r: any): '480p' | '768p' {
  return String(r || '480p').toLowerCase().startsWith('7') ? '768p' : '480p';
}

/** 一次调用的美元成本（仅审计用） */
export function costFor(action: string, body: any = {}): number {
  switch (String(action || '')) {
    case 'story':
    case 'manifest-story':
      return COST_TABLE.story;

    case 'voice':
    case 'manifest-voice': {
      const text = String(body.text || '');
      const chars = Math.max(text.length, Number(body.chars) || 0, 1);
      return (chars / 1000) * COST_TABLE.ttsPer1kChars;
    }

    case 'vision-photo':
    case 'photo':
      return COST_TABLE.visionPhoto[normalizeQuality(body.quality)] ?? COST_TABLE.visionPhoto.medium;

    case 'vision-video':
    case 'video': {
      const secs = Math.max(1, Math.min(30, Number(body.duration) || 5));
      return secs * COST_TABLE.visionVideoPerSec[normalizeResolution(body.resolution)];
    }

    case 'optimize-video-prompt':
    case 'optimize-prompt':
      return COST_TABLE.optimizeVideoPrompt;

    default:
      return 0;
  }
}

/** 暴露给前端的价目表（与 credit_costs 一一对应） */
export function priceSheet() {
  return {
    pointValueUsd: POINT_VALUE_USD,
    minPoints: MIN_POINTS,
    signupBonus: SIGNUP_BONUS_POINTS,
    subscription: SUBSCRIPTION,
    packages: PACKAGES,
    costs: { ...CREDIT_COSTS },
  };
}

/* ───────────────────────── 身份 & 账本 ───────────────────────── */

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

export interface WalletUser { id: string; email?: string }

/** 校验调用方身份：必须带真实用户 JWT（anon key 不算登录） */
export async function resolveUser(req: Request): Promise<WalletUser | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token || token === ANON_KEY || !SUPABASE_URL) return null;
  try {
    const res = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token },
    });
    if (!res.ok) return null;
    const u = await res.json();
    return u && u.id ? { id: u.id, email: u.email } : null;
  } catch (_e) {
    return null;
  }
}

async function rpc(fn: string, args: Record<string, unknown>) {
  if (!SERVICE_KEY) return { ok: false, error: 'service_role_key_missing' };
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY,
    },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    return { ok: false, error: (data && (data.message || data.hint || data.error)) || ('rpc_failed_' + res.status) };
  }
  return data || { ok: true };
}

/** 读取账户：余额 + 订阅状态（过期自动降级在 RPC 里处理） */
export async function walletSummary(userId: string) {
  const w: any = await rpc('wallet_summary', { p_user_id: userId });
  return {
    ok: !!w.ok,
    balance: w.balance ?? 0,
    plan: w.plan || 'free',
    plan_expires_at: w.plan_expires_at || null,
  };
}

/**
 * 扣分（原子，幂等）。传动作名，由数据库 credit_costs 决定扣多少。
 * 返回 { ok, balance, charged, ledger_id, duplicate, free } 或 { ok:false, error }
 */
export function spend(userId: string, action: string, ref: string | null, costUsd = 0) {
  return rpc('consume_credits', {
    p_user_id: userId, p_action: action, p_ref: ref || null, p_cost_usd: costUsd || 0,
  });
}

/** 退款：按原扣费流水退回，同一笔只能退一次 */
export function refund(userId: string, ledgerId: number) {
  return rpc('refund_credits', { p_user_id: userId, p_ledger_id: Number(ledgerId) || 0 });
}

export function grant(userId: string, amount: number, reason: string, ref: string | null) {
  return rpc('grant_credits', {
    p_user_id: userId, p_amount: Math.round(amount || 0), p_reason: reason, p_ref: ref,
  });
}

/** 开通 / 续期 Pro（写 profiles.plan / plan_expires_at） */
export function setPlan(userId: string, plan: string, days = 30) {
  return rpc('set_plan', { p_user_id: userId, p_plan: plan, p_days: days });
}

export function redeem(userId: string, code: string) {
  return rpc('redeem_code', { p_user_id: userId, p_code: String(code || '').trim().toUpperCase() });
}

const json = (payload: unknown, status = 200, cors: Record<string, string> = {}) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

function isProActive(w: { plan?: string; plan_expires_at?: string | null }): boolean {
  if (String(w.plan || '').toLowerCase() !== 'pro') return false;
  if (!w.plan_expires_at) return true;
  return new Date(w.plan_expires_at) > new Date();
}

/**
 * 扣费包装器：调用前扣分 → 执行 → 失败自动退款 → 成功把余额写回 JSON。
 * 与本地 server.js 的 chargeAndRun 行为一致。
 */
export async function withCredits(
  req: Request,
  body: any,
  action: string,
  cors: Record<string, string>,
  handler: () => Promise<Response>,
): Promise<Response> {
  const user = await resolveUser(req);
  if (!user) {
    return json({ error: 'auth_required', message: 'Please sign in before using AI features.', prices: priceSheet() }, 401, cors);
  }

  const costUsd = costFor(action, body); // 仅审计
  const opId = String(body?.opId || body?.op_id || '').slice(0, 80);
  const spendRef = opId ? `${user.id}:${action}:${opId}` : null;

  // Pro 订阅：肯定句不限量、不扣分
  const wallet = await walletSummary(user.id);
  const freeForPro = isProActive(wallet) && PRO_UNLIMITED_ACTIONS.includes(action);

  let charged = 0;
  let ledgerId: number | null = null;
  if (!freeForPro) {
    const r: any = await spend(user.id, action, spendRef, costUsd);
    if (!r.ok) {
      if (r.error === 'insufficient') {
        return json({
          error: 'insufficient_credits',
          message: `Not enough credits: ${r.required ?? 0} needed, ${r.balance ?? 0} available.`,
          required: r.required ?? 0,
          balance: r.balance ?? 0,
          prices: priceSheet(),
        }, 402, cors);
      }
      return json({ error: r.error || 'credit_error' }, 400, cors);
    }
    charged = r.charged || 0;
    ledgerId = r.ledger_id ?? null;
  }

  const res = await handler();

  if (res.status >= 400) {
    if (charged > 0 && ledgerId != null) {
      const rr: any = await refund(user.id, ledgerId);
      if (rr && rr.ok) console.warn(`[credits] ${action} 失败，已退回 ${charged} 积分给 ${user.id}`);
    }
    return res;
  }

  // 成功：把「本次扣了多少 / 剩余多少」写进 JSON 响应，前端无需额外查询
  const ctype = res.headers.get('content-type') || '';
  if (!ctype.includes('application/json')) return res;
  try {
    const payload = await res.json();
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const w = await walletSummary(user.id);
      payload.credits = { charged, balance: w.balance };
    }
    return json(payload, res.status, cors);
  } catch (_e) {
    return res;
  }
}

/** credits / credits-redeem 两个账户类 action 的处理 */
export async function handleCreditsAction(action: string, req: Request, body: any, cors: Record<string, string>) {
  const user = await resolveUser(req);

  if (!user) {
    return json({ ok: true, signedIn: false, balance: 0, plan: 'free', plan_expires_at: null, prices: priceSheet() }, 200, cors);
  }

  if (action === 'credits-redeem' || action === 'redeem') {
    const r: any = await redeem(user.id, body?.code);
    if (!r.ok) return json({ error: r.error, message: r.error }, 400, cors);
    const w = await walletSummary(user.id);
    return json({ ok: true, signedIn: true, redeemed: true, grantedPoints: r.points || 0, ...w, prices: priceSheet() }, 200, cors);
  }

  const w = await walletSummary(user.id);
  return json({ ok: true, signedIn: true, ...w, prices: priceSheet() }, 200, cors);
}