/**
 * Vercel Serverless Function - 删除用户（同时删除 auth.users 中的记录）
 *
 * 仅 admin 可调用。先清除 products.updated_by 引用，删除 public.users，
 * 再删除 auth.users，以便同名邮箱可重新创建。
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
    const { data: { user: authUser } } = await supabase.auth.getUser(token);
    if (!authUser) {
      return res.status(401).json({ error: { message: '登录已过期，请重新登录' } });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', authUser.id)
      .single();
    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: { message: '仅管理员可删除用户' } });
    }

    const { userId } = req.body || {};
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: { message: '请提供 userId 参数' } });
    }

    const { data: targetUser } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('id', userId)
      .single();

    await supabase.from('products').update({ updated_by: null }).eq('updated_by', userId);

    const { error: delErr } = await supabase.from('users').delete().eq('id', userId);
    if (delErr) {
      return res.status(500).json({ error: { message: delErr.message } });
    }

    if (targetUser?.auth_user_id) {
      await supabase.auth.admin.deleteUser(targetUser.auth_user_id);
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[delete-user]', err);
    return res.status(500).json({ error: { message: err?.message || '删除用户失败' } });
  }
}
