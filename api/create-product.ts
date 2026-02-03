/**
 * 服务端代理：插入产品到 Supabase
 * 解决客户端直连超时（项目暂停、网络不稳等）
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const INSERT_TIMEOUT_MS = 90000; // 90s，预留 Supabase 项目唤醒时间

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
    const { data: { user: authUser } } = await supabase.auth.getUser(token);
    if (!authUser) {
      return res.status(401).json({ error: { message: '登录已过期，请重新登录' } });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_user_id', authUser.id)
      .single();

    if (!profile || !['admin', 'editor'].includes(profile.role || '')) {
      return res.status(403).json({ error: { message: '仅 admin/editor 可添加产品' } });
    }

    const { payload } = req.body || {};
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: { message: '请提供有效 payload' } });
    }

    const insertPromise = supabase
      .from('products')
      .insert([payload])
      .select('id')
      .single();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), INSERT_TIMEOUT_MS)
    );

    const result = await Promise.race([insertPromise, timeoutPromise]);
    const { data, error } = result;

    if (error) {
      console.error('[create-product] Supabase error:', error.code, error.message);
      return res.status(400).json({ error: { message: error.message, code: error.code } });
    }

    return res.status(200).json({ id: data?.id });
  } catch (err: any) {
    if (err?.message === 'REQUEST_TIMEOUT') {
      return res.status(408).json({ error: { message: '请求超时。若使用 Supabase 免费版，项目 7 天无活动会暂停，请到控制台唤醒。' } });
    }
    console.error('[create-product]', err);
    return res.status(500).json({ error: { message: err?.message || '插入失败' } });
  }
}
