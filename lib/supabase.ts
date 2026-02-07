import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();

if (typeof window !== 'undefined' && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.warn(
    '[Supabase] 配置缺失：请在 .env 中设置 SUPABASE_URL 和 SUPABASE_ANON_KEY（Dashboard → API → URL 与 anon public / Publishable key），变量名必须一致，且无多余空格。'
  );
}

// 孟买等远区节点延迟较高，统一拉长以降低误报超时
const FETCH_TIMEOUT_MS = 35000;
const fetchWithTimeout: typeof fetch = (input, init) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: init?.signal ?? c.signal }).finally(() => clearTimeout(t));
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: fetchWithTimeout },
});
