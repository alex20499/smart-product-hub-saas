/**
 * Vercel Serverless Function - Gemini API 代理
 * 
 * 前端请求 /api/gemini，此函数读取服务端环境变量 GEMINI_API_KEY，
 * 代理请求到 Google Generative AI API，避免密钥暴露在前端。
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODEL = 'gemma-3-4b-it';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 仅允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: '服务端未配置 GEMINI_API_KEY' } });
  }

  try {
    const { model, contents } = req.body || {};
    const targetModel = model || MODEL;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err: any) {
    console.error('[Gemini Proxy Error]', err);
    return res.status(500).json({ error: { message: err?.message || '代理请求失败' } });
  }
}
