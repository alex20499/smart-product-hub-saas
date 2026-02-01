import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    if (!geminiKey && mode === 'development')
      console.warn('[Gemini] 未配置 GEMINI_API_KEY，AI 分析不可用，请在 .env 中配置');
    return {
      server: {
        port: 3000,
        host: '127.0.0.1',
      },
      plugins: [
        react(),
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
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
        'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY)
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
