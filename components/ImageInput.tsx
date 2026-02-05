/**
 * 主图输入：粘贴链接/本地图、预览、上传到云端。
 * - 粘贴/选择图片仅预览，不自动上传，避免卡住。
 * - 点「上传到云端」时带超时（12s），超时或失败立即收起转圈，可点「保存」使用当前链接。
 */
import React, { useState, useRef } from 'react';
import { Image as ImageIcon, RefreshCw, Trash2 } from 'lucide-react';

const UPLOAD_TIMEOUT_MS = 12000;

export type ImageInputProps = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  t: (key: string) => string;
};

export const ImageInput: React.FC<ImageInputProps> = ({ value, onChange, t }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const doUpload = async (val: string) => {
    if (!val?.trim()) return;
    setUploading(true);
    setUploadError(null);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const uploadPromise = (async () => {
      const { uploadImageToStorage } = await import('../utils/uploadImage');
      const isExternal = val.trim().startsWith('http://') || val.trim().startsWith('https://') || val.trim().startsWith('//');
      return uploadImageToStorage(val, isExternal ? { signal } : undefined);
    })();

    const timeoutPromise = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('upload_timeout')), UPLOAD_TIMEOUT_MS)
    );

    try {
      const url = await Promise.race([uploadPromise, timeoutPromise]);
      if (!signal.aborted) onChange(url);
    } catch (err: any) {
      const msg =
        err?.message === 'upload_timeout'
          ? t('upload_timeout')
          : err?.name === 'AbortError'
            ? t('upload_cancelled')
            : err?.message || t('upload_failed');
      setUploadError(msg);
    } finally {
      abortRef.current = null;
      setUploading(false);
    }
  };

  const handleCancelUpload = () => {
    abortRef.current?.abort();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          onChange(dataUrl);
          setUploadError(null);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) {
              onChange(dataUrl);
              setUploadError(null);
            }
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
    const text = e.clipboardData?.getData('text');
    if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('//'))) {
      e.preventDefault();
      onChange(text.startsWith('//') ? 'https:' + text : text);
      setUploadError(null);
    }
  };

  const isExternalUrl = value && (value.startsWith('http://') || value.startsWith('https://')) && !value.includes('/storage/v1/object/public/product-images/');
  const isDataUrl = value && value.startsWith('data:image/');
  const showInInput = value && (value.startsWith('http://') || value.startsWith('https://'));
  const showUploadBtn = isExternalUrl || isDataUrl;

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      <div className="flex gap-2">
        <input
          type="url"
          className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner placeholder:text-slate-600"
          placeholder={t('main_image_paste_hint')}
          value={showInInput ? value : ''}
          title={showInInput ? value : undefined}
          onChange={(e) => { setUploadError(null); onChange(e.target.value.trim()); }}
          disabled={uploading}
        />
        {showUploadBtn && (
          <button
            type="button"
            onClick={() => doUpload(value)}
            disabled={uploading}
            className="px-4 py-2.5 bg-[#A3E635] text-slate-950 rounded-xl font-black text-[9px] uppercase tracking-widest hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            {uploading ? '...' : t('upload_to_cloud')}
          </button>
        )}
      </div>
      {uploadError && <p className="text-[9px] text-red-400 font-medium">{uploadError}</p>}
      <div className="relative group">
        <div className={`w-full min-h-[120px] bg-slate-900/50 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center p-4 gap-2 ${value ? 'border-[#A3E635]/30' : 'border-white/5 hover:border-[#A3E635]/40 hover:bg-slate-800/50'}`}>
          {value ? (
            <div className="relative w-full h-28 rounded-xl overflow-hidden shadow-inner bg-slate-950">
              <img src={value} className="w-full h-full object-contain p-2" alt="Preview" />
              {uploading && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3">
                  <span className="text-[10px] font-black uppercase text-[#A3E635] flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    {t('image_uploading')}
                  </span>
                  <p className="text-[9px] text-slate-400 max-w-[200px] text-center">{t('save_with_link_hint')}</p>
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    className="px-3 py-1.5 text-[9px] font-black uppercase border border-slate-500 rounded-lg text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-colors"
                  >
                    {t('cancel_upload')}
                  </button>
                </div>
              )}
              {!uploading && (
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <button type="button" onClick={() => onChange('')} className="p-2 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="size-10 bg-slate-950 rounded-xl flex items-center justify-center text-slate-700 mx-auto mb-2 shadow-inner">
                <ImageIcon size={20} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('or_upload_local')}</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
            style={{ pointerEvents: uploading ? 'none' : undefined }}
          />
        </div>
      </div>
    </div>
  );
};
