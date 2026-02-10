/**
 * Vercel Serverless：代理 Gemini API，密钥仅服务端持有
 * 前端请求 /api/gemini，body: { model?, contents }，返回与 Google API 同构的 JSON
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    return res.status(503).json({ error: { message: 'AI 服务未配置 GEMINI_API_KEY' } });
  }

  const { model = 'gemini-2.0-flash', contents } = (req.body || {}) as { model?: string; contents?: unknown[] };
  if (!Array.isArray(contents) || contents.length === 0) {
    return res.status(400).json({ error: { message: '请提供 contents 数组' } });
  }

  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key.trim(),
      },
      body: JSON.stringify({ contents }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json(data?.error ? { error: data.error } : data);
    }
    return res.status(200).json(data);
  } catch (e: any) {
    console.error('[gemini]', e?.message || e);
    return res.status(500).json({ error: { message: e?.message || 'AI 请求失败' } });
  }
}
