/**
 * 短时复用 token，避免主图上传 + 保存产品连续多次 getSession 导致超时。
 * 单次超时 20s，最多 3 次重试，缓存 60s，适配 Supabase 冷启动与弱网。
 */
import { supabase } from './supabase';

const CACHE_TTL_MS = 60_000; // 60 秒内复用，覆盖整次「上传+保存」流程
const DEFAULT_TIMEOUT_MS = 20_000; // 单次 getSession 超时 20 秒
const MAX_ATTEMPTS = 3; // 最多尝试 3 次

const SESSION_TIMEOUT_MSG = '获取登录状态超时，请检查网络或刷新重试';

let cache: { token: string; expiresAt: number } | null = null;

function isCacheValid(): boolean {
  return cache != null && cache.expiresAt > Date.now();
}

function getSessionWithTimeout(timeoutMs: number): Promise<{ data: { session: { access_token?: string } | null } }> {
  const sessionPromise = supabase.auth.getSession();
  const timeoutPromise = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error('SESSION_TIMEOUT')), timeoutMs)
  );
  return Promise.race([sessionPromise, timeoutPromise]);
}

export type GetAuthTokenOptions = {
  timeoutMs?: number;
  retryOnce?: boolean;
};

/**
 * 获取当前登录 token。优先返回缓存（60s 内）；否则调 getSession，超时则最多重试 2 次（共 3 次）。
 * @throws Error('获取登录状态超时，请检查网络或刷新重试')
 * @throws Error('请先登录')
 */
export async function getAuthToken(options?: GetAuthTokenOptions): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const attempts = options?.retryOnce !== false ? MAX_ATTEMPTS : 1;

  if (isCacheValid()) {
    return cache!.token;
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const session = await getSessionWithTimeout(timeoutMs);
      const token = session?.data?.session?.access_token;
      if (!token) {
        throw new Error('请先登录');
      }
      cache = { token, expiresAt: Date.now() + CACHE_TTL_MS };
      return token;
    } catch (e: any) {
      lastErr = e;
      if (e?.message === 'SESSION_TIMEOUT' && attempt < attempts - 1) {
        continue;
      }
      if (e?.message === 'SESSION_TIMEOUT') {
        throw new Error(SESSION_TIMEOUT_MSG);
      }
      throw e;
    }
  }
  throw lastErr;
}

/** 供外部判断是否为“登录状态超时”错误 */
export function isSessionTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.message === SESSION_TIMEOUT_MSG;
}
