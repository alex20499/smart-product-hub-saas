
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, Trash2, X, Package, Edit2, 
  Image as ImageIcon, Check, LayoutGrid, ChevronDown, 
  ExternalLink, ArrowLeft, Star, Search,
  Sparkles, RefreshCw, Zap, Database, Globe, Tag, 
  Layout, Layers, Trophy, List, Filter, Eye, MoreHorizontal, Settings,
  ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, AlertTriangle, Brain
} from 'lucide-react';
import { ProductData, ProductField, FieldType, User, Category } from '../types';
import { DEFAULT_CHANNEL_OPTIONS } from '../constants';
import { callGemini, simplifyForAI } from '../utils/gemini';

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

const ImageInput: React.FC<{ value: string; onChange: (val: string) => void; placeholder: string; }> = ({ value, onChange, placeholder }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => onChange(event.target?.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => onChange(ev.target?.result as string);
          reader.readAsDataURL(file);
        }
        return;
      }
    }
    const text = e.clipboardData?.getData('text');
    if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('//'))) {
      e.preventDefault();
      onChange(text.startsWith('//') ? 'https:' + text : text);
    }
  };

  const showInInput = value && (value.startsWith('http://') || value.startsWith('https://'));

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      <input
        type="url"
        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner placeholder:text-slate-600"
        placeholder="粘贴图片链接（从电商页右键主图「复制图片地址」后 Ctrl+V）"
        value={showInInput ? value : ''}
        title={showInInput ? value : undefined}
        onChange={e => onChange(e.target.value.trim())}
      />
      <div className="relative group">
        <div className={`w-full min-h-[120px] bg-slate-900/50 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center p-4 gap-2 ${value ? 'border-[#A3E635]/30' : 'border-white/5 hover:border-[#A3E635]/40 hover:bg-slate-800/50'}`}>
          {value ? (
            <div className="relative w-full h-28 rounded-xl overflow-hidden shadow-inner bg-slate-950">
              <img src={value} className="w-full h-full object-contain p-2" alt="Preview" />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <button type="button" onClick={() => onChange('')} className="p-2 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="size-10 bg-slate-950 rounded-xl flex items-center justify-center text-slate-700 mx-auto mb-2 shadow-inner"><ImageIcon size={20} /></div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">或点击上传本地图片</p>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
      </div>
    </div>
  );
};

