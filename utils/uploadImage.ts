/**
 * 上传图片到 Supabase Storage，返回公开 URL
 * - base64/Blob：直接上传
 * - 外部 URL：通过 /api/upload-image-from-url 拉取后上传
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

export async function uploadImageToStorage(value: string): Promise<string> {
  if (!value?.trim()) return '';
  const v = value.trim();

  // 已是我们的 Storage URL，直接返回
  const urlObj = v.startsWith('http') ? new URL(v) : null;
  if (urlObj && urlObj.pathname.includes('/storage/v1/object/public/product-images/')) {
    return v;
  }

  // base64：转为 Blob 上传
  if (v.startsWith('data:image/')) {
    if (v.length > MAX_BASE64_SIZE) {
      throw new Error('图片过大，请压缩后重试（建议 < 2MB）');
    }
    const blob = dataURLtoBlob(v);
    const mime = v.match(/:(.*?);/)?.[1] || 'image/png';
    const ext = getExtension(mime);
    const path = `main/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: mime,
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  // 外部 URL：通过 API 拉取并上传（需传入 token）
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('//')) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('请先登录');
    const res = await fetch('/api/upload-image-from-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        url: v.startsWith('//') ? 'https:' + v : v,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || '上传失败');
    if (!data?.url) throw new Error('未返回图片地址');
    return data.url;
  }

  return v;
}
