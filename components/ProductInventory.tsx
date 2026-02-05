
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, Trash2, X, Package, Edit2, 
  Image as ImageIcon, Check, LayoutGrid, ChevronDown, 
  ExternalLink, ArrowLeft, Star, Search,
  RefreshCw, Zap, Database, Globe, Tag, 
  Layout, Layers, Trophy, List, Filter, Eye, MoreHorizontal, Settings,
  ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, AlertTriangle
} from 'lucide-react';
import { ProductData, ProductField, FieldType, User, Category } from '../types';
import { DEFAULT_CHANNEL_OPTIONS } from '../constants';
import { getAuthToken } from '../lib/authToken';
import { ImageInput } from './ImageInput';

interface ProductInventoryProps {
  products: ProductData[];
  categories: Category[];
  onAdd: (data: any) => void;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void | Promise<void>;
  currentUser: User;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  t: (key: string) => string;
}

const MultiQuantityInput: React.FC<{ options: string[]; value: Record<string, number>; onChange: (val: Record<string, number>) => void; }> = ({ options, value = {}, onChange }) => {
  const toggleOption = (opt: string) => {
    const newValue = { ...value };
    if (newValue[opt] !== undefined) delete newValue[opt];
    else newValue[opt] = 1;
    onChange(newValue);
  };
  return (
    <div className="grid grid-cols-1 gap-2 sm:gap-3 p-4 bg-slate-950/50 rounded-2xl border border-white/5 min-w-0">
      {options.map(opt => {
        const isChecked = value[opt] !== undefined;
        return (
          <div key={opt} className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all min-w-0 ${isChecked ? 'bg-slate-900 border-[#A3E635]/50 shadow-lg shadow-[#A3E635]/5' : 'bg-transparent border-white/5'}`}>
            <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => toggleOption(opt)}>
              <div className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-[#A3E635] border-[#A3E635] text-slate-950' : 'bg-slate-950 border-white/10'}`}>{isChecked && <Check size={12} />}</div>
              <span className="text-[11px] font-black uppercase text-slate-400 truncate" title={opt}>{opt}</span>
            </div>
            {isChecked && (
              <div className="flex items-center shrink-0 bg-slate-950 rounded-lg p-1 border border-white/5">
                <input 
                  type="number" 
                  min="0" 
                  className="w-12 bg-transparent text-[11px] font-black outline-none text-center text-[#A3E635]" 
                  value={value[opt]} 
                  onChange={e => onChange({...value, [opt]: Math.max(0, parseInt(e.target.value) || 0)})} 
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const StarRatingInput: React.FC<{ value: number | string; onChange: (val: number) => void }> = ({ value, onChange }) => {
  const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  const v = Math.min(5, Math.max(0, num));
  const [localStr, setLocalStr] = useState<string | null>(null);
  const isEditing = localStr !== null;
  const displayVal = isEditing ? localStr : (v || 0).toFixed(2);

  const commitAndBlur = () => {
    if (localStr === null) return;
    const x = parseFloat(String(localStr).replace(/,/g, ''));
    if (!isNaN(x)) {
      const clamped = Math.min(5, Math.max(0, x));
      onChange(Number(clamped.toFixed(2)));
    }
    setLocalStr(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-0.5 rounded hover:bg-white/5 transition-colors"
            title={`${n}`}
          >
            <Star size={20} className={v >= n ? 'text-[#A3E635]' : 'text-slate-700'} fill={v >= n ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <button type="button" onClick={() => onChange(0)} className="text-[9px] text-slate-500 hover:text-slate-400 font-black px-2 py-1 rounded border border-white/5">—</button>
      <input
        type="text"
        inputMode="decimal"
        value={displayVal}
        onFocus={() => setLocalStr((v || 0).toFixed(2))}
        onChange={e => setLocalStr(e.target.value)}
        onBlur={commitAndBlur}
        onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
        className="min-w-[4.25rem] w-[4.25rem] bg-slate-950 border border-white/5 rounded-lg px-2 py-1 text-[11px] font-black text-center text-[#A3E635] outline-none focus:border-[#A3E635]/40 tabular-nums"
        placeholder="0.00"
      />
    </div>
  );
};

export const ProductInventory: React.FC<ProductInventoryProps> = ({
  products: productsProp, categories: categoriesProp, onAdd, onUpdate, onDelete, currentUser: currentUserProp, isAddModalOpen, setIsAddModalOpen, t
}) => {
  const products = productsProp ?? [];
  const categories = categoriesProp ?? [];
  const currentUser = currentUserProp ?? { id: '', username: '', role: 'viewer' as const };
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // list = 列表/表格视图
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);
  const [selectedCatForAdd, setSelectedCatForAdd] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // 产品详情/编辑状态
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);
  const [actionsAnchorRect, setActionsAnchorRect] = useState<DOMRect | null>(null);

  const [pasteParseError, setPasteParseError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // 打开新增弹窗时预取 token，保存时直接用缓存，减少 SESSION_TIMEOUT
  useEffect(() => {
    if (isAddModalOpen) {
      getAuthToken({ timeoutMs: 20000, retryOnce: true }).catch(() => {});
    }
  }, [isAddModalOpen]);

  const CORE_FORM_KEYS = ['brand', 'model', 'channel', 'shopName', 'linkUrl', 'price', 'actualPrice', 'monthlySales', 'rating', 'mainImage'];

  /** 从产品对象安全取数：始终使用解析后的 attributes，避免详情/编辑取不到后台已有内容 */
  const getNormalizedProduct = useCallback((p: ProductData | null | undefined): Record<string, unknown> => {
    if (!p) return {};
    const raw = (p as any)?.attributes;
    const att = typeof raw === 'string' ? (() => { try { return JSON.parse(raw || '{}'); } catch { return {}; } })() : (raw ?? {}) as Record<string, unknown>;
    return { ...att, ...p };
  }, []);

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'editor';
  const channels = useMemo(() => Array.from(new Set(products.map(p => p?.channel).filter(Boolean))).sort(), [products]);
  const channelOptionsForForm = useMemo(() => [...new Set([...channels, ...DEFAULT_CHANNEL_OPTIONS])].sort(), [channels]);

  const filteredProducts = useMemo(() => {
    let result = Array.isArray(products) ? [...products] : [];
    result.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));

    if (selectedCategory !== 'all') result = result.filter(p => p?.categoryId === selectedCategory);
    if (selectedChannel !== 'all') result = result.filter(p => p?.channel === selectedChannel);

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(p => 
        (p?.brand || '').toLowerCase().includes(q) || 
        (p?.model || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, selectedCategory, selectedChannel, searchQuery]);
  
  // 分页计算
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const formScrollRef = useRef<HTMLFormElement>(null);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 重置分页当筛选条件改变
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedChannel, searchQuery, itemsPerPage]);
  // 列表变短时（如删除、筛选后）若当前页超出总页数则回退到最后一页，避免空列表
  useEffect(() => {
    if (totalPages >= 1 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);
  // 打开新增/编辑表单时滚动到顶部，确保看到核心信息（渠道、店铺名等）
  useEffect(() => {
    if (selectedCatForAdd || editingId) {
      const t = setTimeout(() => formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
      return () => clearTimeout(t);
    }
  }, [selectedCatForAdd, editingId]);
  
  // 清理所有定时器
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, []);

  const activeCategory = categories.find(c => c?.id === (editingId ? products.find(p => p?.id === editingId)?.categoryId : selectedCatForAdd));
  const detailedProduct = products.find(p => p?.id === viewDetailId);

  const handleCloseModal = () => {
    setIsAddModalOpen(false); setEditingId(null); setSelectedCatForAdd(null); setFormData({});
    setPasteParseError(null); setIsSaving(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleAddClick = () => {
    setIsAddModalOpen(true);
    // 点击新增按钮后，等待抽屉打开然后滚动到底部
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      const drawerElement = document.querySelector('.drawer-container');
      if (drawerElement) {
        drawerElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
      scrollTimerRef.current = null;
    }, 100);
  };
  
  // 侧边抽屉相关函数
  const handleProductClick = (product: ProductData) => {
    setSelectedProduct(product);
  };
  
  const handleCloseDetail = () => {
    setSelectedProduct(null);
    setIsEditingProduct(false);
    setEditFormData({});
  };
  
  const handleEditProduct = () => {
    if (!selectedProduct) return;
    const p = selectedProduct as any;
    const att = (typeof p?.attributes === 'string' ? (() => { try { return JSON.parse(p.attributes || '{}'); } catch { return {}; } })() : (p?.attributes ?? {})) as Record<string, unknown>;
    const base: Record<string, any> = {
      ...selectedProduct,
      linkUrl: p?.linkUrl ?? att?.link_url ?? '',
      mainImage: p?.mainImage ?? att?.mainImage ?? att?.main_image ?? '',
      sellingPoints: att?.selling_points ?? p?.selling_points ?? (Array.isArray(p?.sellingPoints) ? p.sellingPoints : (typeof p?.sellingPoints === 'string' ? (p.sellingPoints as string).split(',').map((s: string) => s.trim()) : [])) ?? [],
      pros: p?.pros ?? att?.pros ?? '',
      cons: p?.cons ?? att?.cons ?? '',
      rawReview: p?.raw_review ?? p?.rawReview ?? att?.raw_review ?? '',
      insightSummary: p?.insight_summary ?? p?.insightSummary ?? att?.insight_summary ?? '',
      search_keywords: p?.search_keywords ?? att?.search_keywords ?? ''
    };
    Object.entries(att).forEach(([k, v]) => { if (v !== undefined && v !== null && base[k] === undefined) base[k] = v; });
    setIsEditingProduct(true);
    setEditFormData(base);
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      const editSection = document.getElementById('product-edit-section');
      if (editSection) editSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      scrollTimerRef.current = null;
    }, 100);
  };

  const handleOpenProductForEdit = (p: ProductData) => {
    setSelectedProduct(p);
    const raw = (p as any)?.attributes;
    const att = (typeof raw === 'string' ? (() => { try { return JSON.parse(raw || '{}'); } catch { return {}; } })() : (raw ?? {})) as Record<string, unknown>;
    const base: Record<string, any> = {
      ...p,
      linkUrl: (p as any)?.linkUrl ?? att?.link_url ?? '',
      mainImage: (p as any)?.mainImage ?? att?.mainImage ?? att?.main_image ?? '',
      sellingPoints: att?.selling_points ?? (p as any)?.selling_points ?? (Array.isArray((p as any)?.sellingPoints) ? (p as any).sellingPoints : (typeof (p as any)?.sellingPoints === 'string' ? ((p as any).sellingPoints as string).split(',').map(s => s.trim()) : [])) ?? [],
      pros: (p as any)?.pros ?? att?.pros ?? '',
      cons: (p as any)?.cons ?? att?.cons ?? '',
      rawReview: (p as any)?.raw_review ?? (p as any)?.rawReview ?? att?.raw_review ?? '',
      insightSummary: (p as any)?.insight_summary ?? (p as any)?.insightSummary ?? att?.insight_summary ?? '',
      search_keywords: (p as any)?.search_keywords ?? att?.search_keywords ?? ''
    };
    Object.entries(att).forEach(([k, v]) => { if (v !== undefined && v !== null && base[k] === undefined) base[k] = v; });
    setEditFormData(base);
    setIsEditingProduct(true);
  };
  
  const handleSaveProduct = async () => {
    if (!selectedProduct) return;
    if (isSavingEdit) return;

    // 数据验证
    if (!editFormData.brand?.trim()) {
      alert(t('brand_required'));
      return;
    }
    if (!editFormData.model?.trim()) {
      alert(t('model_required'));
      return;
    }
    if (!editFormData.channel?.trim()) {
      alert(t('channel_required'));
      return;
    }

    const activeCat = categories.find(c => c.id === selectedProduct?.categoryId);
    const sellingPointsVal = Array.isArray(editFormData.sellingPoints)
      ? editFormData.sellingPoints.join(', ')
      : (editFormData.sellingPoints?.trim?.() || '');
    const updateData: Record<string, any> = {
      categoryId: editFormData.categoryId || selectedProduct.categoryId,
      brand: editFormData.brand?.trim() || '',
      model: editFormData.model?.trim() || '',
      channel: editFormData.channel?.trim() || '',
      shopName: editFormData.shopName?.trim() || '',
      price: Number(editFormData.price) || 0,
      actualPrice: editFormData.actualPrice != null && editFormData.actualPrice !== '' ? Number(editFormData.actualPrice) : undefined,
      rating: Number(editFormData.rating) || 0,
      monthlySales: Number(editFormData.monthlySales) || 0,
      linkUrl: editFormData.linkUrl?.trim() || '',
      mainImage: (typeof editFormData.mainImage === 'string' ? editFormData.mainImage.trim() : editFormData.mainImage) || '',
      sellingPoints: sellingPointsVal,
      pros: editFormData.pros?.trim() || '',
      cons: editFormData.cons?.trim() || '',
      raw_review: (editFormData.raw_review ?? editFormData.rawReview)?.trim?.() || '',
      insight_summary: (editFormData.insight_summary ?? editFormData.insightSummary)?.trim?.() || '',
      search_keywords: (editFormData.search_keywords ?? '')?.trim?.() || ''
    };
    // 保留品类动态字段（排除已在上面填写的，避免重复）
    const EDIT_FIXED_IDS = ['brand','model','channel','shopName','price','actualPrice','monthlySales','rating','linkUrl','mainImage','sellingPoints','selling_points','pros','cons','rawReview','raw_review','insightSummary','insight_summary','search_keywords','categoryId'];
    activeCat?.fields?.forEach(f => {
      if (!f?.id || EDIT_FIXED_IDS.includes(f.id)) return;
      const val = editFormData[f.id] ?? selectedProduct?.[f.id] ?? selectedProduct?.attributes?.[f.id];
      if (val !== undefined && val !== null) updateData[f.id] = val;
    });

    setIsSavingEdit(true);
    try {
      await onUpdate(selectedProduct.id, updateData);
      setIsEditingProduct(false);
    } catch (error) {
      console.error('保存失败:', error);
      alert(t('save_failed'));
    } finally {
      setIsSavingEdit(false);
    }
  };
  
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(t('delete_confirm_product', { name: productName }))) return;
    try {
      await onDelete(productId);
      handleCloseDetail();
    } catch {
      // 删除失败时 diagnostic 已由父组件设置
    }
  };
  
  const handleDeleteFromList = async (productId: string, productName: string) => {
    setActionsOpenId(null);
    setActionsAnchorRect(null);
    if (!window.confirm(t('delete_confirm_product', { name: productName }))) return;
    try {
      await onDelete(productId);
    } catch {
      // 删除失败时 diagnostic 已由父组件设置
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory) return;
    if (!formData.brand?.trim()) {
      alert(t('brand_required'));
      return;
    }
    if (!formData.model?.trim()) {
      alert(t('model_required'));
      return;
    }
    if (!formData.channel?.trim()) {
      alert(t('channel_required'));
      return;
    }
    const finalData = { ...formData, categoryId: activeCategory.id };
    setIsSaving(true);
    setPasteParseError(null);
    try {
      if (editingId) await onUpdate(editingId, finalData); else await onAdd(finalData);
      handleCloseModal();
    } catch (err: any) {
      const raw = (err?.message || '').toLowerCase();
      const isTimeout = raw.includes('timeout') || raw.includes('超时') || raw.includes('timed out');
      const msg = err?.name === 'AbortError' ? t('save_aborted') : (isTimeout ? t('save_timeout') : (err?.message || t('add_product_failed')));
      setPasteParseError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const renderFieldInput = (field: ProductField) => {
    const baseInput = "w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner";
    const fieldValue = field.type === FieldType.MULTI_SELECT_QUANTITY
      ? (typeof formData[field.id] === 'object' && formData[field.id] !== null ? formData[field.id] : {})
      : (formData[field.id] ?? '');
    
    // 防崩溃：确保 field.options 存在且是数组
    const fieldOptions = Array.isArray(field?.options) ? field.options : [];
    
    switch (field.type) {
      case FieldType.DATE: 
        return <input type="date" className={baseInput} value={fieldValue} onChange={e => setFormData({...formData, [field.id]: e.target.value})} />;
      case FieldType.MULTI_SELECT_QUANTITY: 
        return <MultiQuantityInput options={fieldOptions} value={fieldValue} onChange={(val) => setFormData({...formData, [field.id]: val})} />;
      case FieldType.IMAGE: 
        return <ImageInput value={fieldValue} onChange={(val) => setFormData({...formData, [field.id]: val})} t={t} />;
      case FieldType.SELECT: 
        return (
          <div className="relative">
            <select className={`${baseInput} appearance-none pr-10`} value={fieldValue} onChange={e => setFormData({...formData, [field.id]: e.target.value})}>
              <option value="">{t('all')}</option>
              {fieldOptions.map(opt => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          </div>
        );
      case FieldType.TEXTAREA: 
        return <textarea className={`${baseInput} min-h-[100px] normal-case font-medium`} placeholder={field.name} value={fieldValue} onChange={e => setFormData({...formData, [field.id]: e.target.value})} />;
      case FieldType.NUMBER: 
        return <input type="number" step="0.01" className={baseInput} placeholder="0.00" value={fieldValue} onChange={e => setFormData({...formData, [field.id]: e.target.value === '' ? '' : parseFloat(e.target.value)})} />;
      case FieldType.RATING: 
        return <StarRatingInput value={fieldValue} onChange={(val) => setFormData({...formData, [field.id]: val})} />;
      case FieldType.URL: 
        return <input type="url" className={baseInput} placeholder="https://..." value={fieldValue} onChange={e => setFormData({...formData, [field.id]: e.target.value})} />;
      default: 
        return <input type="text" className={baseInput} placeholder={field.name} value={fieldValue} onChange={e => setFormData({...formData, [field.id]: e.target.value})} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="text-left space-y-2">
           <h2 className="text-4xl font-black text-white tracking-normal uppercase flex items-center gap-4">
             {t('inventory')}
             <div className="px-3 py-1 bg-[#A3E635]/10 rounded-lg border border-[#A3E635]/20 text-[#A3E635] text-[10px] not-italic tracking-wide">{filteredProducts.length} SKU</div>
           </h2>
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">{t('market_intel')}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}><LayoutGrid size={18} /></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}><List size={18} /></button>
           </div>
           <div className="h-8 w-px bg-white/5 mx-2"></div>
           {canEdit && (
             <button onClick={handleAddClick} className="flex items-center gap-3 bg-[#A3E635] text-slate-950 px-8 py-3.5 rounded-xl font-black text-[10px] uppercase shadow-[0_10px_30px_rgba(163,230,53,0.2)] hover:scale-105 active:scale-95 transition-all tracking-widest">
               <Plus size={16} /> {t('new_entry')}
             </button>
           )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-3 relative group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#A3E635] transition-colors" />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder={t('search_placeholder')} 
            className="w-full bg-slate-900/50 border border-white/5 rounded-xl pl-12 pr-4 py-3.5 text-[10px] font-black uppercase text-white outline-none focus:border-white/20 transition-all" 
          />
        </div>
        <div className="md:col-span-3 relative">
          <Layout size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl pl-11 pr-4 py-3.5 text-[10px] font-black uppercase text-white outline-none appearance-none cursor-pointer">
            <option value="all">{t('all')} {t('category')}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
        </div>
        <div className="md:col-span-3 relative">
          <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <select value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl pl-11 pr-4 py-3.5 text-[10px] font-black uppercase text-white outline-none appearance-none cursor-pointer">
            <option value="all">{t('all')} {t('channel')}</option>
            {channels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
        </div>
      </div>

      {/* Main View Area */}
      {selectedProduct ? (
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="shrink-0 bg-slate-950/95 backdrop-blur-md border-b border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleCloseDetail}
                  className="size-10 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="type-page-title uppercase tracking-normal">
                    {selectedProduct.brand} {selectedProduct.model}
                  </h2>
                  <p className="type-section-subtitle mt-1">
                    {t('product_detail_title')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Content - 可滚动区域 */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-8">
            {!isEditingProduct ? (
              <div className="p-8 space-y-12">
                {/* Product Image */}
                <div className="aspect-[4/3] bg-slate-950/40 rounded-3xl p-8 relative overflow-hidden flex items-center justify-center">
                  <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-900/80 shadow-inner flex items-center justify-center">
                    {(selectedProduct?.mainImage || selectedProduct?.attributes?.mainImage) ? (
                      <img src={selectedProduct.mainImage || selectedProduct.attributes?.mainImage} className="w-full h-full object-contain p-4" alt="" />
                    ) : (
                      <Package size={80} className="text-slate-800" />
                    )}
                  </div>
                </div>
                
                {/* 产品基础信息展示 */}
                <div className="premium-card p-8 border-white/10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="size-10 bg-slate-600 rounded-xl flex items-center justify-center text-white">
                      <Package size={20} />
                    </div>
                    <div>
                      <h4 className="type-section-title">{t('basic_product_info')}</h4>
                      <p className="type-section-subtitle mt-1">{t('basic_product_info')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="type-label">{t('category_name')}</span>
                        <span className="type-value">{categories.find(c => c.id === selectedProduct.categoryId)?.name || selectedProduct.categoryId || t('not_set')}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="type-label">{t('created_at')}</span>
                        <span className="type-value">{selectedProduct.createdAt ? new Date(selectedProduct.createdAt).toLocaleDateString() : t('unknown')}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="type-label">{t('updated_at')}</span>
                        <span className="type-value">{selectedProduct.updatedAt ? new Date(selectedProduct.updatedAt).toLocaleDateString() : t('unknown')}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="type-label">{t('main_image')}</span>
                        <span className="type-value truncate max-w-[150px]">{(selectedProduct?.mainImage || selectedProduct?.attributes?.mainImage || selectedProduct?.attributes?.main_image) ? t('set') : t('not_set')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="premium-card p-6 border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Globe size={16} className="text-slate-500" />
                      <span className="type-label">{t('channel')}</span>
                    </div>
                    <p className="type-value-emphasis">{selectedProduct.channel || t('unknown')}</p>
                  </div>
                  <div className="premium-card p-6 border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Star size={16} className="text-yellow-500" />
                      <span className="type-label">{t('rating')}</span>
                    </div>
                    <p className="type-value-emphasis">{(Number(selectedProduct?.rating) || 0).toFixed(2)}</p>
                  </div>
                  <div className="premium-card p-6 border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap size={16} className="text-green-500" />
                      <span className="type-label">{t('price')}</span>
                    </div>
                    <p className="type-value-emphasis">¥{(Number(selectedProduct.price) || 0).toLocaleString()}</p>
                  </div>
                  {(selectedProduct?.actualPrice != null && selectedProduct?.actualPrice !== '') && (
                  <div className="premium-card p-6 border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap size={16} className="text-amber-500" />
                      <span className="type-label">{t('actual_price')}</span>
                    </div>
                    <p className="type-value-emphasis">¥{(Number(selectedProduct.actualPrice) || 0).toLocaleString()}</p>
                  </div>
                  )}
                  <div className="premium-card p-6 border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Package size={16} className="text-blue-500" />
                        <span className="type-label">{t('monthly_sales')}</span>
                    </div>
                    <p className="type-value-emphasis">{(Number(selectedProduct.monthlySales) || 0).toLocaleString()}</p>
                  </div>
                </div>
                
                {/* 口碑与调研 */}
                {(() => {
                  const norm = getNormalizedProduct(selectedProduct);
                  const get = (k: string) => norm[k] ?? (selectedProduct?.attributes as Record<string, unknown>)?.[k];
                  const items = [
                    { label: t('pros'), val: get('pros'), type: 'pros' as const },
                    { label: t('cons'), val: get('cons'), type: 'cons' as const },
                    { label: t('pain_point'), val: get('raw_review') ?? get('rawReview'), type: 'text' as const },
                    { label: t('insight_summary'), val: get('insight_summary') ?? get('insightSummary'), type: 'text' as const },
                    { label: '搜索关键词', val: get('search_keywords'), type: 'text' as const },
                    { label: t('sell_points'), val: get('selling_points') ?? get('sellingPoints'), type: 'text' as const },
                  ].filter(x => x.val != null && x.val !== '');
                  if (items.length === 0) return null;
                  return (
                    <div className="premium-card p-8 border-white/10">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="size-10 bg-amber-600/20 rounded-xl flex items-center justify-center"><ThumbsUp size={20} className="text-amber-400" /></div>
                        <div>
                          <h4 className="type-section-title">{t('customer_voice_analysis')}</h4>
                          <p className="type-section-subtitle mt-1">{t('pros')} / {t('cons')} / {t('insight_summary')}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {items.map(({ label, val, type }) => (
                          <div key={label} className={`p-4 rounded-2xl border ${type === 'pros' ? 'bg-green-500/10 border-green-500/20' : type === 'cons' ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-900/50 border-white/5'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              {type === 'pros' && <ThumbsUp size={14} className="text-green-400" />}
                              {type === 'cons' && <ThumbsDown size={14} className="text-red-400" />}
                              <span className="type-label">{label}</span>
                            </div>
                            <p className="type-value leading-relaxed whitespace-pre-wrap">{typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                
                {/* 品类自定义字段 */}
                {(() => {
                  const FIXED_IDS = ['brand', 'model', 'linkUrl', 'channel', 'shopName', 'price', 'actualPrice', 'monthlySales', 'rating', 'mainImage', 'link_url', 'main_image', 'pros', 'cons', 'proPoints', 'conPoints', 'raw_review', 'rawReview', 'insight_summary', 'insightSummary', 'selling_points', 'sellingPoints', 'search_keywords'];
                  const isProsConsLike = (f: ProductField) => ['pros', 'cons', 'proPoints', 'conPoints'].includes(f.id) || /好评|差评|pros|cons/i.test(f.name || '');
                  const isSearchKeywordsLike = (f: ProductField) => f.id === 'search_keywords' || /搜索关键词/.test(f.name || '');
                  const activeCat = categories.find(c => c.id === selectedProduct?.categoryId);
                  const customFields = (activeCat?.fields ?? []).filter(f => f?.id && f?.name && !FIXED_IDS.includes(f.id) && !isProsConsLike(f) && !isSearchKeywordsLike(f));
                  if (customFields.length === 0) return null;
                  const norm = getNormalizedProduct(selectedProduct);
                  const getVal = (f: ProductField) => norm[f.id] ?? (selectedProduct?.attributes as Record<string, unknown>)?.[f.id];
                  const formatVal = (v: unknown, isMultiQty?: boolean): React.ReactNode => {
                    if (v === undefined || v === null || v === '') return null;
                    if (Array.isArray(v)) return v.join(', ');
                    if (typeof v === 'object' && v !== null) {
                      const entries = Object.entries(v).filter(([, n]) => n != null && n !== '');
                      if (isMultiQty && entries.length > 0) return entries.map(([k, n]) => `${k}×${n}`).join(' · ');
                      return JSON.stringify(v, null, 2);
                    }
                    return String(v);
                  };
                  return (
                    <div className="premium-card p-8 border-white/10">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="size-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                          <Database size={20} />
                        </div>
                        <div>
                          <h4 className="type-section-title">{t('category_params')}</h4>
                          <p className="type-section-subtitle mt-1 text-indigo-400">{activeCat?.name} · {t('category_params_hint')}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {customFields.map((field) => {
                          const val = getVal(field);
                          const isPros = /好评|pros/i.test(field.name) || field.id === 'pros';
                          const isCons = /差评|cons/i.test(field.name) || field.id === 'cons';
                          if (isPros || isCons) {
                            return (
                              <div key={field.id} className={`p-4 rounded-2xl border ${isPros ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  {isPros ? <ThumbsUp size={14} className="text-green-400" /> : <ThumbsDown size={14} className="text-red-400" />}
                                  <span className={`type-label ${isPros ? 'text-green-400' : 'text-red-400'}`}>{field.name}</span>
                                </div>
                                <p className={`type-value leading-relaxed ${isPros ? 'text-green-300' : 'text-red-300'}`}>
                                  {val ? formatVal(val) : <span className="opacity-50 italic">{t('no_data_caption')}</span>}
                                </p>
                              </div>
                            );
                          }
                          const isMultiQty = field.type === FieldType.MULTI_SELECT_QUANTITY;
                          return (
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-900/50 rounded-xl border border-white/5">
                              <div className="md:col-span-1">
                                <span className="type-label">{field.name}</span>
                              </div>
                              <div className="md:col-span-2">
                                {val ? (typeof val === 'object' && !Array.isArray(val) ? (isMultiQty ? <p className="type-value text-slate-300">{formatVal(val, true)}</p> : <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">{formatVal(val)}</pre>) : <p className="type-value text-slate-300">{String(val)}</p>) : <span className="type-caption italic">—</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                
                {/* 产品链接 */}
                {(selectedProduct?.linkUrl || selectedProduct?.attributes?.link_url) && (
                  <div className="premium-card p-6 border-white/10">
                    <a
                      href={String(selectedProduct?.linkUrl || selectedProduct?.attributes?.link_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 border border-blue-500/30 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3"
                    >
                      <ExternalLink size={18} />
                      {t('visit_source_link')}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div id="product-edit-section" className="premium-card p-8 border-white/10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="size-10 bg-orange-600 rounded-xl flex items-center justify-center text-white">
                    <Edit2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('edit_product_info')}</h4>
                    <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest mt-1">{t('edit_product_info')}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('brand')}</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                      value={editFormData.brand || ''}
                      onChange={e => setEditFormData({...editFormData, brand: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('model')}</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                      value={editFormData.model || ''}
                      onChange={e => setEditFormData({...editFormData, model: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('channel')}</label>
                    <select 
                      value={editFormData.channel || ''}
                      onChange={e => setEditFormData({...editFormData, channel: e.target.value})}
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="">{t('select_channel')}</option>
                      {channelOptionsForForm.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('shop_name')}</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                      value={editFormData.shopName || ''}
                      onChange={e => setEditFormData({...editFormData, shopName: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('price')}</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                      value={editFormData.price ?? ''}
                      onChange={e => setEditFormData({...editFormData, price: Number(e.target.value)})}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('actual_price')}</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                      value={editFormData.actualPrice ?? ''}
                      onChange={e => setEditFormData({...editFormData, actualPrice: e.target.value === '' ? '' : Number(e.target.value)})}
                    />
                  </div>
                  
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('rating')}</label>
                    <StarRatingInput value={editFormData.rating ?? ''} onChange={(val) => setEditFormData({...editFormData, rating: val})} />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('monthly_sales')}</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                      value={editFormData.monthlySales ?? ''}
                      onChange={e => setEditFormData({...editFormData, monthlySales: Number(e.target.value)})}
                    />
                  </div>
                  
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('link_url')}</label>
                    <input 
                      type="url" 
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                      value={editFormData.linkUrl || ''}
                      onChange={e => setEditFormData({...editFormData, linkUrl: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('main_image')}</label>
                    <ImageInput value={editFormData.mainImage || ''} onChange={(val) => setEditFormData({...editFormData, mainImage: val})} t={t} />
                  </div>
                  
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('sell_points')}</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                      value={Array.isArray(editFormData.sellingPoints) ? editFormData.sellingPoints.join(', ') : editFormData.sellingPoints || ''}
                      onChange={e => setEditFormData({...editFormData, sellingPoints: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                    />
                  </div>
                  
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('pros')}</label>
                    <textarea 
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner resize-none" 
                      rows={3}
                      value={editFormData.pros || ''}
                      onChange={e => setEditFormData({...editFormData, pros: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('cons')}</label>
                    <textarea 
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner resize-none" 
                      rows={3}
                      value={editFormData.cons || ''}
                      onChange={e => setEditFormData({...editFormData, cons: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('pain_point')}</label>
                    <textarea 
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner resize-none" 
                      rows={2}
                      value={editFormData.raw_review ?? editFormData.rawReview ?? ''}
                      onChange={e => setEditFormData({...editFormData, rawReview: e.target.value, raw_review: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('insight_summary')}</label>
                    <textarea 
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner resize-none" 
                      rows={4}
                      value={editFormData.insight_summary ?? editFormData.insightSummary ?? ''}
                      onChange={e => setEditFormData({...editFormData, insightSummary: e.target.value, insight_summary: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">搜索关键词</label>
                    <textarea 
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner resize-none" 
                      rows={2}
                      value={editFormData.search_keywords ?? ''}
                      onChange={e => setEditFormData({...editFormData, search_keywords: e.target.value})}
                    />
                  </div>
                  
                  {/* 品类动态字段 */}
                  {(() => {
                    const FIXED_IDS = ['brand','model','channel','shopName','price','actualPrice','monthlySales','rating','linkUrl','mainImage','sellingPoints','selling_points','pros','cons','proPoints','conPoints','rawReview','raw_review','insightSummary','insight_summary','search_keywords','categoryId'];
                    const isProsConsLike = (f: ProductField) => ['pros', 'cons', 'proPoints', 'conPoints'].includes(f.id) || /好评|差评|pros|cons/i.test(f.name || '');
                    const isSearchKeywordsLike = (f: ProductField) => f.id === 'search_keywords' || /搜索关键词/.test(f.name || '');
                    const activeCat = categories.find(c => c.id === selectedProduct?.categoryId);
                    const dynFields = (activeCat?.fields ?? []).filter(f => f?.id && f?.name && !FIXED_IDS.includes(f.id) && !isProsConsLike(f) && !isSearchKeywordsLike(f));
                    if (dynFields.length === 0) return null;
                    const baseInput = "w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner";
                    const renderDyn = (f: ProductField) => {
                      const val = editFormData[f.id] ?? selectedProduct?.[f.id] ?? selectedProduct?.attributes?.[f.id];
                      const opts = Array.isArray(f?.options) ? f.options : [];
                      const isWide = f.type === FieldType.MULTI_SELECT_QUANTITY || f.type === FieldType.TEXTAREA || f.type === FieldType.IMAGE;
                      const fieldVal = f.type === FieldType.MULTI_SELECT_QUANTITY ? (typeof val === 'object' && val !== null ? val : {}) : (val ?? '');
                      return (
                        <div key={f.id} className={`space-y-3 ${isWide ? 'md:col-span-2' : ''}`}>
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{f.name}{f?.required && <span className="text-red-400">*</span>}</label>
                          {f.type === FieldType.DATE && <input type="date" className={baseInput} value={fieldVal} onChange={e => setEditFormData({...editFormData, [f.id]: e.target.value})} />}
                          {f.type === FieldType.MULTI_SELECT_QUANTITY && <MultiQuantityInput options={opts} value={fieldVal} onChange={v => setEditFormData({...editFormData, [f.id]: v})} />}
                          {f.type === FieldType.IMAGE && <ImageInput value={fieldVal} onChange={v => setEditFormData({...editFormData, [f.id]: v})} t={t} />}
                          {f.type === FieldType.SELECT && (
                            <select className={`${baseInput} appearance-none pr-10`} value={fieldVal} onChange={e => setEditFormData({...editFormData, [f.id]: e.target.value})}>
                              <option value="">{t('all')}</option>
                              {opts.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                            </select>
                          )}
                          {f.type === FieldType.TEXTAREA && <textarea className={`${baseInput} min-h-[80px] normal-case font-medium`} value={fieldVal} onChange={e => setEditFormData({...editFormData, [f.id]: e.target.value})} />}
                          {f.type === FieldType.NUMBER && <input type="number" step="0.01" className={baseInput} value={fieldVal} onChange={e => setEditFormData({...editFormData, [f.id]: e.target.value === '' ? '' : parseFloat(e.target.value)})} />}
                          {f.type === FieldType.RATING && <StarRatingInput value={fieldVal} onChange={v => setEditFormData({...editFormData, [f.id]: v})} />}
                          {f.type === FieldType.URL && <input type="url" className={baseInput} value={fieldVal} onChange={e => setEditFormData({...editFormData, [f.id]: e.target.value})} />}
                          {(!f.type || f.type === FieldType.TEXT) && <input type="text" className={baseInput} value={fieldVal} onChange={e => setEditFormData({...editFormData, [f.id]: e.target.value})} />}
                        </div>
                      );
                    };
                    return (
                      <>
                        <div className="md:col-span-2 flex items-center gap-4 pb-4 border-b border-white/5">
                          <div className="size-10 bg-indigo-600/20 rounded-xl flex items-center justify-center"><Database size={20} className="text-indigo-400" /></div>
                          <div>
                            <h5 className="text-[11px] font-black text-white uppercase">{t('category_params')}</h5>
                            <p className="text-[8px] text-slate-500">{activeCat?.name}</p>
                          </div>
                        </div>
                        {dynFields.map(renderDyn)}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer - 底部操作栏 */}
          <div className="shrink-0 border-t border-white/10 bg-slate-950/95 backdrop-blur-sm p-4 flex flex-wrap gap-3">
            {canEdit && isEditingProduct && (
              <button
                type="button"
                onClick={handleSaveProduct}
                disabled={isSavingEdit}
                className="flex-1 min-w-[120px] bg-green-600 border border-green-500/30 text-white px-5 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingEdit ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                {isSavingEdit ? t('syncing') : t('save_changes')}
              </button>
            )}
            {canEdit && !isEditingProduct && (
              <button
                onClick={handleEditProduct}
                className="flex-1 min-w-[120px] bg-slate-900 border border-white/10 text-white px-5 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                {t('modify')}
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => handleDeleteProduct(selectedProduct.id, `${selectedProduct.brand} ${selectedProduct.model}`)}
                className="flex-1 min-w-[120px] bg-red-600 border border-red-500/30 text-white px-5 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                {t('delete')}
              </button>
            )}
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center text-slate-700 space-y-4">
           <Layers size={64} className="opacity-20 animate-pulse" />
           <p className="text-[10px] font-black uppercase tracking-[0.5em]">{t('no_data')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {paginatedProducts.map(p => (
             <div 
               key={p.id} 
               onClick={() => handleProductClick(p)}
               className="premium-card group relative overflow-hidden flex flex-col cursor-pointer border-white/5 p-0 hover:bg-slate-900/50 transition-all text-left"
             >
                {/* 卡片右上角操作菜单 - 下拉通过 Portal 渲染避免 overflow 导致直角阴影 */}
                <div className="absolute top-3 right-3 z-10" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setActionsOpenId(actionsOpenId === p.id ? null : p.id);
                      setActionsAnchorRect(actionsOpenId === p.id ? null : rect);
                    }} 
                    className="p-2 rounded-lg bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
                <div className="aspect-[4/3] bg-slate-950/40 p-6 relative overflow-hidden flex items-center justify-center shrink-0">
                  <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-900/80 shadow-inner flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500">
                    {p?.mainImage ? <img src={p.mainImage} className="w-full h-full object-contain p-4" alt="" /> : <Package size={40} className="text-slate-800" />}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[8px] font-black text-[#818CF8] uppercase tracking-widest">{p?.brand || t('unknown_brand')}</span>
                       <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                       <span className="text-[8px] font-bold text-slate-500 uppercase">{p?.channel || t('unknown_channel')}</span>
                    </div>
                    <h4 className="text-[11px] font-black text-white uppercase tracking-tight line-clamp-2 leading-relaxed group-hover:text-[#A3E635] transition-colors">{p?.model || t('unnamed_product')}</h4>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <p className="text-sm font-black text-white font-num">¥{(Number(p?.price) || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#A3E635]/5 rounded-lg border border-[#A3E635]/10">
                       <Star size={10} className="text-[#A3E635]" fill="currentColor" />
                       <span className="text-[9px] font-black text-[#A3E635] font-num">{(Number(p?.rating) || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
             </div>
           ))}
        </div>
      ) : (
        <div className="premium-card border-white/5 overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-900 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                       <th className="px-6 py-5">Product</th>
                       <th className="px-6 py-5">Brand/Channel</th>
                       <th className="px-6 py-5">Price</th>
                       <th className="px-6 py-5">Sales</th>
                       <th className="px-6 py-5 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {paginatedProducts.map(p => (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => handleProductClick(p)}>
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                               <div className="size-10 bg-slate-950 rounded-lg flex items-center justify-center p-1 border border-white/5">
                                  {p?.mainImage ? <img src={p.mainImage} className="max-w-full max-h-full object-contain" /> : <Package size={16} className="text-slate-700" />}
                               </div>
                               <span className="text-[10px] font-black text-white uppercase truncate max-w-[200px]">{p?.model || t('unnamed_product')}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                               <span className="text-[9px] font-black text-[#818CF8] uppercase">{p?.brand || t('unknown_brand')}</span>
                               <span className="text-[8px] font-bold text-slate-600 uppercase">{p?.channel || t('unknown_channel')}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 font-num text-[10px] text-white font-black">¥{(Number(p?.price) || 0).toLocaleString()}</td>
                         <td className="px-6 py-4 font-num text-[10px] text-[#A3E635] font-black">{(Number(p?.monthlySales) || 0).toLocaleString()}</td>
                         <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={(e) => {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setActionsOpenId(actionsOpenId === p.id ? null : p.id);
                                setActionsAnchorRect(actionsOpenId === p.id ? null : rect);
                              }} 
                              className="p-2 text-slate-600 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            >
                              <MoreHorizontal size={18} />
                            </button>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* 网格/列表视图操作菜单 - 通过 Portal 渲染到 body，避免被外层 overflow 裁剪或出现滚动条 */}
      {actionsOpenId && actionsAnchorRect && (() => {
        const p = paginatedProducts.find(pr => pr.id === actionsOpenId);
        if (!p) return null;
        const { bottom, right } = actionsAnchorRect;
        return createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setActionsOpenId(null); setActionsAnchorRect(null); }} />
            <div 
              className="fixed py-1 min-w-[140px] bg-slate-900 border border-white/10 rounded-xl shadow-xl z-50"
              style={{ top: bottom + 4, left: Math.max(8, right - 140) }}
            >
              <button onClick={() => { setActionsOpenId(null); setActionsAnchorRect(null); handleProductClick(p); }} className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                <Eye size={14} /> {t('view_detail')}
              </button>
              {canEdit && (
                <button onClick={() => { setActionsOpenId(null); setActionsAnchorRect(null); handleOpenProductForEdit(p); }} className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 hover:text-[#A3E635] flex items-center gap-2">
                  <Edit2 size={14} /> {t('modify')}
                </button>
              )}
              {canEdit && (
                <button onClick={() => handleDeleteFromList(p.id, p.model || p.brand || t('product_item'))} className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                  <Trash2 size={14} /> {t('delete')}
                </button>
              )}
            </div>
          </>,
          document.body
        );
      })()}

      {/* Drawer for Add/Edit */}
      {(isAddModalOpen || editingId) && (
        <>
           <div className="drawer-overlay animate-in fade-in duration-300" onClick={handleCloseModal}></div>
           <aside className="drawer-container open animate-in slide-in-from-right duration-500">
              <div className="drawer-header">
                 <div>
                    <h3 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight">{editingId ? t('edit') : t('new_entry')}</h3>
                    <p className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Data Architecture Node</p>
                 </div>
              </div>

              {!selectedCatForAdd && !editingId ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 custom-scrollbar">
                   <div className="text-center mb-4 sm:mb-8">
                      <div className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#A3E635]/10 border border-[#A3E635]/30 rounded-full mb-3 sm:mb-4">
                        <Package size={14} className="text-[#A3E635] sm:w-4 sm:h-4 shrink-0" />
                        <span className="text-[10px] sm:text-[11px] font-black text-[#A3E635] uppercase tracking-widest">{t('select_category')}</span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 mb-4 sm:mb-6">{t('select_category_hint')}</p>
                   </div>
                   <div className="grid grid-cols-1 gap-3 sm:gap-4">
                      {categories.map(cat => {
                        // 防崩溃：确保 category 对象存在
                        if (!cat?.id || !cat?.name) return null;
                        
                        return (
                          <button 
                            key={cat.id} 
                            onClick={() => setSelectedCatForAdd(cat.id)}
                            className="w-full flex items-center justify-between p-4 sm:p-6 bg-slate-900/50 border border-white/5 rounded-xl sm:rounded-2xl hover:border-[#A3E635]/40 hover:bg-[#A3E635]/5 transition-all group"
                          >
                             <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                                <div className="size-10 sm:size-12 bg-slate-950 rounded-lg sm:rounded-xl flex items-center justify-center text-slate-700 group-hover:bg-[#A3E635] group-hover:text-slate-950 transition-all shrink-0">
                                  <Package size={18} className="sm:w-5 sm:h-5" />
                                </div>
                                <div className="text-left">
                                  <span className="font-black text-[11px] uppercase tracking-widest text-white">{cat.name}</span>
                                  {cat?.description && (
                                    <p className="text-[8px] text-slate-500 mt-1">{cat.description}</p>
                                  )}
                                </div>
                             </div>
                             <div className="flex items-center gap-2">
                                {cat?.fields && cat.fields.length > 0 && (
                                  <span className="text-[8px] text-slate-600 bg-slate-800 px-2 py-1 rounded">
                                    {cat.fields.length} {t('fields_count')}
                                  </span>
                                )}
                                <ChevronRight className="text-slate-700" size={16} />
                             </div>
                          </button>
                        );
                      })}
                   </div>
                   
                   {/* 取消按钮 - 移到底部 */}
                   <div className="pt-4 sm:pt-6 border-t border-white/5">
                      <button 
                        onClick={handleCloseModal}
                        className="w-full py-3.5 sm:py-4 bg-slate-800 border border-white/10 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-3"
                      >
                        <X size={14} className="sm:w-4 sm:h-4 shrink-0" />
                        {t('cancel_select')}
                      </button>
                   </div>
                </div>
              ) : (
                <form ref={formScrollRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-10 custom-scrollbar">
                   {/* 核心字段区域 - 含渠道、店铺名等，置顶显示 */}
                   <div className="space-y-5 sm:space-y-8">
                      <div className="flex items-center gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-white/5">
                         <div className="size-8 sm:size-10 bg-[#A3E635]/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                            <Package size={18} className="text-[#A3E635] sm:w-5 sm:h-5" />
                         </div>
                         <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">{t('core_info')}</h4>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">{t('core_info_hint')}</p>
                         </div>
                      </div>
                      
                      {/* 核心字段固定渲染 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               {t('brand')} <span className="text-red-400">*</span>
                            </label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                              placeholder={t('brand_placeholder')} 
                              value={formData.brand || ''}
                              onChange={e => setFormData({...formData, brand: e.target.value})}
                            />
                         </div>
                         
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               {t('model')} <span className="text-red-400">*</span>
                            </label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                              placeholder={t('model_placeholder')} 
                              value={formData.model || ''}
                              onChange={e => setFormData({...formData, model: e.target.value})}
                            />
                         </div>
                         
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               {t('channel')} <span className="text-red-400">*</span>
                            </label>
                            <div className="relative group">
                               <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-[#A3E635] transition-colors" />
                               <select 
                                 value={formData.channel || ''}
                                 onChange={e => setFormData({...formData, channel: e.target.value})}
                                 className="w-full bg-slate-900 border border-white/5 rounded-xl pl-12 pr-10 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner appearance-none cursor-pointer"
                                 required
                               >
                                  <option value="">{t('select_channel')}</option>
                                  {channelOptionsForForm.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                               </select>
                               <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
                            </div>
                         </div>
                         
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               {t('shop_name')}
                            </label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                              placeholder={t('shop_name_placeholder')} 
                              value={formData.shopName || ''}
                              onChange={e => setFormData({...formData, shopName: e.target.value})}
                            />
                         </div>
                         
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               {t('price_label')}
                            </label>
                            <div className="relative">
                               <input 
                                 type="number" 
                                 step="0.01"
                                 className="w-full bg-slate-900 border border-white/5 rounded-xl pl-4 pr-16 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                                 placeholder="0.00" 
                                 value={formData.price ?? ''}
                                 onChange={e => setFormData({...formData, price: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                               />
                               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-black">¥</span>
                            </div>
                         </div>
                         
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               {t('actual_price')}
                            </label>
                            <div className="relative">
                               <input 
                                 type="number" 
                                 step="0.01"
                                 className="w-full bg-slate-900 border border-white/5 rounded-xl pl-4 pr-16 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                                 placeholder="0.00" 
                                 value={formData.actualPrice ?? ''}
                                 onChange={e => setFormData({...formData, actualPrice: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                               />
                               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-black">¥</span>
                            </div>
                         </div>
                         
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               {t('monthly_sales')}
                            </label>
                            <div className="relative">
                               <input 
                                 type="number" 
                                 className="w-full bg-slate-900 border border-white/5 rounded-xl pl-4 pr-16 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                                 placeholder="0" 
                                 value={formData.monthlySales ?? ''}
                                 onChange={e => setFormData({...formData, monthlySales: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0)})}
                               />
                               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-black">{t('units_per_month')}</span>
                            </div>
                         </div>
                         
                         <div className="space-y-3 md:col-span-2">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               {t('rating_label')}
                            </label>
                            <StarRatingInput value={formData.rating ?? ''} onChange={(val) => setFormData({...formData, rating: val})} />
                         </div>
                         
                         <div className="space-y-3 md:col-span-2">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               {t('link_url')}
                            </label>
                            <div className="relative group">
                               <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-[#A3E635] transition-colors" />
                               <input 
                                 type="url" 
                                 className="w-full bg-slate-900 border border-white/5 rounded-xl pl-12 pr-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                                 placeholder="https://amazon.com/dp/..." 
                                 value={formData.linkUrl || ''}
                                 onChange={e => setFormData({...formData, linkUrl: e.target.value})}
                               />
                            </div>
                         </div>
                         
                         <div className="space-y-3 md:col-span-2">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               {t('main_image')}
                            </label>
                            <ImageInput 
                              value={formData.mainImage || ''} 
                              onChange={(val) => setFormData({...formData, mainImage: val})} 
                              t={t}
                            />
                         </div>
                      </div>
                   </div>
                   
                   {/* 编辑时展示：口碑与调研，与详情/抽屉一致，避免后台有数据但表单为空 */}
                   {editingId && (
                     <div className="space-y-5 sm:space-y-8">
                       <div className="flex items-center gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-white/5">
                         <div className="size-8 sm:size-10 bg-amber-500/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                           <ThumbsUp size={18} className="text-amber-400 sm:w-5 sm:h-5" />
                         </div>
                         <div>
                           <h4 className="text-sm font-black text-white uppercase tracking-widest">{t('customer_voice_analysis')}</h4>
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">{t('pros')} / {t('cons')} / {t('insight_summary')}</p>
                         </div>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-3 md:col-span-2">
                           <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('pros')}</label>
                           <textarea className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-medium text-white outline-none focus:border-[#A3E635]/40 min-h-[80px] normal-case" value={formData.pros ?? ''} onChange={e => setFormData({...formData, pros: e.target.value})} />
                         </div>
                         <div className="space-y-3 md:col-span-2">
                           <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('cons')}</label>
                           <textarea className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-medium text-white outline-none focus:border-[#A3E635]/40 min-h-[80px] normal-case" value={formData.cons ?? ''} onChange={e => setFormData({...formData, cons: e.target.value})} />
                         </div>
                         <div className="space-y-3 md:col-span-2">
                           <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('pain_point')}</label>
                           <textarea className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-medium text-white outline-none focus:border-[#A3E635]/40 min-h-[60px] normal-case" value={formData.raw_review ?? formData.rawReview ?? ''} onChange={e => setFormData({...formData, raw_review: e.target.value, rawReview: e.target.value})} />
                         </div>
                         <div className="space-y-3 md:col-span-2">
                           <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('insight_summary')}</label>
                           <textarea className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-medium text-white outline-none focus:border-[#A3E635]/40 min-h-[100px] normal-case" value={formData.insight_summary ?? formData.insightSummary ?? ''} onChange={e => setFormData({...formData, insight_summary: e.target.value, insightSummary: e.target.value})} />
                         </div>
                         <div className="space-y-3 md:col-span-2">
                           <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">搜索关键词</label>
                           <textarea className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-medium text-white outline-none focus:border-[#A3E635]/40 min-h-[60px] normal-case" value={formData.search_keywords ?? ''} onChange={e => setFormData({...formData, search_keywords: e.target.value})} />
                         </div>
                         <div className="space-y-3 md:col-span-2">
                           <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('sell_points')}</label>
                           <input type="text" className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-medium text-white outline-none focus:border-[#A3E635]/40 normal-case" value={Array.isArray(formData.sellingPoints) ? formData.sellingPoints.join(', ') : (formData.selling_points ?? formData.sellingPoints ?? '')} onChange={e => setFormData({...formData, sellingPoints: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean), selling_points: e.target.value})} />
                         </div>
                       </div>
                     </div>
                   )}
                   
                   {/* 品类特定字段区域（编辑时排除口碑与调研字段，避免重复） */}
                   {activeCategory?.fields && activeCategory.fields.length > 0 && (
                      <div className="space-y-8">
                         <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                            <div className="size-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                               <Settings size={20} className="text-indigo-400" />
                            </div>
                            <div>
                               <h4 className="text-sm font-black text-white uppercase tracking-widest">{t('category_params')}</h4>
                               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">{activeCategory.name} · {t('core_info_hint')}</p>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activeCategory.fields
                              .filter((f) => {
                                if (!f?.id) return false;
                                const skip = ['pros', 'cons', 'raw_review', 'rawReview', 'insight_summary', 'insightSummary', 'search_keywords', 'selling_points', 'sellingPoints'];
                                if (skip.includes(f.id)) return false;
                                if (/搜索关键词/.test(f.name || '')) return false;
                                return true;
                              })
                              .map((field) => {
                              if (!field?.id || !field?.name || !field?.type) return null;
                              const isWide = field.type === FieldType.MULTI_SELECT_QUANTITY || field.type === FieldType.TEXTAREA;
                              return (
                                <div key={field.id} className={`space-y-3 ${isWide ? 'md:col-span-2' : ''}`}>
                                   <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                      {field.name}
                                      {field?.required && <span className="text-red-400">*</span>}
                                   </label>
                                   {renderFieldInput(field)}
                                </div>
                              );
                            })}
                         </div>
                      </div>
                   )}
                   
                   <div className="pt-10 border-t border-white/5 flex flex-col gap-4 pb-10">
                      {pasteParseError && <p className="text-[10px] text-red-400 font-medium">{pasteParseError}</p>}
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] shadow-xl hover:bg-[#A3E635] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSaving ? <><RefreshCw size={18} className="animate-spin" /> {t('syncing')}</> : <><Check size={18} /> {t('add_info')}</>}
                      </button>
                      <button 
                        type="button" 
                        onClick={handleCloseModal} 
                        className="w-full py-4 bg-slate-800 border border-white/10 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-3"
                      >
                        <X size={16} />
                        {t('cancel')}
                      </button>
                   </div>
                </form>
              )}
           </aside>
        </>
      )}

      {/* Detail Overlay - reuse existing logic or simplify if needed */}
      {viewDetailId && detailedProduct && (
        <div className="center-modal-overlay animate-in fade-in duration-300" onClick={() => setViewDetailId(null)}>
           <div className="center-modal-container flex flex-col max-w-2xl sm:max-w-4xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <div className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8 border-b border-white/5 flex items-center justify-between gap-3 bg-slate-900/40 shrink-0">
                 <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <div className="px-2 sm:px-3 py-0.5 sm:py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-lg shrink-0">{detailedProduct?.brand || t('unknown_brand')}</div>
                    <div className="h-3 sm:h-4 w-px bg-white/10 shrink-0"></div>
                    <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-tight truncate">{detailedProduct?.model || t('unnamed_product')}</span>
                 </div>
                 <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {canEdit && (
                      <button onClick={() => {
                        const p = detailedProduct as any;
                        const att = (typeof p?.attributes === 'string' ? (() => { try { return JSON.parse(p.attributes || '{}'); } catch { return {}; } })() : (p?.attributes ?? {})) as Record<string, unknown>;
                        const base: Record<string, any> = {
                          ...p,
                          linkUrl: p?.linkUrl ?? att?.link_url ?? '',
                          mainImage: p?.mainImage ?? att?.main_image ?? '',
                          sellingPoints: att?.selling_points ?? p?.selling_points ?? (typeof p?.sellingPoints === 'string' ? (p.sellingPoints as string).split(',').map((s: string) => s.trim()) : p?.sellingPoints) ?? [],
                          pros: p?.pros ?? att?.pros ?? '',
                          cons: p?.cons ?? att?.cons ?? '',
                          raw_review: p?.raw_review ?? p?.rawReview ?? att?.raw_review ?? '',
                          rawReview: p?.raw_review ?? p?.rawReview ?? att?.raw_review ?? '',
                          insight_summary: p?.insight_summary ?? p?.insightSummary ?? att?.insight_summary ?? '',
                          insightSummary: p?.insight_summary ?? p?.insightSummary ?? att?.insight_summary ?? '',
                          search_keywords: p?.search_keywords ?? att?.search_keywords ?? ''
                        };
                        Object.entries(att).forEach(([k, v]) => { if (v !== undefined && v !== null && base[k] === undefined) base[k] = v; });
                        setEditingId(p?.id);
                        setFormData(base);
                        setViewDetailId(null);
                      }} className="p-2 sm:p-3 bg-white/5 text-slate-400 hover:text-[#A3E635] rounded-lg sm:rounded-xl transition-all border border-white/5"><Edit2 size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
                    )}
                    <button onClick={() => setViewDetailId(null)} className="p-2 sm:p-3 bg-white/5 text-slate-400 hover:text-white rounded-lg sm:rounded-xl transition-all border border-white/5"><X size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-12 custom-scrollbar min-h-0">
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12">
                    <div className="lg:col-span-5 aspect-square max-h-[280px] sm:max-h-none bg-slate-950 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 lg:p-8 border border-white/5 shadow-inner flex items-center justify-center shrink-0">
                       {detailedProduct?.mainImage ? <img src={detailedProduct.mainImage} className="max-w-full max-h-full object-contain" alt="" /> : <Package size={48} className="text-slate-800 sm:w-16 sm:h-16" />}
                    </div>
                    <div className="lg:col-span-7 space-y-6 sm:space-y-10 min-w-0">
                       <div className="grid grid-cols-2 gap-4 sm:gap-8 border-b border-white/5 pb-6 sm:pb-10">
                          <div>
                             <p className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 sm:mb-2">{t('price')}</p>
                             <p className="text-2xl sm:text-4xl font-black text-white font-num">¥{(Number(detailedProduct?.price) || 0).toLocaleString()}</p>
                          </div>
                          <div>
                             <p className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 sm:mb-2">{t('volume')}</p>
                             <p className="text-2xl sm:text-4xl font-black text-[#A3E635] font-num">{(Number(detailedProduct?.monthlySales) || 0).toLocaleString()}</p>
                          </div>
                       </div>
                       {/* 口碑与调研：好评、差评、关键痛点、洞察、搜索关键词、卖点（统一从解析后的 attributes 取数） */}
                       {(() => {
                          const p = getNormalizedProduct(detailedProduct || null) as Record<string, unknown>;
                          const get = (k: string) => p[k] ?? (detailedProduct as any)?.attributes?.[k];
                          const blocks = [
                            { key: 'pros', label: t('pros'), val: get('pros'), highlight: 'green' },
                            { key: 'cons', label: t('cons'), val: get('cons'), highlight: 'red' },
                            { key: 'raw_review', label: t('pain_point'), val: get('raw_review') ?? get('rawReview') },
                            { key: 'insight_summary', label: t('insight_summary'), val: get('insight_summary') ?? get('insightSummary') },
                            { key: 'search_keywords', label: '搜索关键词', val: get('search_keywords') },
                            { key: 'selling_points', label: t('sell_points'), val: get('selling_points') ?? get('sellingPoints') },
                          ];
                          return (
                            <div className="space-y-4 sm:space-y-5">
                              {blocks.filter(b => b.val).map(({ key, label, val, highlight }) => (
                                <div key={key} className={`space-y-1 sm:space-y-1.5 text-left p-3 sm:p-4 rounded-xl border ${highlight === 'green' ? 'bg-green-500/5 border-green-500/20' : highlight === 'red' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/5'}`}>
                                  <p className="text-[7px] sm:text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
                                  <div className="text-[10px] sm:text-[11px] font-medium text-slate-300 leading-relaxed normal-case whitespace-pre-wrap">
                                    {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                       })()}
                       {/* 规格与其他属性：重量、容量、最大输出等（统一从解析后的 attributes 取数） */}
                       <div className="space-y-4 sm:space-y-5 pt-4 border-t border-white/5">
                          {(() => {
                            const p = getNormalizedProduct(detailedProduct || null) as Record<string, unknown>;
                            const get = (k: string) => p[k] ?? (detailedProduct as any)?.attributes?.[k];
                            const LABELS: Record<string, string> = {
                              weight_g: '重量(g)', capacity_mah: '容量(mAh)', max_output: '最大输出', linkUrl: t('link_url'),
                              shopName: t('shop_name'), actualPrice: t('actual_price'), rating: t('rating'),
                              placement: '上架位置', form_factor: '形态', price_tier: '价格带', review_count: '评价数',
                              selling_point_type: '卖点类型', differentiation: '差异化', bundle: '配件/套装', warranty: '保修', packaging: '包装',
                              period: '记录日期', dataReliability: '数据可信度', remark: '备注',
                            };
                            const skip = new Set(['id', 'categoryId', 'createdAt', 'updatedAt', 'updatedBy', 'mainImage', 'price', 'monthlySales', 'model', 'brand', 'channel', 'pros', 'cons', 'raw_review', 'rawReview', 'insight_summary', 'insightSummary', 'search_keywords', 'selling_points', 'sellingPoints', 'attributes']);
                            return Object.entries(p)
                              .filter(([k, v]) => !skip.has(k) && v !== undefined && v !== null && v !== '')
                              .map(([key, val]) => (
                                <div key={key} className="space-y-1 sm:space-y-1.5 text-left">
                                  <p className="text-[7px] sm:text-[8px] font-black text-slate-700 uppercase tracking-widest">{LABELS[key] || key}</p>
                                  <div className="text-[10px] sm:text-[11px] font-medium text-slate-300 leading-relaxed normal-case bg-white/5 p-3 sm:p-4 rounded-xl border border-white/5">
                                    {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                                  </div>
                                </div>
                              ));
                          })()}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
      
      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {t('pagination_show', { start: ((currentPage - 1) * itemsPerPage) + 1, end: Math.min(currentPage * itemsPerPage, filteredProducts.length), total: filteredProducts.length })}
            </span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-white outline-none"
            >
              <option value={10}>10 {t('per_page')}</option>
              <option value={20}>20 {t('per_page')}</option>
              <option value={50}>50 {t('per_page')}</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="size-10 bg-slate-900 border border-white/5 rounded-lg flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`size-10 rounded-lg font-black text-[10px] uppercase transition-all ${
                      currentPage === pageNum 
                        ? 'bg-[#A3E635] text-slate-950' 
                        : 'bg-slate-900 border border-white/5 text-slate-500 hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="size-10 bg-slate-900 border border-white/5 rounded-lg flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
