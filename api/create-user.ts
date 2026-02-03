/**
 * Vercel Serverless Function - 创建用户（Supabase Auth + public.users）
 *
 * 仅 admin 可调用。使用 Service Role 创建 Auth 用户并写入 public.users，
 * 新用户即可用邮箱+密码登录。
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
      return res.status(403).json({ error: { message: '仅管理员可创建用户' } });
    }

    const { email, username, password, role } = req.body || {};
    const finalEmail = (email || username || '').trim().toLowerCase();
    const finalUsername = (username || email || '').trim();
    const finalPassword = (password || 'password').trim();
    const finalRole = ['admin', 'editor', 'viewer'].includes(role) ? role : 'viewer';

    if (!finalEmail || !finalUsername) {
      return res.status(400).json({ error: { message: '邮箱和用户名不能为空' } });
    }

    const authEmail = finalEmail.includes('@') ? finalEmail : `${finalUsername}@internal.local`;

    let createResult = await supabase.auth.admin.createUser({
      email: authEmail,
      password: finalPassword,
      email_confirm: true
    });
    let createErr = createResult.error;

    // 若邮箱已注册，检查是否为孤儿 Auth 用户（public.users 已删但 auth 未删），若是则清理后重试
    if (createErr?.message?.includes('already been registered')) {
      const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existingAuth = users?.find((u: { email?: string }) => (u.email || '').toLowerCase() === authEmail);
      if (existingAuth) {
        const { data: profileRow } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', existingAuth.id)
          .maybeSingle();
        if (!profileRow) {
          await supabase.auth.admin.deleteUser(existingAuth.id);
          createResult = await supabase.auth.admin.createUser({
            email: authEmail,
            password: finalPassword,
            email_confirm: true
          });
          createErr = createResult.error;
        }
      }
    }

    if (createErr) {
      if (createErr.message?.includes('already been registered')) {
        return res.status(400).json({ error: { message: '该邮箱已被注册' } });
      }
      return res.status(400).json({ error: { message: createErr.message } });
    }

    const newAuthUser = createResult.data;

    const userId = crypto.randomUUID();
    const { error: insertErr } = await supabase.from('users').insert([{
      id: userId,
      auth_user_id: newAuthUser.user.id,
      username: finalUsername,
      email: authEmail,
      password: finalPassword,
      role: finalRole
    }]);

    if (insertErr) {
      return res.status(500).json({ error: { message: insertErr.message } });
    }

    return res.status(200).json({
      id: userId,
      username: finalUsername,
      email: authEmail,
      role: finalRole
    });
  } catch (err: any) {
    console.error('[create-user]', err);
    return res.status(500).json({ error: { message: err?.message || '创建用户失败' } });
  }
}
