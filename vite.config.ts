import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    const supabaseUrl = env.SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!geminiKey && mode === 'development')
      console.warn('[Gemini] 未配置 GEMINI_API_KEY，AI 分析不可用，请在 .env 中配置');
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
                  const { data: newAuthUser, error: createErr } = await supabase.auth.admin.createUser({ email: authEmail, password: finalPassword, email_confirm: true });
                  if (createErr) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: createErr.message?.includes('already been registered') ? '该邮箱已被注册' : createErr.message } }));
                    return;
                  }
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
          }
        }] : []),
        ...(geminiKey ? [{
          name: 'gemini-proxy',
          configureServer(server: any) {
            console.log('[Gemini] 代理已启用，模型: gemma-3-4b-it');
            server.middlewares.use('/api/gemini', (req: any, res: any, next: () => void) => {
              if (req.method !== 'POST') return next();
              let body = '';
              req.on('data', (c: string) => body += c);
              req.on('end', async () => {
                try {
                  const { model = 'gemma-3-4b-it', contents } = JSON.parse(body || '{}');
                  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
                  const payload = {
                    contents: contents || [],
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
                  };
                  const r = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  const data = await r.json();
                  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (!text) {
                    const full = JSON.stringify(data);
                    console.warn('[Gemini] 空响应，完整返回:', full.slice(0, 800));
                  }
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: { message: e?.message || 'Proxy error' } }));
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
