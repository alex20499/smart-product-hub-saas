import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, RefreshCw, Trash2, Package } from 'lucide-react';
import { ProductData, ProductField, FieldType, Category } from '../types';
import { ImageInput } from './ImageInput';

interface ProductEditModalProps {
  product: ProductData;
  categories: Category[];
  onSave: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  t: (key: string) => string;
}

const MultiQuantityInput: React.FC<{ options: string[]; value: Record<string, number>; onChange: (val: Record<string, number>) => void }> = ({ options, value = {}, onChange }) => {
  const toggleOption = (opt: string) => {
    const newValue = { ...value };
    if (newValue[opt] !== undefined) delete newValue[opt];
    else newValue[opt] = 1;
    onChange(newValue);
  };
  return (
    <div className="grid grid-cols-1 gap-2 p-4 bg-slate-950/50 rounded-xl border border-white/5">
      {options.map(opt => {
        const isChecked = value[opt] !== undefined;
        return (
          <div key={opt} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleOption(opt)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isChecked ? 'bg-green-600 border-green-500' : 'bg-slate-800 border-slate-600'
              }`}
            >
              {isChecked && <Check size={12} className="text-white" />}
            </button>
            <span className="text-sm text-white flex-1">{opt}</span>
            {isChecked && (
              <input
                type="number"
                min="1"
                className="w-20 bg-slate-900 border border-white/5 rounded px-2 py-1 text-white text-sm"
                value={value[opt] || 1}
                onChange={e => onChange({ ...value, [opt]: Math.max(1, parseInt(e.target.value) || 1) })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const StarRatingInput: React.FC<{ value: string | number; onChange: (val: number) => void }> = ({ value, onChange }) => {
  const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(r => (
        <button key={r} type="button" onClick={() => onChange(r)} className={`text-2xl ${r <= num ? 'text-yellow-400' : 'text-slate-700'}`}>★</button>
      ))}
      <input type="number" step="0.1" min="0" max="5" className="ml-4 w-20 bg-slate-900 border border-white/5 rounded px-2 py-1 text-white text-sm" value={num} onChange={e => onChange(parseFloat(e.target.value) || 0)} />
    </div>
  );
};

export const ProductEditModal: React.FC<ProductEditModalProps> = ({ product, categories, onSave, onDelete, onClose, t }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // 初始化表单数据
  useEffect(() => {
    if (!product) return;
    const p = product as any;
    const att = typeof p?.attributes === 'string' 
      ? (() => { try { return JSON.parse(p.attributes || '{}'); } catch { return {}; } })() 
      : (p?.attributes ?? {}) as Record<string, unknown>;
    
    const base: Record<string, any> = {
      ...product,
      linkUrl: p?.linkUrl ?? att?.link_url ?? '',
      mainImage: p?.mainImage ?? att?.mainImage ?? att?.main_image ?? '',
      sellingPoints: att?.selling_points ?? p?.selling_points ?? 
        (Array.isArray(p?.sellingPoints) ? p.sellingPoints : 
         (typeof p?.sellingPoints === 'string' ? p.sellingPoints.split(',').map((s: string) => s.trim()) : [])) ?? [],
      pros: p?.pros ?? att?.pros ?? '',
      cons: p?.cons ?? att?.cons ?? '',
      rawReview: p?.raw_review ?? p?.rawReview ?? att?.raw_review ?? '',
      insightSummary: p?.insight_summary ?? p?.insightSummary ?? att?.insight_summary ?? '',
      search_keywords: p?.search_keywords ?? att?.search_keywords ?? ''
    };
    
    Object.entries(att).forEach(([k, v]) => {
      if (v !== undefined && v !== null && base[k] === undefined) {
        base[k] = v;
      }
    });
    
    setFormData(base);
  }, [product]);

  const handleSave = async () => {
    if (isSaving) return;
    
    // 数据验证
    if (!formData.brand?.trim()) {
      setSaveError(t('brand_required'));
      return;
    }
    if (!formData.model?.trim()) {
      setSaveError(t('model_required'));
      return;
    }
    if (!formData.channel?.trim()) {
      setSaveError(t('channel_required'));
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    
    try {
      const activeCat = categories.find(c => c.id === product?.categoryId);
      const sellingPointsVal = Array.isArray(formData.sellingPoints)
        ? formData.sellingPoints.join(', ')
        : (formData.sellingPoints?.trim?.() || '');
      
      const updateData: Record<string, any> = {
        categoryId: formData.categoryId || product.categoryId,
        brand: formData.brand?.trim() || '',
        model: formData.model?.trim() || '',
        channel: formData.channel?.trim() || '',
        shopName: formData.shopName?.trim() || '',
        price: Number(formData.price) || 0,
        actualPrice: formData.actualPrice != null && formData.actualPrice !== '' ? Number(formData.actualPrice) : undefined,
        rating: Number(formData.rating) || 0,
        monthlySales: Number(formData.monthlySales) || 0,
        linkUrl: formData.linkUrl?.trim() || '',
        mainImage: (typeof formData.mainImage === 'string' ? formData.mainImage.trim() : formData.mainImage) || '',
        sellingPoints: sellingPointsVal,
        pros: formData.pros?.trim() || '',
        cons: formData.cons?.trim() || '',
        raw_review: (formData.raw_review ?? formData.rawReview)?.trim?.() || '',
        insight_summary: (formData.insight_summary ?? formData.insightSummary)?.trim?.() || '',
        search_keywords: (formData.search_keywords ?? '')?.trim?.() || ''
      };
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6d2b633e-6dc1-4675-bc16-02633831aa0a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductEditModal.tsx:handleSave',message:'Edit updateData mainImage',data:{productId:product?.id,sentMainImage:updateData.mainImage},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      
      // 保留品类动态字段（排除固定字段和重复字段）
      const EDIT_FIXED_IDS = ['brand','model','channel','shopName','price','actualPrice','monthlySales','rating','linkUrl','mainImage','sellingPoints','selling_points','pros','cons','proPoints','conPoints','rawReview','raw_review','insightSummary','insight_summary','search_keywords','categoryId'];
      activeCat?.fields?.forEach(f => {
        if (!f?.id || !f?.name) return;
        // 排除固定字段 ID
        if (EDIT_FIXED_IDS.includes(f.id)) return;
        // 排除好评/差评相关字段
        const id = f.id.toLowerCase();
        const name = (f.name || '').toLowerCase();
        if (['pros', 'cons', 'propoints', 'conpoints'].includes(id) || 
            /好评|差评|pros|cons|good.*review|bad.*review/i.test(name)) return;
        // 排除搜索关键词字段
        if (id === 'search_keywords' || id === 'searchkeywords' || 
            /搜索关键词|search.*keyword/i.test(name)) return;
        // 保存动态字段值
        const val = formData[f.id] ?? product?.[f.id] ?? product?.attributes?.[f.id];
        if (val !== undefined && val !== null) updateData[f.id] = val;
      });

      const SAVE_TIMEOUT_MS = 65000;
      let lastError: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const savePromise = onSave(product.id, updateData);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(t('save_timeout'))), SAVE_TIMEOUT_MS);
          });
          await Promise.race([savePromise, timeoutPromise]);
          lastError = null;
          break;
        } catch (e: any) {
          lastError = e;
          const isTimeout = e?.message === t('save_timeout') || e?.message?.includes('超时');
          if (attempt === 0 && isTimeout) continue;
          throw e;
        }
      }
      if (lastError) throw lastError;
      onClose();
    } catch (error: any) {
      console.error('保存失败:', error);
      setSaveError(error?.message || t('save_failed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('delete_confirm_product', { name: `${product.brand} ${product.model}` }))) return;
    try {
      await onDelete(product.id);
      onClose();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const activeCat = categories.find(c => c.id === product?.categoryId);
  const FIXED_IDS = ['brand','model','channel','shopName','price','actualPrice','monthlySales','rating','linkUrl','mainImage','sellingPoints','selling_points','pros','cons','proPoints','conPoints','rawReview','raw_review','insightSummary','insight_summary','search_keywords','categoryId'];
  // 严格过滤掉好评/差评/搜索关键词相关字段（避免与固定字段重复）
  // 检查字段 ID 和名称，确保完全排除
  const isProsConsLike = (f: ProductField) => {
    if (!f?.id || !f?.name) return false;
    const id = f.id.toLowerCase();
    const name = (f.name || '').toLowerCase();
    return ['pros', 'cons', 'propoints', 'conpoints'].includes(id) || 
           /好评|差评|pros|cons|good.*review|bad.*review/i.test(name);
  };
  const isSearchKeywordsLike = (f: ProductField) => {
    if (!f?.id || !f?.name) return false;
    const id = f.id.toLowerCase();
    const name = (f.name || '').trim().toLowerCase();
    return id === 'search_keywords' || id === 'searchkeywords' || 
           /搜索关键词|search.*keyword/i.test(name) || name === '搜索关键词';
  };
  // 只展示「非固定、非好评/差评/搜索关键词」的品类字段，避免与上方固定表单项重复
  const dynFields = (activeCat?.fields ?? []).filter(f => {
    if (!f?.id || !f?.name) return false;
    if (FIXED_IDS.includes(f.id)) return false;
    if (isProsConsLike(f)) return false;
    if (isSearchKeywordsLike(f)) return false;
    const n = (f.name || '').trim();
    if (n === '好评' || n === '差评' || n === '搜索关键词') return false;
    return true;
  });

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-6 pb-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl my-auto max-h-[calc(100vh-2rem)] flex flex-col shrink-0">
        {/* Header：留足空间，避免被裁切 */}
        <div className="shrink-0 px-6 pt-5 pb-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="text-xl font-black text-white uppercase break-words leading-tight">{t('edit')} {product.brand} {product.model}</h2>
            <p className="text-xs text-slate-500 mt-1.5 break-words">{t('product_detail_title')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors shrink-0 mt-0.5" aria-label="关闭">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Error Message */}
        {saveError && (
          <div className="shrink-0 mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {saveError}
          </div>
        )}

        {/* Form Content */}
        <div ref={formRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 核心字段 */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-600 uppercase">{t('brand')} *</label>
              <input 
                type="text"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40"
                value={formData.brand || ''}
                onChange={e => setFormData({...formData, brand: e.target.value})}
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-600 uppercase">{t('model')} *</label>
              <input 
                type="text"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40"
                value={formData.model || ''}
                onChange={e => setFormData({...formData, model: e.target.value})}
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-600 uppercase">{t('channel')} *</label>
              <input 
                type="text"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40"
                value={formData.channel || ''}
                onChange={e => setFormData({...formData, channel: e.target.value})}
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-600 uppercase">{t('shop_name')}</label>
              <input 
                type="text"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40"
                value={formData.shopName || ''}
                onChange={e => setFormData({...formData, shopName: e.target.value})}
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-600 uppercase">{t('price')}</label>
              <input 
                type="number"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40"
                value={formData.price ?? ''}
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-600 uppercase">{t('actual_price')}</label>
              <input 
                type="number"
                step="0.01"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40"
                value={formData.actualPrice ?? ''}
                onChange={e => setFormData({...formData, actualPrice: e.target.value === '' ? '' : Number(e.target.value)})}
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-600 uppercase">{t('rating')}</label>
              <StarRatingInput value={formData.rating ?? ''} onChange={(val) => setFormData({...formData, rating: val})} />
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-600 uppercase">{t('monthly_sales')}</label>
              <input 
                type="number"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40"
                value={formData.monthlySales ?? ''}
                onChange={e => setFormData({...formData, monthlySales: e.target.value === '' ? '' : (Number(e.target.value) || 0)})}
              />
            </div>
            
            <div className="space-y-3 md:col-span-2">
              <label className="text-xs font-black text-slate-600 uppercase">{t('link_url')}</label>
              <input 
                type="url"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40"
                value={formData.linkUrl || ''}
                onChange={e => setFormData({...formData, linkUrl: e.target.value})}
              />
            </div>
            
            <div className="space-y-3 md:col-span-2">
              <label className="text-xs font-black text-slate-600 uppercase">{t('sell_points')}</label>
              <input 
                type="text"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40"
                value={Array.isArray(formData.sellingPoints) ? formData.sellingPoints.join(', ') : formData.sellingPoints || ''}
                onChange={e => setFormData({...formData, sellingPoints: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
              />
            </div>
            
            <div className="space-y-3 md:col-span-2">
              <label className="text-xs font-black text-slate-600 uppercase">{t('pros')}</label>
              <textarea 
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40 resize-none"
                rows={3}
                value={formData.pros || ''}
                onChange={e => setFormData({...formData, pros: e.target.value})}
              />
            </div>
            
            <div className="space-y-3 md:col-span-2">
              <label className="text-xs font-black text-slate-600 uppercase">{t('cons')}</label>
              <textarea 
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40 resize-none"
                rows={3}
                value={formData.cons || ''}
                onChange={e => setFormData({...formData, cons: e.target.value})}
              />
            </div>
            
            <div className="space-y-3 md:col-span-2">
              <label className="text-xs font-black text-slate-600 uppercase">{t('pain_point')}</label>
              <textarea 
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40 resize-none"
                rows={2}
                value={formData.raw_review ?? formData.rawReview ?? ''}
                onChange={e => setFormData({...formData, rawReview: e.target.value, raw_review: e.target.value})}
              />
            </div>
            
            <div className="space-y-3 md:col-span-2">
              <label className="text-xs font-black text-slate-600 uppercase">{t('insight_summary')}</label>
              <textarea 
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40 resize-none"
                rows={4}
                value={formData.insight_summary ?? formData.insightSummary ?? ''}
                onChange={e => setFormData({...formData, insightSummary: e.target.value, insight_summary: e.target.value})}
              />
            </div>
            
            <div className="space-y-3 md:col-span-2">
              <label className="text-xs font-black text-slate-600 uppercase">搜索关键词</label>
              <textarea 
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40 resize-none"
                rows={2}
                value={formData.search_keywords ?? ''}
                onChange={e => setFormData({...formData, search_keywords: e.target.value})}
              />
            </div>
            
            {/* 品类动态字段 */}
            {dynFields.length > 0 && (
              <>
                <div className="md:col-span-2 flex items-center gap-4 pb-4 border-b border-white/5">
                  <div className="size-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                    <Package size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-white uppercase">{t('category_params')}</h5>
                    <p className="text-xs text-slate-500">{activeCat?.name}</p>
                  </div>
                </div>
                {dynFields.map(f => {
                  const val = formData[f.id] ?? product?.[f.id] ?? product?.attributes?.[f.id];
                  const opts = Array.isArray(f?.options) ? f.options : [];
                  const isWide = f.type === FieldType.MULTI_SELECT_QUANTITY || f.type === FieldType.TEXTAREA || f.type === FieldType.IMAGE;
                  const fieldVal = f.type === FieldType.MULTI_SELECT_QUANTITY ? (typeof val === 'object' && val !== null ? val : {}) : (val ?? '');
                  
                  return (
                    <div key={f.id} className={`space-y-3 ${isWide ? 'md:col-span-2' : ''}`}>
                      <label className="text-xs font-black text-slate-600 uppercase">{f.name}{f?.required && <span className="text-red-400">*</span>}</label>
                      {f.type === FieldType.DATE && (
                        <input type="date" className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40" value={fieldVal} onChange={e => setFormData({...formData, [f.id]: e.target.value})} />
                      )}
                      {f.type === FieldType.MULTI_SELECT_QUANTITY && (
                        <MultiQuantityInput options={opts} value={fieldVal} onChange={v => setFormData({...formData, [f.id]: v})} />
                      )}
                      {f.type === FieldType.IMAGE && (
                        <ImageInput value={fieldVal} onChange={v => setFormData({...formData, [f.id]: v})} t={t} />
                      )}
                      {f.type === FieldType.SELECT && (
                        <select className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40" value={fieldVal} onChange={e => setFormData({...formData, [f.id]: e.target.value})}>
                          <option value="">{t('all')}</option>
                          {opts.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      )}
                      {f.type === FieldType.TEXTAREA && (
                        <textarea className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40 resize-none min-h-[80px]" value={fieldVal} onChange={e => setFormData({...formData, [f.id]: e.target.value})} />
                      )}
                      {f.type === FieldType.NUMBER && (
                        <input type="number" step="0.01" className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40" value={fieldVal} onChange={e => setFormData({...formData, [f.id]: e.target.value === '' ? '' : parseFloat(e.target.value)})} />
                      )}
                      {f.type === FieldType.RATING && (
                        <StarRatingInput value={fieldVal} onChange={v => setFormData({...formData, [f.id]: v})} />
                      )}
                      {f.type === FieldType.URL && (
                        <input type="url" className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40" value={fieldVal} onChange={e => setFormData({...formData, [f.id]: e.target.value})} />
                      )}
                      {(!f.type || f.type === FieldType.TEXT) && (
                        <input type="text" className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40" value={fieldVal} onChange={e => setFormData({...formData, [f.id]: e.target.value})} />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 p-4 flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
            {isSaving ? t('syncing') : t('save_changes')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            {t('delete')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 text-slate-400 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
