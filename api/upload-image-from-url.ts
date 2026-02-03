/**
 * 从外部 URL 拉取图片并上传到 Supabase Storage
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return res.status(500).json({ error: { message: '服务端未配置 Supabase' } });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: { message: '未提供登录凭证' } });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return res.status(401).json({ error: { message: '登录已过期' } });
    }

    const { url } = req.body || {};
    if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return res.status(400).json({ error: { message: '请提供有效图片 URL' } });
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SmartHub/1.0)' }
    });
    clearTimeout(t);

    if (!resp.ok) {
      return res.status(400).json({ error: { message: `拉取失败: ${resp.status}` } });
    }

    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('image/')) {
      return res.status(400).json({ error: { message: '非图片类型' } });
    }

    const buf = await resp.arrayBuffer();
    if (buf.byteLength > 5242880) {
      return res.status(400).json({ error: { message: '图片超过 5MB' } });
    }

    const ext = ct.includes('png') ? 'png' : ct.includes('gif') ? 'gif' : ct.includes('webp') ? 'webp' : 'jpg';
    const path = `main/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, buf, { contentType: ct.split(';')[0], upsert: true });

    if (error) {
      return res.status(500).json({ error: { message: error.message } });
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return res.status(200).json({ url: data.publicUrl });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return res.status(408).json({ error: { message: '请求超时' } });
    }
    console.error('[upload-image-from-url]', err);
    return res.status(500).json({ error: { message: err?.message || '上传失败' } });
  }
}
