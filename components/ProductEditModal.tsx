import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, RefreshCw, Trash2, Package, Sparkles } from 'lucide-react';
import { ProductData, ProductField, FieldType, Category, Language } from '../types';
import { ImageInput } from './ImageInput';
import { callGemini, simplifyForAI } from '../utils/gemini';
import { CONTENT_FIELDS, CONTENT_FIELD_IDS } from '../constants';

interface ProductEditModalProps {
  product: ProductData;
  categories: Category[];
  onSave: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  t: (key: string) => string;
  language?: Language;
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
  const raw = typeof value === 'string' ? parseFloat(value) : Number(value);
  const num = Math.min(5, Math.max(0, Number.isFinite(raw) ? raw : 0));
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(r => (
        <button key={r} type="button" onClick={() => onChange(r)} className={`text-2xl ${r <= num ? 'text-yellow-400' : 'text-slate-700'}`}>★</button>
      ))}
      <input type="number" step="0.1" min="0" max="5" className="ml-4 w-20 bg-slate-900 border border-white/5 rounded px-2 py-1 text-white text-sm" value={num} onChange={e => onChange(Math.min(5, Math.max(0, parseFloat(e.target.value) || 0)))} />
    </div>
  );
};

const LANG_INSTRUCTION: Record<Language, string> = {
  zh: '用中文写一段 2～4 句话的市场洞察，只输出正文不要标题。',
  en: 'Write 2-4 sentences of market insight in English. Output only the body text, no title.',
  ja: '日本語で 2～4 文の市場インサイトを書いてください。本文のみ出力し、タイトルは不要。',
};

