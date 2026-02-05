/**
 * 短时复用 token，避免主图上传 + 保存产品连续两次 getSession 导致超时。
 * 带超时与一次重试，消化偶发网络抖动。
 */
import { supabase } from './supabase';

const CACHE_TTL_MS = 30_000; // 30 秒内复用
const DEFAULT_TIMEOUT_MS = 12_000; // 单次 getSession 超时 12 秒

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
 * 获取当前登录 token。优先返回缓存（30s 内）；否则调 getSession，超时则重试一次。
 * @throws Error('获取登录状态超时，请检查网络或刷新重试')
 * @throws Error('请先登录')
 */
export async function getAuthToken(options?: GetAuthTokenOptions): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryOnce = options?.retryOnce !== false;

  if (isCacheValid()) {
    return cache!.token;
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < (retryOnce ? 2 : 1); attempt++) {
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
      if (e?.message === 'SESSION_TIMEOUT') {
        if (attempt === 0 && retryOnce) {
          continue;
        }
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
