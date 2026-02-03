import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const supabaseUrl = env.SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey && mode === 'development')
      console.warn('[create-user] 未配置 SUPABASE_SERVICE_ROLE_KEY，新建用户将无法登录');
    return {
      server: {
        port: 3000,
        host: '127.0.0.1',
        strictPort: true,
      },
      plugins: [
        react(),
        ...(supabaseUrl && serviceKey ? [{
          name: 'create-user-proxy',
          configureServer(server: any) {
            console.log('[create-user] 代理已启用');
            server.middlewares.use('/api/create-user', (req: any, res: any, next: () => void) => {
              if (req.method !== 'POST') return next();
              let body = '';
              req.on('data', (c: string) => body += c);
              req.on('end', async () => {
                try {
                  const authHeader = req.headers.authorization;
                  const token = authHeader?.replace(/^Bearer\s+/i, '');
                  if (!token) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: '未提供登录凭证' } }));
                    return;
                  }
                  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
                  const { data: { user: authUser } } = await supabase.auth.getUser(token);
                  if (!authUser) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: '登录已过期，请重新登录' } }));
                    return;
                  }
                  const { data: profile } = await supabase.from('users').select('role').eq('auth_user_id', authUser.id).single();
                  if (profile?.role !== 'admin') {
                    res.statusCode = 403;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: '仅管理员可创建用户' } }));
                    return;
                  }
                  const { email, username, password, role } = JSON.parse(body || '{}') || {};
                  const finalEmail = (email || username || '').trim().toLowerCase();
                  const finalUsername = (username || email || '').trim();
                  const finalPassword = (password || 'password').trim();
                  const finalRole = ['admin', 'editor', 'viewer'].includes(role) ? role : 'viewer';
                  if (!finalEmail || !finalUsername) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: '邮箱和用户名不能为空' } }));
                    return;
                  }
                  const authEmail = finalEmail.includes('@') ? finalEmail : `${finalUsername}@internal.local`;
                  let createRes = await supabase.auth.admin.createUser({ email: authEmail, password: finalPassword, email_confirm: true });
                  let createErr = createRes.error;
                  if (createErr?.message?.includes('already been registered')) {
                    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
                    const existingAuth = users?.find((u: any) => (u.email || '').toLowerCase() === authEmail);
                    if (existingAuth) {
                      const { data: prof } = await supabase.from('users').select('id').eq('auth_user_id', existingAuth.id).maybeSingle();
                      if (!prof) {
                        await supabase.auth.admin.deleteUser(existingAuth.id);
                        createRes = await supabase.auth.admin.createUser({ email: authEmail, password: finalPassword, email_confirm: true });
                        createErr = createRes.error;
                      }
                    }
                  }
                  if (createErr) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: createErr.message?.includes('already been registered') ? '该邮箱已被注册' : createErr.message } }));
                    return;
                  }
                  const newAuthUser = createRes.data;
                  const userId = crypto.randomUUID();
                  const { error: insertErr } = await supabase.from('users').insert([{ id: userId, auth_user_id: newAuthUser.user.id, username: finalUsername, email: authEmail, password: finalPassword, role: finalRole }]);
                  if (insertErr) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: insertErr.message } }));
                    return;
                  }
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ id: userId, username: finalUsername, email: authEmail, role: finalRole }));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: { message: e?.message || '创建用户失败' } }));
                }
              });
            });
            server.middlewares.use('/api/delete-user', (req: any, res: any, next: () => void) => {
              if (req.method !== 'POST') return next();
              let body = '';
              req.on('data', (c: string) => body += c);
              req.on('end', async () => {
                try {
                  const authHeader = req.headers.authorization;
                  const token = authHeader?.replace(/^Bearer\s+/i, '');
                  if (!token) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: '未提供登录凭证' } }));
                    return;
                  }
                  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
                  const { data: { user: authUser } } = await supabase.auth.getUser(token);
                  if (!authUser) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: '登录已过期，请重新登录' } }));
                    return;
                  }
                  const { data: adminProfile } = await supabase.from('users').select('role').eq('auth_user_id', authUser.id).single();
                  if (adminProfile?.role !== 'admin') {
                    res.statusCode = 403;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: '仅管理员可删除用户' } }));
                    return;
                  }
                  const { userId } = JSON.parse(body || '{}') || {};
                  if (!userId || typeof userId !== 'string') {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: '请提供 userId 参数' } }));
                    return;
                  }
                  const { data: targetUser } = await supabase.from('users').select('auth_user_id').eq('id', userId).single();
                  await supabase.from('products').update({ updated_by: null }).eq('updated_by', userId);
                  const { error: delErr } = await supabase.from('users').delete().eq('id', userId);
                  if (delErr) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: delErr.message } }));
                    return;
                  }
                  if (targetUser?.auth_user_id) {
                    await supabase.auth.admin.deleteUser(targetUser.auth_user_id);
                  }
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ ok: true }));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: { message: e?.message || '删除用户失败' } }));
                }
              });
            });
            server.middlewares.use('/api/upload-image-from-url', (req: any, res: any, next: () => void) => {
              if (req.method !== 'POST') return next();
              let body = '';
              req.on('data', (c: string) => body += c);
              req.on('end', async () => {
                try {
                  const authHeader = req.headers.authorization;
                  const token = authHeader?.replace(/^Bearer\s+/i, '');
                  if (!token) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: '未提供登录凭证' } }));
                    return;
                  }
                  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
                  const { data: { user } } = await supabase.auth.getUser(token);
                  if (!user) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: '登录已过期' } }));
                    return;
                  }
                  const { url } = JSON.parse(body || '{}') || {};
                  if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: '请提供有效图片 URL' } }));
                    return;
                  }
                  const controller = new AbortController();
                  const t = setTimeout(() => controller.abort(), 15000);
                  const resp = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SmartHub/1.0)' } });
                  clearTimeout(t);
                  if (!resp.ok) throw new Error(`拉取失败: ${resp.status}`);
                  const ct = resp.headers.get('content-type') || '';
                  if (!ct.includes('image/')) throw new Error('非图片类型');
                  const buf = await resp.arrayBuffer();
                  if (buf.byteLength > 5242880) throw new Error('图片超过 5MB');
                  const ext = ct.includes('png') ? 'png' : ct.includes('gif') ? 'gif' : ct.includes('webp') ? 'webp' : 'jpg';
                  const path = `main/${crypto.randomUUID()}.${ext}`;
                  const { error } = await supabase.storage.from('product-images').upload(path, buf, { contentType: ct.split(';')[0], upsert: true });
                  if (error) throw new Error(error.message);
                  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ url: data.publicUrl }));
                } catch (e: any) {
                  res.statusCode = e?.name === 'AbortError' ? 408 : 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: { message: e?.name === 'AbortError' ? '请求超时' : (e?.message || '上传失败') } }));
                }
              });
            });
          }
        }] : [])
      ],
      define: {
        // Supabase 配置仍需注入前端（公开信息，非敏感）
        'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY)
        // GEMINI_API_KEY 不再注入前端，通过 /api/gemini 服务端代理访问
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              charts: ['recharts']
            }
          }
        }
      }
    };
});