export const ProductEditModal: React.FC<ProductEditModalProps> = ({ product, categories, onSave, onDelete, onClose, t, language = 'zh' }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // 初始化表单数据（好评/差评等优先从 attributes 取，避免后台有数据但编辑页空白）
  useEffect(() => {
    if (!product) return;
    const p = product as any;
    const att = typeof p?.attributes === 'string'
      ? (() => { try { return JSON.parse(p.attributes || '{}'); } catch { return {}; } })()
      : (p?.attributes ?? {}) as Record<string, unknown>;

    const get = (key: string, alt?: string): string => {
      const v = (att as any)?.[key] ?? (p as any)?.[key] ?? (att as any)?.[alt ?? ''] ?? (p as any)?.[alt ?? ''];
      return v != null && v !== '' ? String(v) : '';
    };
    const getArr = (key: string, alt?: string): string[] => {
      const v = (att as any)?.[key] ?? (p as any)?.[key] ?? (att as any)?.[alt ?? ''] ?? (p as any)?.[alt ?? ''];
      if (Array.isArray(v)) return v.map((s: unknown) => String(s)).filter(Boolean);
      if (typeof v === 'string' && v) return v.split(',').map((s: string) => s.trim()).filter(Boolean);
      return [];
    };

    const base: Record<string, any> = { ...product };
    base.linkUrl = get('linkUrl', 'link_url');
    base.mainImage = (p?.mainImage ?? (att as any)?.mainImage ?? (att as any)?.main_image ?? '') as string;
    base.period = get('period') || (p?.period ?? (att as any)?.period ?? '');
    CONTENT_FIELDS.forEach(f => {
      const v = (att as any)?.[f.id] ?? (p as any)?.[f.id];
      if (f.id === 'selling_points') {
        const arr = getArr('selling_points', 'sellingPoints');
        base.selling_points = arr.length ? arr.join(', ') : (typeof v === 'string' ? v : Array.isArray(v) ? (v as string[]).join(', ') : '');
        base.sellingPoints = base.selling_points ? base.selling_points.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      } else {
        base[f.id] = v != null && v !== '' ? (typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : String(v)) : '';
      }
    });
    if (base.insight_summary) base.insightSummary = base.insight_summary;

    Object.entries(att).forEach(([k, v]) => {
      if (v !== undefined && v !== null && base[k] === undefined) base[k] = v;
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
        period: formData.period?.trim?.() || '',
      };
      CONTENT_FIELDS.forEach(f => {
        const v = formData[f.id];
        if (f.id === 'selling_points') {
          updateData.selling_points = Array.isArray(v) ? (v as string[]).join(', ') : (typeof v === 'string' ? v : '')?.trim?.() || '';
        } else {
          updateData[f.id] = (v != null && v !== '' ? String(v).trim() : '') || '';
        }
      });

      const EDIT_FIXED_IDS = ['brand','model','channel','shopName','price','actualPrice','monthlySales','rating','linkUrl','mainImage','period','categoryId', ...CONTENT_FIELD_IDS];
      activeCat?.fields?.forEach(f => {
        if (!f?.id || !f?.name || EDIT_FIXED_IDS.includes(f.id) || CONTENT_FIELD_IDS.includes(f.id)) return;
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
  const FIXED_IDS = ['brand','model','channel','shopName','price','actualPrice','monthlySales','rating','linkUrl','mainImage','period','categoryId', ...CONTENT_FIELD_IDS];
  const dynFields = (activeCat?.fields ?? []).filter(f => {
    if (!f?.id || !f?.name) return false;
    if (FIXED_IDS.includes(f.id)) return false;
    if (CONTENT_FIELD_IDS.includes(f.id)) return false;
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
            
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-600 uppercase">{t('record_date')}</label>
              <input 
                type="date"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40"
                value={formData.period ?? ''}
                onChange={e => setFormData({...formData, period: e.target.value})}
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
            
            {/* 自定义字段：容量、快充协议、重量、尺寸、LED、输入/输出端口、好评、差评、搜索关键词、核心卖点、产品洞察 */}
            {CONTENT_FIELDS.map(f => {
              const isSellingPoints = f.id === 'selling_points';
              const val = isSellingPoints
                ? (Array.isArray(formData.sellingPoints) ? formData.sellingPoints.join(', ') : (formData.selling_points ?? formData.sellingPoints ?? ''))
                : (formData[f.id] ?? '');
              const isWide = f.type === FieldType.TEXTAREA;
              const isInsight = f.id === 'insight_summary';
              return (
                <div key={f.id} className={`space-y-3 ${isWide ? 'md:col-span-2' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-black text-slate-600 uppercase">{f.name}</label>
                    {isInsight && (
                      <button
                        type="button"
                        disabled={isGeneratingInsight}
                        onClick={async () => {
                          setInsightError(null);
                          setIsGeneratingInsight(true);
                          try {
                            const summary = simplifyForAI({ ...product, ...formData } as Record<string, unknown>);
                            const prompt = `${LANG_INSTRUCTION[language]}\n\nProduct: ${JSON.stringify(summary)}`;
                            const text = await callGemini(prompt);
                            setFormData(prev => ({ ...prev, insight_summary: text, insightSummary: text }));
                          } catch (e: any) {
                            setInsightError(e?.message || t('generate_insight_failed'));
                          } finally {
                            setIsGeneratingInsight(false);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-black uppercase tracking-wider hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isGeneratingInsight ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {isGeneratingInsight ? t('generating') : t('generate_insight')}
                      </button>
                    )}
                  </div>
                  {isInsight && insightError && <p className="text-[10px] text-red-400">{insightError}</p>}
                  {f.type === FieldType.NUMBER && (
                    <input type="number" step="any" className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40" value={val} onChange={e => setFormData({...formData, [f.id]: e.target.value === '' ? '' : Number(e.target.value)})} />
                  )}
                  {f.type === FieldType.TEXTAREA && (
                    <textarea className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40 resize-none min-h-[80px]" rows={isInsight ? 4 : 2} value={val} onChange={e => setFormData({...formData, [f.id]: e.target.value, ...(f.id === 'insight_summary' ? { insightSummary: e.target.value } : {}), ...(isSellingPoints ? { sellingPoints: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) } : {})})} />
                  )}
                  {f.type === FieldType.TEXT && (
                    <input type="text" className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40" value={val} onChange={e => setFormData({...formData, [f.id]: e.target.value})} />
                  )}
                </div>
              );
            })}
            
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
                        <select className="select-theme-dark w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/40" value={fieldVal} onChange={e => setFormData({...formData, [f.id]: e.target.value})}>
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
