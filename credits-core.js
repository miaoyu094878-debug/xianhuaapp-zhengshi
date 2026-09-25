/* ═══════════════════════════════════════════════════════════════════════
 * Alyema 积分系统 — 定价内核（服务端权威，唯一真源）
 *
 * 利润模型
 *   积分是「用户钱包」的计量单位：1 积分 = POINT_VALUE_USD 美元（默认 $0.01）。
 *   每次 AI 调用按「模型实际消耗的美元成本」扣分，定价公式：
 *
 *       积分 = ⌈ 美元成本 ÷ (1 − TARGET_MARGIN) ÷ POINT_VALUE_USD ⌉
 *
 *   TARGET_MARGIN = 0.85 时，(1 − 0.85) = 0.15，即售价 = 成本的 6.667 倍，
 *   该次调用的毛利率恰为 85%（> 80% 目标）。
 *
 * 想调利润：只改下面这几个常量，前端按钮上的价格会自动跟着变。
 * ═══════════════════════════════════════════════════════════════════════ */

/** 1 积分值多少美元（用户支付口径）。100 积分 = $1 */
export const POINT_VALUE_USD = 0.01;

/** 目标毛利率。0.85 → 按成本的 6.667 倍计价 */
export const TARGET_MARGIN = 0.85;

/** 安全系数：>1 时在目标毛利上再加价，用来抵御模型涨价。1 = 严格按目标毛利 */
export const SAFETY_FACTOR = 1.0;

/** 单次调用最低扣分（避免极便宜调用扣 0 分） */
export const MIN_POINTS = 1;

/** 新用户注册赠送积分（当前按产品决策：不赠送，一律先订阅或充值） */
export const SIGNUP_BONUS_POINTS = 0;

/** Pro 订阅价（解锁肯定句 + 壁纸无限使用；这两个功能模型成本≈0） */
export const SUBSCRIPTION = {
  monthlyUsd: 7.99,
  yearlyUsd: 59.99,
  /** 年付相当于月付的几折（前端展示 "Save X%"） */
  yearlySavePct: Math.round((1 - 59.99 / (7.99 * 12)) * 100),
};

/** 1 / (1 − 目标毛利率) */
export const MARGIN_MULTIPLIER = 1 / (1 - TARGET_MARGIN);

/* ───────────────────────── 模型成本表（美元） ─────────────────────────
 * 数据来源与假设（随官方调价直接改这里）：
 *   story               OpenRouter minimax-m3 / Gemini 2.5 Flash 文本，约 1.5k tokens 输出
 *   ttsPer1kChars       Gemini 2.5 Flash TTS 音频输出，约 $0.02 / 1000 字符
 *   visionPhoto.low     openai/gpt-image-2 low quality，约 1 张
 *   visionVideoPerSec   与前端 VIDEO_PRICING 一致的 hailuo-3-max 每秒单价
 *   optimizeVideoPrompt AI Director 文本改写，单次
 * ──────────────────────────────────────────────────────────────────── */
export const COST_TABLE = {
  story: 0.006,
  ttsPer1kChars: 0.02,
  visionPhoto: { low: 0.015, medium: 0.045, high: 0.17 },
  visionVideoPerSec: { '480p': 0.05, '768p': 0.08 },
  optimizeVideoPrompt: 0.002,
};

/** 积分充值包：价格与积分数基本 1:100（≈$0.01/积分），毛利即 TARGET_MARGIN */
export const PACKAGES = [
  { id: 'starter', name: 'Starter', points: 300, priceUsd: 2.99, badge: '' },
  { id: 'creator', name: 'Creator', points: 1000, priceUsd: 9.99, badge: 'Popular' },
  { id: 'studio', name: 'Studio', points: 2500, priceUsd: 24.99, badge: 'Best value' },
];

/** 需要积分/订阅才可用的功能键 */
export const GATED_ACTIONS = ['story', 'voice', 'vision-photo', 'vision-video', 'optimize-video-prompt'];

/** 成本（美元）→ 积分数 */
export function pointsForCost(costUsd) {
  const usd = Number(costUsd) || 0;
  if (usd <= 0) return 0;
  return Math.max(MIN_POINTS, Math.ceil((usd * MARGIN_MULTIPLIER * SAFETY_FACTOR) / POINT_VALUE_USD));
}

function normalizeQuality(q) {
  const v = String(q || '').toLowerCase();
  if (v === 'high' || v === 'hd' || v === 'pro') return 'high';
  if (v === 'low' || v === 'standard' || v === 'iphone7') return 'low';
  return 'medium';
}

function normalizeResolution(r) {
  return String(r || '480p').toLowerCase().startsWith('7') ? '768p' : '480p';
}

/**
 * 计算一次调用的美元成本。
 * @param {string} action   story | voice | vision-photo | vision-video | optimize-video-prompt ...
 * @param {object} payload  请求体
 * @param {object} result   模型返回结果（用于按真实产出长度计费，如 voice/story）
 */
