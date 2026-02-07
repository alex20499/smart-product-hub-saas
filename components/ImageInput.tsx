/**
 * 主图输入：仅支持本地图片上传（文件选择或粘贴图片）。
 * - 选择或粘贴图片后转换为 base64，保存时自动上传到云端。
 * - 外部 http(s) URL 仅作预览显示，保存时保留原 URL。
 */
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Trash2 } from 'lucide-react';

export type ImageInputProps = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  t: (key: string) => string;
};

export const ImageInput: React.FC<ImageInputProps> = ({ value, onChange, t }) => {
  const [externalImgError, setExternalImgError] = useState(false);
  useEffect(() => setExternalImgError(false), [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 检查文件大小（限制 4MB）
      if (file.size > 4 * 1024 * 1024) {
        alert('图片过大，请选择小于 4MB 的图片');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          onChange(dataUrl);
        }
      };
      reader.onerror = () => {
        alert('读取图片失败，请重试');
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      const itemType = (item as DataTransferItem).type;
      if (itemType && itemType.startsWith('image/')) {
        e.preventDefault();
        const file = (item as DataTransferItem).getAsFile();
        if (file) {
          // 检查文件大小（限制 4MB）
          if (file.size > 4 * 1024 * 1024) {
            alert('图片过大，请选择小于 4MB 的图片');
            return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) {
              onChange(dataUrl);
            }
          };
          reader.onerror = () => {
            alert('读取图片失败，请重试');
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  // 显示 base64、Storage URL 或外部 http(s) 图片（外部 URL 仅预览，加载失败则显示占位）
  const isDataUrl = value && value.startsWith('data:image/');
  const isStorageUrl = value && value.includes('/storage/v1/object/public/product-images/');
  const isExternalUrl = value && (value.startsWith('http://') || value.startsWith('https://'));
  const showPreview = value && (isDataUrl || isStorageUrl || (isExternalUrl && !externalImgError));

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      <div className="relative group">
        <div className={`w-full min-h-[120px] bg-slate-900/50 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center p-4 gap-2 ${value ? 'border-[#A3E635]/30' : 'border-white/5 hover:border-[#A3E635]/40 hover:bg-slate-800/50'}`}>
          {showPreview ? (
            <div className="relative w-full h-28 rounded-xl overflow-hidden shadow-inner bg-slate-950">
              <img src={value} className="w-full h-full object-contain p-2" alt="Preview" onError={() => setExternalImgError(true)} />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <button type="button" onClick={() => onChange('')} className="p-2 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500 hover:text-white transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="size-10 bg-slate-950 rounded-xl flex items-center justify-center text-slate-700 mx-auto mb-2 shadow-inner">
                <ImageIcon size={20} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{t('or_upload_local')}</p>
              <p className="text-[8px] text-slate-600">支持选择文件或粘贴图片</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
      {isDataUrl && (
        <p className="text-[9px] text-slate-500 text-center">
          图片已选择，保存时将自动上传到云端
        </p>
      )}
      {isExternalUrl && !externalImgError && (
        <p className="text-[9px] text-slate-500 text-center">
          当前为外部链接，仅作预览；可上传新图替换
        </p>
      )}
    </div>
  );
};
