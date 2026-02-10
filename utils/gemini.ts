/**
 * 调用 Gemini API
 * 
 * 开发环境：通过 Vite 代理 /api/gemini
 * 生产环境：通过 Vercel Serverless Function /api/gemini
 * 
 * 密钥始终保留在服务端，前端不接触 API Key
 */
/** 与 api/gemini 默认一致；Google AI Studio 可用：gemini-2.0-flash / gemini-1.5-flash 等 */
const MODEL = 'gemini-2.0-flash';

/** 简化产品数据用于 AI 分析，避免过大或复杂结构导致空响应 */
const AI_PICK_KEYS = ['brand', 'model', 'price', 'channel', 'shopName', 'rating', 'monthlySales', 'selling_points', 'sellingPoints', 'pros', 'cons', 'capacity_mah', 'battery_life', 'search_keywords'];

export function simplifyForAI(obj: Record<string, unknown>): Record<string, unknown> {
  const pick = (o: Record<string, unknown> | null, keys: string[]) => {
    if (!o || typeof o !== 'object') return {};
    const r: Record<string, unknown> = {};
    keys.forEach(k => { if (o[k] !== undefined && o[k] !== null) r[k] = o[k]; });
    return r;
  };
  const o = obj as Record<string, unknown>;
  const attrs = obj.attributes && typeof obj.attributes === 'object'
    ? pick(obj.attributes as Record<string, unknown>, AI_PICK_KEYS)
    : {};
  const fromTop = pick(o, AI_PICK_KEYS);
  return { ...attrs, ...fromTop };
}

function extractText(data: any): string {
  const c0 = data?.candidates?.[0];
  let text = c0?.content?.parts?.[0]?.text;
  if (typeof text === 'string' && text.trim()) return text.trim();
  // 兼容不同响应结构
  const part = c0?.content?.parts?.[0];
  if (part?.text) return String(part.text).trim();

  const pf = data?.promptFeedback;
  if (pf?.blockReason) return `提示被拦截: ${pf.blockReason}`;
  if (c0?.finishReason && c0.finishReason !== 'STOP')
    return `模型中断: ${c0.finishReason}，请重试`;
  if (data?.error?.message) throw new Error(data.error.message);
  return '';
}

/**
 * 调用 Gemini API（通过服务端代理）
 * 
 * 前端始终请求 /api/gemini，由服务端代理转发到 Google API
 * - 开发环境：Vite 中间件代理
 * - 生产环境：Vercel Serverless Function
 */
export async function callGemini(prompt: string): Promise<string> {
  const contents = [{ parts: [{ text: prompt }] }];

  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, contents })
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 404) {
    throw new Error('AI 服务不可用，请检查服务端配置');
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || `AI 请求失败: ${res.status}`);
  }

  const text = extractText(data);
  if (!text) {
    throw new Error('AI 返回为空，请稍后重试或简化输入');
  }

  return text;
}