export function costFor(action, payload = {}, result = {}) {
  const a = String(action || '');
  switch (a) {
    case 'story':
    case 'manifest-story':
      return COST_TABLE.story;

    case 'voice':
    case 'manifest-voice': {
      // 优先按真实合成的文本长度计费（含重试开销）
      const text = String(payload.text || '');
      const chars = Math.max(text.length, Number(payload.chars) || 0, 1);
      return (chars / 1000) * COST_TABLE.ttsPer1kChars;
    }

    case 'vision-photo':
    case 'photo':
      return COST_TABLE.visionPhoto[normalizeQuality(payload.quality)] ?? COST_TABLE.visionPhoto.medium;

    case 'vision-video':
    case 'video': {
      const secs = Math.max(1, Math.min(30, Number(payload.duration) || 5));
      const rate = COST_TABLE.visionVideoPerSec[normalizeResolution(payload.resolution)];
      return secs * rate;
    }

    case 'optimize-video-prompt':
    case 'optimize-prompt':
      return COST_TABLE.optimizeVideoPrompt;

    default:
      return 0; // 查询类 / 状态类 / 内容类调用不消耗模型，不扣分
  }
}

/** 一次调用应扣的积分 */
export function pointsFor(action, payload = {}, result = {}) {
  return pointsForCost(costFor(action, payload, result));
}

/** 给定积分与成本，算这次调用的毛利率 */
export function grossMargin(points, costUsd) {
  const revenue = (Number(points) || 0) * POINT_VALUE_USD;
  if (revenue <= 0) return 0;
  return (revenue - Number(costUsd || 0)) / revenue;
}

/** 暴露给前端的价目表（不含任何密钥，纯粹让按钮显示价格） */
export function clientPriceSheet() {
  return {
    pointValueUsd: POINT_VALUE_USD,
    targetMargin: TARGET_MARGIN,
    minPoints: MIN_POINTS,
    subscription: SUBSCRIPTION,
    packages: PACKAGES,
    costs: {
      story: pointsFor('story'),
      voicePer1kChars: pointsForCost(COST_TABLE.ttsPer1kChars),
      voicePer100Chars: pointsForCost(COST_TABLE.ttsPer1kChars / 10),
      visionPhoto: {
        low: pointsFor('vision-photo', { quality: 'low' }),
        medium: pointsFor('vision-photo', { quality: 'medium' }),
        high: pointsFor('vision-photo', { quality: 'high' }),
      },
      visionVideoPerSec: {
        '480p': pointsFor('vision-video', { duration: 1, resolution: '480p' }),
        '768p': pointsFor('vision-video', { duration: 1, resolution: '768p' }),
      },
      /** 原始每秒美元成本：前端按同一公式算任意时长的积分，避免 ceil 取整后不一致 */
      visionVideoUsdPerSec: Object.assign({}, COST_TABLE.visionVideoPerSec),
      visionVideo: {
        5: pointsFor('vision-video', { duration: 5, resolution: '480p' }),
        10: pointsFor('vision-video', { duration: 10, resolution: '480p' }),
      },
      optimizeVideoPrompt: pointsFor('optimize-video-prompt'),
    },
  };
}

/** 供日志/自检：打印每个操作的定价与毛利 */
export function pricingReport() {
  const rows = [
    ['story', {}, pointsFor('story'), costFor('story')],
    ['voice (1000 chars)', { text: 'x'.repeat(1000) }, pointsFor('voice', { text: 'x'.repeat(1000) }), costFor('voice', { text: 'x'.repeat(1000) })],
    ['vision-photo low', { quality: 'low' }, pointsFor('vision-photo', { quality: 'low' }), costFor('vision-photo', { quality: 'low' })],
    ['vision-photo high', { quality: 'high' }, pointsFor('vision-photo', { quality: 'high' }), costFor('vision-photo', { quality: 'high' })],
    ['vision-video 5s 480p', { duration: 5, resolution: '480p' }, pointsFor('vision-video', { duration: 5, resolution: '480p' }), costFor('vision-video', { duration: 5, resolution: '480p' })],
    ['vision-video 10s 480p', { duration: 10, resolution: '480p' }, pointsFor('vision-video', { duration: 10, resolution: '480p' }), costFor('vision-video', { duration: 10, resolution: '480p' })],
    ['optimize-video-prompt', {}, pointsFor('optimize-video-prompt'), costFor('optimize-video-prompt')],
  ];
  return rows.map(([name, , pts, cost]) => ({
    op: name,
    points: pts,
    userPaysUsd: Number((pts * POINT_VALUE_USD).toFixed(4)),
    modelCostUsd: Number(cost.toFixed(4)),
    grossMargin: Number((grossMargin(pts, cost) * 100).toFixed(1)) + '%',
  }));
}