// ═══════════════════════════════════════════════════════════════════════
// Alyema 积分系统 · Supabase Edge Function 版
//
// 与根目录 credits-core.js / credits-store.js 保持同一套定价与扣费逻辑
// （改价格时两处一起改，或只改本文件里的 COST_TABLE / TARGET_MARGIN 并同步）。
//
// 账本由 SQL RPC 保证原子性，见 supabase/migrations/20260925120000_credit_system.sql
// ═══════════════════════════════════════════════════════════════════════

/** 1 积分值多少美元（用户支付口径）。100 积分 = $1 */
export const POINT_VALUE_USD = 0.01;

/** 目标毛利率。0.85 → 按模型成本的 6.667 倍计价，即该次调用毛利 85% */
export const TARGET_MARGIN = 0.85;

/** 安全系数：>1 时在目标毛利上再加价，用来抵御模型涨价 */
export const SAFETY_FACTOR = 1.0;

export const MIN_POINTS = 1;

/** 新用户注册赠送积分（当前按产品决策：不赠送） */
export const SIGNUP_BONUS_POINTS = 0;

/** Pro 订阅价（解锁肯定句 + 壁纸无限使用；这两个功能模型成本≈0） */
export const SUBSCRIPTION = {
  monthlyUsd: 7.99,
  yearlyUsd: 59.99,
  yearlySavePct: Math.round((1 - 59.99 / (7.99 * 12)) * 100),
};

const MARGIN_MULTIPLIER = 1 / (1 - TARGET_MARGIN);

/**
 * 模型成本表（美元）— 与 credits-core.js 一致
 *   story               OpenRouter minimax-m3 / Gemini 2.5 Flash 文本
 *   ttsPer1kChars       Gemini 2.5 Flash TTS 音频输出，约 $0.02 / 1000 字符
 *   visionPhoto.low     openai/gpt-image-2 low quality
 *   visionVideoPerSec   与前端 VIDEO_PRICING 一致的 hailuo-3-max 每秒单价
 *   optimizeVideoPrompt AI Director 文本改写
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

function normalizeQuality(q: any): 'low' | 'medium' | 'high' {
  const v = String(q || '').toLowerCase();
  if (v === 'high' || v === 'hd' || v === 'pro') return 'high';
  if (v === 'low' || v === 'standard' || v === 'iphone7') return 'low';
  return 'medium';
}

function normalizeResolution(r: any): '480p' | '768p' {
  return String(r || '480p').toLowerCase().startsWith('7') ? '768p' : '480p';
}

/** 成本（美元）→ 积分数 */
export function pointsForCost(costUsd: number): number {
  const usd = Number(costUsd) || 0;
  if (usd <= 0) return 0;
  return Math.max(MIN_POINTS, Math.ceil((usd * MARGIN_MULTIPLIER * SAFETY_FACTOR) / POINT_VALUE_USD));
}

/** 一次调用的美元成本 */
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

/** 暴露给前端的价目表 */
export function priceSheet() {
  return {
    pointValueUsd: POINT_VALUE_USD,
    targetMargin: TARGET_MARGIN,
    minPoints: MIN_POINTS,
    signupBonus: SIGNUP_BONUS_POINTS,
    subscription: SUBSCRIPTION,
    packages: PACKAGES,
    costs: {
      story: pointsForCost(costFor('story')),
      voicePer1kChars: pointsForCost(COST_TABLE.ttsPer1kChars),
      voicePer100Chars: pointsForCost(COST_TABLE.ttsPer1kChars / 10),
      visionPhoto: {
        low: pointsForCost(costFor('vision-photo', { quality: 'low' })),
        medium: pointsForCost(costFor('vision-photo', { quality: 'medium' })),
        high: pointsForCost(costFor('vision-photo', { quality: 'high' })),
      },
      visionVideoPerSec: {
        '480p': pointsForCost(costFor('vision-video', { duration: 1, resolution: '480p' })),
        '768p': pointsForCost(costFor('vision-video', { duration: 1, resolution: '768p' })),
      },
      /** 原始每秒美元成本：前端按同一公式算任意时长的积分，避免 ceil 取整后不一致 */
      visionVideoUsdPerSec: { ...COST_TABLE.visionVideoPerSec },
      visionVideo: {
        5: pointsForCost(costFor('vision-video', { duration: 5, resolution: '480p' })),
        10: pointsForCost(costFor('vision-video', { duration: 10, resolution: '480p' })),
      },
      optimizeVideoPrompt: pointsForCost(costFor('optimize-video-prompt')),
    },
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

export async function walletSummary(userId: string) {
  const w = await rpc('ensure_wallet', { p_user_id: userId, p_bonus: SIGNUP_BONUS_POINTS });
  return {
    ok: !!w.ok,
    balance: w.balance ?? 0,
    plan: w.plan || 'free',
    plan_expires_at: w.plan_expires_at || null,
  };
}

export function spend(userId: string, amount: number, reason: string, ref: string | null, costUsd: number) {
  return rpc('spend_credits', {
    p_user_id: userId, p_amount: Math.max(0, Math.round(amount || 0)),
    p_reason: reason, p_ref: ref, p_cost_usd: costUsd || 0,
  });
}

export function grant(userId: string, amount: number, reason: string, ref: string | null) {
  return rpc('grant_credits', {
    p_user_id: userId, p_amount: Math.round(amount || 0), p_reason: reason, p_ref: ref,
  });
}

export function redeem(userId: string, code: string) {
  return rpc('redeem_code', { p_user_id: userId, p_code: String(code || '').trim().toUpperCase() });
}

const json = (payload: unknown, status = 200, cors: Record<string, string> = {}) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

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

  const costUsd = costFor(action, body);
  const points = pointsForCost(costUsd);
  const opId = String(body?.opId || body?.op_id || '').slice(0, 80);
  const spendRef = opId ? `${user.id}:${action}:${opId}` : null;

  let charged = 0;
  if (points > 0) {
    const r: any = await spend(user.id, points, 'spend:' + action, spendRef, costUsd);
    if (!r.ok) {
      if (r.error === 'insufficient') {
        return json({
          error: 'insufficient_credits',
          message: `Not enough credits: ${points} needed, ${r.balance ?? 0} available.`,
          required: points,
          balance: r.balance ?? 0,
          prices: priceSheet(),
        }, 402, cors);
      }
      return json({ error: r.error || 'credit_error' }, 400, cors);
    }
    charged = r.charged || 0;
  }

  const res = await handler();

  if (res.status >= 400) {
    if (charged > 0) {
      await grant(user.id, charged, 'refund:' + action, opId ? `refund:${user.id}:${action}:${opId}` : null);
      console.warn(`[credits] ${action} 失败，已退回 ${charged} 积分给 ${user.id}`);
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