export const ProductInventory: React.FC<ProductInventoryProps> = ({
  products, categories, onAdd, onUpdate, onDelete, currentUser, isAddModalOpen, setIsAddModalOpen, t
}) => {
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
  
  // 侧边抽屉状态
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  
  // AI分析状态
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  
  // AI竞品对策状态
  const [competitorAnalysis, setCompetitorAnalysis] = useState<string | null>(null);
  const [isCompetitorAnalyzing, setIsCompetitorAnalyzing] = useState(false);
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);
  const [actionsAnchorRect, setActionsAnchorRect] = useState<DOMRect | null>(null);

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
  // 重置分页当筛选条件改变
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedChannel, searchQuery, itemsPerPage]);
  // 打开新增/编辑表单时滚动到顶部，确保看到核心信息（渠道、店铺名等）
  useEffect(() => {
    if (selectedCatForAdd || editingId) {
      const t = setTimeout(() => formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
      return () => clearTimeout(t);
    }
  }, [selectedCatForAdd, editingId]);

  const activeCategory = categories.find(c => c?.id === (editingId ? products.find(p => p?.id === editingId)?.categoryId : selectedCatForAdd));
  const detailedProduct = products.find(p => p?.id === viewDetailId);

  const handleCloseModal = () => {
    setIsAddModalOpen(false); setEditingId(null); setSelectedCatForAdd(null); setFormData({});
    // 关闭时滚动回顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleAddClick = () => {
    setIsAddModalOpen(true);
    // 点击新增按钮后，等待抽屉打开然后滚动到底部
    setTimeout(() => {
      const drawerElement = document.querySelector('.drawer-container');
      if (drawerElement) {
        drawerElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
  };
  
  // 侧边抽屉相关函数
  const handleProductClick = (product: ProductData) => {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
  };
  
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedProduct(null);
    setIsEditingProduct(false);
    setEditFormData({});
    setAiAnalysis(null);
    setIsAiAnalyzing(false);
    setCompetitorAnalysis(null);
    setIsCompetitorAnalyzing(false);
  };
  
  const handleEditProduct = () => {
    setIsEditingProduct(true);
    setEditFormData({
      ...selectedProduct,
      linkUrl: selectedProduct?.attributes?.link_url || '',
      mainImage: selectedProduct?.attributes?.mainImage || '',
      sellingPoints: selectedProduct?.attributes?.selling_points || [],
      pros: selectedProduct?.attributes?.pros || '',
      cons: selectedProduct?.attributes?.cons || '',
      rawReview: selectedProduct?.attributes?.raw_review || '',
      insightSummary: selectedProduct?.attributes?.insight_summary || ''
    });
    // 滚动到编辑区域
    setTimeout(() => {
      const editSection = document.getElementById('product-edit-section');
      if (editSection) {
        editSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };
  
  const handleSaveProduct = () => {
    if (!selectedProduct) return;
    
    try {
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
      
      // 按照 App.tsx 中 handleProductUpdate 期望的数据结构（必须含 categoryId）
      const updateData = {
        categoryId: editFormData.categoryId || selectedProduct.categoryId,
        brand: editFormData.brand?.trim() || '',
        model: editFormData.model?.trim() || '',
        channel: editFormData.channel?.trim() || '',
        shopName: editFormData.shopName?.trim() || '',
        price: Number(editFormData.price) || 0,
        rating: Number(editFormData.rating) || 0,
        monthlySales: Number(editFormData.monthlySales) || 0,
        // App.tsx 期望这些字段在顶级
        linkUrl: editFormData.linkUrl?.trim() || '',
        mainImage: editFormData.mainImage?.trim() || '',
        // 其他动态属性
        sellingPoints: editFormData.sellingPoints?.trim() || '',
        pros: editFormData.pros?.trim() || '',
        cons: editFormData.cons?.trim() || '',
        rawReview: editFormData.rawReview?.trim() || '',
        insightSummary: editFormData.insightSummary?.trim() || ''
      };
      
      console.log('保存数据:', updateData);
      onUpdate(selectedProduct.id, updateData);
      setIsEditingProduct(false);
    } catch (error) {
      console.error('保存失败:', error);
      alert(t('save_failed'));
    }
  };
  
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(t('delete_confirm_product', { name: productName }))) return;
    try {
      await onDelete(productId);
      handleCloseDrawer();
    } catch {
      // 删除失败时 diagnostic 已由父组件设置，不关闭抽屉
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
  
  // AI分析函数 - 开发环境走代理，密钥在服务端
  const handleProductAIAnalysis = async (product: ProductData) => {
    setIsAiAnalyzing(true);
    setAiAnalysis(null);
    try {
      const simple = simplifyForAI(product as Record<string, unknown>);
      const prompt = `你是一位专业的产品分析师。请分析此单品：${JSON.stringify(simple)}。请给出1条实战销售战术，语言精炼，直接输出建议即可。`;
      const aiText = await callGemini(prompt);
      setAiAnalysis(aiText || 'AI 响应内容为空');
      if (aiText) console.log('✅ AI 分析成功');
    } catch (e: any) {
      console.error('🚨 AI分析失败:', e.message);
      setAiAnalysis(`分析中断: ${e.message}`);
    } finally {
      setIsAiAnalyzing(false);
    }
  };
  
  // AI竞品对策函数 - 开发环境走代理，密钥在服务端
  const handleCompetitorAnalysis = async (product: ProductData) => {
    setIsCompetitorAnalyzing(true);
    setCompetitorAnalysis(null);
    try {
      const competitorInfo = {
        name: product.model,
        brand: product.brand,
        price: product.price,
        channel: product.channel,
        selling_points: product.attributes?.selling_points || [],
        pros: product.attributes?.pros || '',
        cons: product.attributes?.cons || '',
        painPoints: {
          cons: product.attributes?.cons || '',
          raw_review: product.attributes?.raw_review || '',
          pros: product.attributes?.pros || ''
        }
      };
      
      const prompt = `你是一位高级产品经理，请深度分析以下竞品信息：${JSON.stringify(competitorInfo)}。请以专业、简洁、可执行的方式回答，重点关注如何利用竞品弱点获得市场优势。`;
      const text = await callGemini(prompt);
      setCompetitorAnalysis(text);
    } catch (error: any) {
      console.error('AI竞品对策错误:', error);
      setCompetitorAnalysis(error?.message ? `分析中断: ${error.message}` : "AI 竞品分析受阻，请稍后重试。");
    } finally {
      setIsCompetitorAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory) return;
    const finalData = { ...formData, categoryId: activeCategory.id };
    if (editingId) onUpdate(editingId, finalData); else onAdd(finalData);
    handleCloseModal();
  };

  const renderFieldInput = (field: ProductField) => {
    const baseInput = "w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner";
    const fieldValue = formData[field.id] || '';
    
    // 防崩溃：确保 field.options 存在且是数组
    const fieldOptions = Array.isArray(field?.options) ? field.options : [];
    
    switch (field.type) {
      case FieldType.DATE: 
        return <input type="date" className={baseInput} value={fieldValue} onChange={e => setFormData({...formData, [field.id]: e.target.value})} />;
      case FieldType.MULTI_SELECT_QUANTITY: 
        return <MultiQuantityInput options={fieldOptions} value={fieldValue} onChange={(val) => setFormData({...formData, [field.id]: val})} />;
      case FieldType.IMAGE: 
        return <ImageInput value={fieldValue} onChange={(val) => setFormData({...formData, [field.id]: val})} placeholder={field.name} />;
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
        return <input type="number" min="0" max="5" step="0.1" className={baseInput} placeholder="0-5" value={fieldValue} onChange={e => setFormData({...formData, [field.id]: e.target.value})} />;
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
      {filteredProducts.length === 0 ? (
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
                            <div className="relative inline-block">
                              <button 
                                onClick={() => {
                                  setActionsOpenId(actionsOpenId === p.id ? null : p.id);
                                  setActionsAnchorRect(null);
                                }} 
                                className="p-2 text-slate-600 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                              >
                                <MoreHorizontal size={18} />
                              </button>
                              {actionsOpenId === p.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => { setActionsOpenId(null); setActionsAnchorRect(null); }} />
                                  <div className="absolute right-0 top-full mt-1 py-1 min-w-[140px] bg-slate-900 border border-white/10 rounded-xl shadow-xl z-50">
                                    <button 
                                      onClick={() => { setActionsOpenId(null); setActionsAnchorRect(null); handleProductClick(p); }} 
                                      className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                                    >
                                      <Eye size={14} /> {t('view_detail')}
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteFromList(p.id, p.model || p.brand || t('product_item'))} 
                                      className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                    >
                                      <Trash2 size={14} /> {t('delete')}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* 网格视图操作菜单 - 通过 Portal 渲染，避免卡片 overflow-hidden 导致直角阴影 */}
      {viewMode === 'grid' && actionsOpenId && actionsAnchorRect && (() => {
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
              <button onClick={() => handleDeleteFromList(p.id, p.model || p.brand || t('product_item'))} className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                <Trash2 size={14} /> {t('delete')}
              </button>
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
                                 value={formData.price || ''}
                                 onChange={e => setFormData({...formData, price: e.target.value === '' ? '' : parseFloat(e.target.value)})}
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
                                 value={formData.monthlySales || ''}
                                 onChange={e => setFormData({...formData, monthlySales: e.target.value === '' ? '' : parseInt(e.target.value)})}
                               />
                               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-black">{t('units_per_month')}</span>
                            </div>
                         </div>
                         
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               {t('rating_label')}
                            </label>
                            <div className="relative">
                               <input 
                                 type="number" 
                                 min="0" 
                                 max="5" 
                                 step="0.01"
                                 className="w-full bg-slate-900 border border-white/5 rounded-xl pl-4 pr-16 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                                 placeholder="4.75" 
                                 value={formData.rating ?? ''}
                                 onChange={e => setFormData({...formData, rating: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                               />
                               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-black">★</span>
                            </div>
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
                              placeholder={t('main_image_placeholder')} 
                            />
                         </div>
                      </div>
                   </div>
                   
                   {/* 品类特定字段区域 */}
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
                            {activeCategory.fields.map((field) => {
                              // 防崩溃：确保 field 对象存在且有必要属性
                              if (!field?.id || !field?.name || !field?.type) return null;
                              // 多选数量类字段占满宽，避免选项挤在一起
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
                      <button 
                        type="submit" 
                        className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] shadow-xl hover:bg-[#A3E635] transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <Check size={18} />
                        {t('add_info')}
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
                    <div className="px-2 sm:px-3 py-0.5 sm:py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-lg shrink-0">{detailedProduct?.brand || '未知品牌'}</div>
                    <div className="h-3 sm:h-4 w-px bg-white/10 shrink-0"></div>
                    <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-tight truncate">{detailedProduct?.model || '未命名产品'}</span>
                 </div>
                 <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {canEdit && (
                      <button onClick={() => { setEditingId(detailedProduct?.id); setFormData({...detailedProduct}); setViewDetailId(null); }} className="p-2 sm:p-3 bg-white/5 text-slate-400 hover:text-[#A3E635] rounded-lg sm:rounded-xl transition-all border border-white/5"><Edit2 size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
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
                       <div className="space-y-4 sm:space-y-6">
                          {Object.entries(detailedProduct || {}).map(([key, val]) => {
                             if (['id', 'categoryId', 'createdAt', 'updatedAt', 'updatedBy', 'mainImage', 'price', 'monthlySales', 'model', 'brand', 'channel'].includes(key)) return null;
                             if (!val) return null;
                             return (
                               <div key={key} className="space-y-1 sm:space-y-1.5 text-left">
                                  <p className="text-[7px] sm:text-[8px] font-black text-slate-700 uppercase tracking-widest">{key}</p>
                                  <div className="text-[10px] sm:text-[11px] font-medium text-slate-300 leading-relaxed normal-case bg-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5">
                                     {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                  </div>
                               </div>
                             );
                          })}
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
      
      {/* 简化的侧边抽屉 */}
      {isDrawerOpen && selectedProduct && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300"
            onClick={handleCloseDrawer}
          />
          
          {/* Drawer - 修复顶部遮挡 */}
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-slate-950 border-l border-white/10 z-50 animate-in slide-in-from-right duration-500 overflow-hidden">
            {/* Header - 增加顶部边距防止遮挡 */}
            <div className="sticky top-0 bg-slate-950/95 backdrop-blur-md border-b border-white/10 p-6 z-10 pt-20 mt-16">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="type-page-title uppercase tracking-normal">
                    {selectedProduct.brand} {selectedProduct.model}
                  </h2>
                  <p className="type-section-subtitle mt-1">
                    {t('product_detail_title')}
                  </p>
                </div>
                <button 
                  onClick={handleCloseDrawer}
                  className="size-12 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* Content - 修复底部间距和滚动 */}
            <div className="h-full pb-40 overflow-y-auto custom-scrollbar p-6 space-y-8 pt-20">
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
                
                {/* 产品基础信息展示 - 遵循 typography 规范 */}
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
                        <span className="type-label">主图</span>
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
                  <div className="premium-card p-6 border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Package size={16} className="text-blue-500" />
                      <span className="type-label">月销量</span>
                    </div>
                    <p className="type-value-emphasis">{(Number(selectedProduct.monthlySales) || 0).toLocaleString()}</p>
                  </div>
                </div>
                
                {/* 品类自定义字段 - 按后台配置顺序展示，使用用户创建字段名称 */}
                {(() => {
                  const FIXED_IDS = ['brand', 'model', 'linkUrl', 'channel', 'shopName', 'price', 'monthlySales', 'rating', 'mainImage', 'link_url', 'main_image'];
                  const activeCat = categories.find(c => c.id === selectedProduct?.categoryId);
                  const customFields = (activeCat?.fields ?? []).filter(f => f?.id && f?.name && !FIXED_IDS.includes(f.id));
                  if (customFields.length === 0) return null;
                  const getVal = (f: ProductField) => selectedProduct?.[f.id] ?? selectedProduct?.attributes?.[f.id];
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
                
                {/* 产品链接 - 固定字段 */}
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
                
                {/* AI分析按钮 */}
                <div className="premium-card p-6 border-white/10">
                  <button 
                    onClick={() => handleProductAIAnalysis(selectedProduct)} 
                    disabled={isAiAnalyzing}
                    className="w-full bg-indigo-600 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isAiAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />} 
                    {isAiAnalyzing ? t('ai_analyzing') : t('ai_deep_analysis')}
                  </button>
                </div>
                
                {/* AI分析结果 */}
                {aiAnalysis && (
                  <div className="premium-card p-8 border-indigo-500/30 bg-indigo-950/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Brain size={100} className="text-indigo-400" />
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="size-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('ai_deep_analysis')}</h4>
                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-1">Generated via Gemini Node</p>
                      </div>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {aiAnalysis}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* AI竞品对策按钮 */}
                <div className="premium-card p-6 border-white/10">
                  <button 
                    onClick={() => handleCompetitorAnalysis(selectedProduct)} 
                    disabled={isCompetitorAnalyzing}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest hover:from-orange-700 hover:to-red-700 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isCompetitorAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Brain size={18} />} 
                    {isCompetitorAnalyzing ? t('ai_analyzing') : t('ai_competitor_strategy')}
                  </button>
                </div>
                
                {/* AI竞品对策结果 */}
                {competitorAnalysis && (
                  <div className="premium-card p-8 border-orange-500/30 bg-orange-950/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Brain size={100} className="text-orange-400" />
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="size-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl flex items-center justify-center text-white">
                        <Brain size={20} />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('ai_competitor_strategy')}</h4>
                        <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest mt-1">Competitor Counter Strategy</p>
                      </div>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {competitorAnalysis}
                      </div>
                    </div>
                  </div>
                )}
                
                {isEditingProduct && (
                  <div id="product-edit-section" className="premium-card p-8 border-white/10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="size-10 bg-orange-600 rounded-xl flex items-center justify-center text-white">
                        <Edit2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('edit_product_info')}</h4>
                        <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest mt-1">Edit Product Information</p>
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
                          value={editFormData.price || ''}
                          onChange={e => setEditFormData({...editFormData, price: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('rating')}</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                          value={editFormData.rating || ''}
                          onChange={e => setEditFormData({...editFormData, rating: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('monthly_sales')}</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                          value={editFormData.monthlySales || ''}
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
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('main_image_url')}</label>
                        <input 
                          type="url" 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                          value={editFormData.mainImage || ''}
                          onChange={e => setEditFormData({...editFormData, mainImage: e.target.value})}
                        />
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
                          value={editFormData.rawReview || ''}
                          onChange={e => setEditFormData({...editFormData, rawReview: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('insight_summary')}</label>
                        <textarea 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner resize-none" 
                          rows={4}
                          value={editFormData.insightSummary || ''}
                          onChange={e => setEditFormData({...editFormData, insightSummary: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-4">
                  {canEdit && (
                    <button
                      onClick={handleEditProduct}
                      className="flex-1 bg-slate-900 border border-white/10 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
                    >
                      <Edit2 size={18} />
                      {t('modify')}
                    </button>
                  )}
                  
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteProduct(selectedProduct.id, `${selectedProduct.brand} ${selectedProduct.model}`)}
                      className="flex-1 bg-red-600 border border-red-500/30 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-3"
                    >
                      <Trash2 size={18} />
                      {t('delete')}
                    </button>
                  )}
                  
                  <button
                    onClick={handleCloseDrawer}
                    className="flex-1 bg-slate-900 border border-white/10 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
                  >
                    <X size={18} />
                    {t('close')}
                  </button>
                </div>
                
                {/* Save Button - 只在编辑模式下显示 */}
                {isEditingProduct && (
                  <div className="flex justify-center pt-6 border-t border-white/5">
                    <button
                      onClick={handleSaveProduct}
                      className="bg-green-600 border border-green-500/30 text-white px-12 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-3"
                    >
                      <Check size={18} />
                      {t('save_changes')}
                    </button>
                  </div>
                )}
                
                {/* External Link - 删除重复部分 */}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
