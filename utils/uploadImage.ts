/**
 * 上传图片到 Supabase Storage，返回公开 URL
 * - 仅支持 base64 图片上传（本地文件选择或粘贴）
 * - 不支持外部 URL，避免 token 超时问题
 */
import { supabase } from '../lib/supabase';

const BUCKET = 'product-images';
const MAX_BASE64_SIZE = 4 * 1024 * 1024; // 4MB，超出则压缩或拒绝

function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[mime] || 'jpg';
}

export type UploadImageOptions = { signal?: AbortSignal };

export async function uploadImageToStorage(value: string, options?: UploadImageOptions): Promise<string> {
  if (!value?.trim()) return '';
  const v = value.trim();

  // 已是我们的 Storage URL，直接返回
  const urlObj = v.startsWith('http') ? new URL(v) : null;
  if (urlObj && urlObj.pathname.includes('/storage/v1/object/public/product-images/')) {
    return v;
  }

  // 只支持 base64 图片上传
  if (!v.startsWith('data:image/')) {
    throw new Error('仅支持本地上传图片，不支持外部 URL');
  }

  if (v.length > MAX_BASE64_SIZE) {
    throw new Error('图片过大，请压缩后重试（建议 < 2MB）');
  }

  const blob = dataURLtoBlob(v);
  const mime = v.match(/:(.*?);/)?.[1] || 'image/png';
  const ext = getExtension(mime);
  const path = `main/${crypto.randomUUID()}.${ext}`;
  const UPLOAD_MS = 45000; // 45秒硬超时，避免 upload 永不返回导致一直“同步中”

  const uploadPromise = (async () => {
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: mime,
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  })();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('upload_timeout')), UPLOAD_MS);
  });

  try {
    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (err: any) {
    if (err?.message === 'upload_timeout') throw err;
    throw err;
  }
}
