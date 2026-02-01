/**
 * 调用 Gemini API
 * 开发环境：通过 Vite 代理 /api/gemini，密钥保留在服务端
 * 生产环境：直接调用（需在部署平台配置 GEMINI_API_KEY）
 */
const MODEL = 'gemma-3-4b-it';

/** 简化产品数据用于 AI 分析，避免过大或复杂结构导致空响应 */
export function simplifyForAI(obj: Record<string, unknown>): Record<string, unknown> {
  const pick = (o: Record<string, unknown>, keys: string[]) => {
    const r: Record<string, unknown> = {};
    keys.forEach(k => { if (o[k] !== undefined && o[k] !== null) r[k] = o[k]; });
    return r;
  };
  const core = pick(obj as Record<string, unknown>, ['brand', 'model', 'price', 'channel', 'shopName', 'rating', 'monthlySales']);
  const attrs = obj.attributes && typeof obj.attributes === 'object'
    ? pick(obj.attributes as Record<string, unknown>, ['selling_points', 'sellingPoints', 'pros', 'cons', 'capacity_mah', 'battery_life'])
    : {};
  return { ...core, ...attrs };
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

export async function callGemini(prompt: string): Promise<string> {
  const contents = [{ parts: [{ text: prompt }] }];

  if (import.meta.env.DEV) {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, contents })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404)
      throw new Error('请在 .env 中配置 GEMINI_API_KEY 并重启开发服务器');
    if (!res.ok) throw new Error(data?.error?.message || `状态码: ${res.status}`);
    const text = extractText(data);
    if (!text) throw new Error('AI 返回为空，请稍后重试或简化输入');
    return text;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('请在环境变量中配置 GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048, topP: 0.95 }
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `状态码: ${res.status}`);
  const text = extractText(data);
  if (!text) throw new Error('AI 返回为空，请稍后重试或简化输入');
  return text;
}
