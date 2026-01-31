
import React, { useState, useMemo } from 'react';
import { 
  Plus, Trash2, X, Package, Edit2, 
  Image as ImageIcon, Check, LayoutGrid, ChevronDown, 
  ExternalLink, ArrowLeft, Star, Search,
  Sparkles, RefreshCw, Zap, Database, Globe, Tag, 
  Layout, Layers, Trophy, List, Filter, Eye, MoreHorizontal, Settings,
  ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, AlertTriangle, Brain
} from 'lucide-react';
import { ProductData, ProductField, FieldType, User, Category } from '../types';

interface ProductInventoryProps {
  products: ProductData[];
  categories: Category[];
  onAdd: (data: any) => void;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-950/50 rounded-2xl border border-white/5">
      {options.map(opt => {
        const isChecked = value[opt] !== undefined;
        return (
          <div key={opt} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isChecked ? 'bg-slate-900 border-[#A3E635]/50 shadow-lg shadow-[#A3E635]/5' : 'bg-transparent border-white/5'}`}>
            <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleOption(opt)}>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-[#A3E635] border-[#A3E635] text-slate-950' : 'bg-slate-950 border-white/10'}`}>{isChecked && <Check size={12} />}</div>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{opt}</span>
            </div>
            {isChecked && (
              <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-1 border border-white/5">
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
  };

  return (
    <div className="relative group">
      <div className={`w-full min-h-[160px] bg-slate-900/50 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center p-6 gap-3 ${value ? 'border-[#A3E635]/30' : 'border-white/5 hover:border-[#A3E635]/40 hover:bg-slate-800/50'}`}>
        {value ? (
          <div className="relative w-full h-32 rounded-xl overflow-hidden shadow-inner bg-slate-950">
            <img src={value} className="w-full h-full object-contain p-2" alt="Preview" />
            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
              <button type="button" onClick={() => onChange('')} className="p-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="size-12 bg-slate-950 rounded-2xl flex items-center justify-center text-slate-700 mx-auto mb-3 shadow-inner"><ImageIcon size={24} /></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{placeholder}</p>
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      </div>
    </div>
  );
};

export const ProductInventory: React.FC<ProductInventoryProps> = ({
  products, categories, onAdd, onUpdate, onDelete, currentUser, isAddModalOpen, setIsAddModalOpen, t
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'editor';
  const channels = useMemo(() => Array.from(new Set(products.map(p => p?.channel).filter(Boolean))).sort(), [products]);

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
  
  // 重置分页当筛选条件改变
  useMemo(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedChannel, searchQuery, itemsPerPage]);

  const activeCategory = categories.find(c => c?.id === (editingId ? products.find(p => p?.id === editingId)?.categoryId : selectedCatForAdd));
  const detailedProduct = products.find(p => p?.id === viewDetailId);

  const handleCloseModal = () => {
    setIsAddModalOpen(false); setEditingId(null); setSelectedCatForAdd(null); setFormData({});
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
        alert('请填写品牌名称');
        return;
      }
      if (!editFormData.model?.trim()) {
        alert('请填写产品型号');
        return;
      }
      if (!editFormData.channel?.trim()) {
        alert('请填写销售渠道');
        return;
      }
      
      // 按照 App.tsx 中 handleProductUpdate 期望的数据结构
      const updateData = {
        brand: editFormData.brand?.trim() || '',
        model: editFormData.model?.trim() || '',
        channel: editFormData.channel?.trim() || '',
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
      alert('保存失败，请检查数据格式');
    }
  };
  
  const handleDeleteProduct = (productId: string, productName: string) => {
    if (window.confirm(`确定要删除「${productName}」吗？此操作不可撤销。`)) {
      onDelete(productId);
      handleCloseDrawer();
    }
  };
  
  // AI分析函数
  const handleProductAIAnalysis = async (product: ProductData) => {
    setIsAiAnalyzing(true);
    setAiAnalysis(null);
    
    const apiKey = "AIzaSyBDwfBJ3Go1xqFHE3SvviBn4Ut1dyeRJVA";
    const modelName = "gemini-flash-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    try {
      const prompt = `你是一位专业的产品分析师。请分析此单品：${JSON.stringify(product)}。请给出1条实战销售战术，语言精炼。`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`API错误: ${data.error?.message || `状态码: ${response.status}`}`);
      }

      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiText) {
        setAiAnalysis(aiText);
        console.log('✅ AI 分析成功');
      } else {
        setAiAnalysis('AI 响应内容为空');
      }

    } catch (e: any) {
      console.error('🚨 AI分析失败:', e.message);
      setAiAnalysis(`分析中断: ${e.message}`);
    } finally {
      setIsAiAnalyzing(false);
    }
  };
  
  // AI竞品对策函数
  const handleCompetitorAnalysis = async (product: ProductData) => {
    setIsCompetitorAnalyzing(true);
    setCompetitorAnalysis(null);
    const apiKey = "AIzaSyC0KhY_VWsw1RR0avGka_m5EJw7vCr8ROs";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      setCompetitorAnalysis(data.candidates[0].content.parts[0].text);
    } catch (error) {
      console.error('AI竞品对策错误:', error);
      setCompetitorAnalysis("AI 竞品分析受阻，请稍后重试。");
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
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
             {t('inventory')}
             <div className="px-3 py-1 bg-[#A3E635]/10 rounded-lg border border-[#A3E635]/20 text-[#A3E635] text-[10px] not-italic">{filteredProducts.length} SKU</div>
           </h2>
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">{t('market_intel')}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}><LayoutGrid size={18} /></button>
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}><List size={18} /></button>
           </div>
           <div className="h-8 w-px bg-white/5 mx-2"></div>
           {canEdit && (
             <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-3 bg-[#A3E635] text-slate-950 px-8 py-3.5 rounded-xl font-black text-[10px] uppercase shadow-[0_10px_30px_rgba(163,230,53,0.2)] hover:scale-105 active:scale-95 transition-all tracking-widest">
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
                <div className="aspect-[4/3] bg-slate-950/40 p-6 relative overflow-hidden flex items-center justify-center shrink-0">
                  <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-900/80 shadow-inner flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500">
                    {p?.mainImage ? <img src={p.mainImage} className="w-full h-full object-contain p-4" alt="" /> : <Package size={40} className="text-slate-800" />}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[8px] font-black text-[#818CF8] uppercase tracking-widest">{p?.brand || '未知品牌'}</span>
                       <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                       <span className="text-[8px] font-bold text-slate-500 uppercase">{p?.channel || '未知渠道'}</span>
                    </div>
                    <h4 className="text-[11px] font-black text-white uppercase tracking-tight line-clamp-2 leading-relaxed group-hover:text-[#A3E635] transition-colors">{p?.model || '未命名产品'}</h4>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <p className="text-sm font-black text-white italic font-num">¥{(Number(p?.price) || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#A3E635]/5 rounded-lg border border-[#A3E635]/10">
                       <Star size={10} className="text-[#A3E635]" fill="currentColor" />
                       <span className="text-[9px] font-black text-[#A3E635] font-num">{p?.rating || '0.0'}</span>
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
                               <span className="text-[10px] font-black text-white uppercase truncate max-w-[200px]">{p?.model || '未命名产品'}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                               <span className="text-[9px] font-black text-[#818CF8] uppercase">{p?.brand || '未知品牌'}</span>
                               <span className="text-[8px] font-bold text-slate-600 uppercase">{p?.channel || '未知渠道'}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 font-num text-[10px] text-white font-black">¥{(Number(p?.price) || 0).toLocaleString()}</td>
                         <td className="px-6 py-4 font-num text-[10px] text-[#A3E635] font-black">{(Number(p?.monthlySales) || 0).toLocaleString()}</td>
                         <td className="px-6 py-4 text-right">
                            <button className="p-2 text-slate-600 hover:text-white transition-colors"><MoreHorizontal size={18} /></button>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* 品类选择模态框 - 独立显示 */}
      {isAddModalOpen && !selectedCatForAdd && (
        <>
           <div className="center-modal-overlay animate-in fade-in duration-300" onClick={handleCloseModal}></div>
           <div className="center-modal-container p-8 lg:p-12 space-y-8 animate-in zoom-in-95 duration-200 max-w-2xl w-full mx-4">
              <div className="flex items-center justify-between">
                 <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">{t('new_entry')}</h3>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-2">选择产品品类架构</p>
                 </div>
                 <button onClick={handleCloseModal} className="size-12 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={24} /></button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {categories.map(cat => {
                   if (!cat?.id || !cat?.name) return null;
                   
                   return (
                     <button 
                       key={cat.id} 
                       onClick={() => setSelectedCatForAdd(cat.id)}
                       className="w-full flex items-center justify-between p-6 bg-slate-900/50 border border-white/5 rounded-2xl hover:border-[#A3E635]/40 hover:bg-[#A3E635]/5 transition-all group"
                     >
                        <div className="flex items-center gap-4">
                           <div className="size-12 bg-slate-950 rounded-xl flex items-center justify-center text-slate-700 group-hover:bg-[#A3E635] group-hover:text-slate-950 transition-all">
                             <Package size={20} />
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
                               {cat.fields.length} 字段
                             </span>
                           )}
                           <ChevronRight className="text-slate-700" size={16} />
                        </div>
                     </button>
                   );
                 })}
              </div>
           </div>
        </>
      )}

      {/* 产品表单抽屉 - 选择品类后显示 */}
      {(selectedCatForAdd || editingId) && (
        <>
           <div className="drawer-overlay animate-in fade-in duration-300" onClick={handleCloseModal}></div>
           <aside className="drawer-container open animate-in slide-in-from-right duration-500">
              <div className="drawer-header">
                 <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">{editingId ? t('edit') : t('new_entry')}</h3>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Data Architecture Node</p>
                 </div>
                 <button onClick={handleCloseModal} className="size-12 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                   {/* 核心字段区域 - 固定显示在顶部 */}
                   <div className="space-y-8">
                      <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                         <div className="size-10 bg-[#A3E635]/10 rounded-xl flex items-center justify-center">
                            <Package size={20} className="text-[#A3E635]" />
                         </div>
                         <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">核心信息</h4>
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">所有品类共有字段</p>
                         </div>
                      </div>
                      
                      {/* 核心字段固定渲染 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               品牌 <span className="text-red-400">*</span>
                            </label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                              placeholder="输入品牌名称" 
                              value={formData.brand || ''}
                              onChange={e => setFormData({...formData, brand: e.target.value})}
                            />
                         </div>
                         
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               型号 <span className="text-red-400">*</span>
                            </label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                              placeholder="输入产品型号" 
                              value={formData.model || ''}
                              onChange={e => setFormData({...formData, model: e.target.value})}
                            />
                         </div>
                         
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               渠道 <span className="text-red-400">*</span>
                            </label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                              placeholder="如：淘宝、京东、拼多多" 
                              value={formData.channel || ''}
                              onChange={e => setFormData({...formData, channel: e.target.value})}
                            />
                         </div>
                         
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               价格 (¥)
                            </label>
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                              placeholder="0.00" 
                              value={formData.price || ''}
                              onChange={e => setFormData({...formData, price: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                            />
                         </div>
                         
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               月销量
                            </label>
                            <input 
                              type="number" 
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                              placeholder="0" 
                              value={formData.monthlySales || ''}
                              onChange={e => setFormData({...formData, monthlySales: e.target.value === '' ? '' : parseInt(e.target.value)})}
                            />
                         </div>
                         
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               评分 (0-5)
                            </label>
                            <input 
                              type="number" 
                              min="0" 
                              max="5" 
                              step="0.1"
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                              placeholder="0.0" 
                              value={formData.rating || ''}
                              onChange={e => setFormData({...formData, rating: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                            />
                         </div>
                         
                         <div className="space-y-3 md:col-span-2">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               产品链接
                            </label>
                            <input 
                              type="url" 
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 transition-all shadow-inner" 
                              placeholder="https://..." 
                              value={formData.linkUrl || ''}
                              onChange={e => setFormData({...formData, linkUrl: e.target.value})}
                            />
                         </div>
                         
                         <div className="space-y-3 md:col-span-2">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                               主图
                            </label>
                            <ImageInput 
                              value={formData.mainImage || ''} 
                              onChange={(val) => setFormData({...formData, mainImage: val})} 
                              placeholder="上传产品主图" 
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
                               <h4 className="text-sm font-black text-white uppercase tracking-widest">品类参数</h4>
                               <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">{activeCategory.name} 特有属性</p>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activeCategory.fields.map((field) => {
                              // 防崩溃：确保 field 对象存在且有必要属性
                              if (!field?.id || !field?.name || !field?.type) return null;
                              
                              return (
                                <div key={field.id} className="space-y-3">
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
                      <button type="submit" className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] shadow-xl hover:bg-[#A3E635] transition-all active:scale-95">{t('add_info')}</button>
                      <button type="button" onClick={handleCloseModal} className="w-full py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors">{t('cancel')}</button>
                   </div>
                </form>
              )}
           </aside>
        </>
      )}

      {/* Detail Overlay - reuse existing logic or simplify if needed */}
      {viewDetailId && detailedProduct && (
        <div className="center-modal-overlay animate-in fade-in duration-300" onClick={() => setViewDetailId(null)}>
           <div className="center-modal-container animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
                 <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg">{detailedProduct?.brand || '未知品牌'}</div>
                    <div className="h-4 w-px bg-white/10"></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-xs">{detailedProduct?.model || '未命名产品'}</span>
                 </div>
                 <div className="flex items-center gap-3">
                    {canEdit && (
                      <button onClick={() => { setEditingId(detailedProduct?.id); setFormData({...detailedProduct}); setViewDetailId(null); }} className="p-3 bg-white/5 text-slate-400 hover:text-[#A3E635] rounded-xl transition-all border border-white/5"><Edit2 size={18} /></button>
                    )}
                    <button onClick={() => setViewDetailId(null)} className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5"><X size={18} /></button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-5 aspect-square bg-slate-950 rounded-[2.5rem] p-8 border border-white/5 shadow-inner flex items-center justify-center">
                       {detailedProduct?.mainImage ? <img src={detailedProduct.mainImage} className="max-w-full max-h-full object-contain" /> : <Package size={64} className="text-slate-800" />}
                    </div>
                    <div className="lg:col-span-7 space-y-10">
                       <div className="grid grid-cols-2 gap-8 border-b border-white/5 pb-10">
                          <div>
                             <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">{t('price')}</p>
                             <p className="text-4xl font-black text-white italic font-num">¥{(Number(detailedProduct?.price) || 0).toLocaleString()}</p>
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">{t('volume')}</p>
                             <p className="text-4xl font-black text-[#A3E635] font-num">{(Number(detailedProduct?.monthlySales) || 0).toLocaleString()}</p>
                          </div>
                       </div>
                       <div className="space-y-6">
                          {Object.entries(detailedProduct || {}).map(([key, val]) => {
                             if (['id', 'categoryId', 'createdAt', 'updatedAt', 'updatedBy', 'mainImage', 'price', 'monthlySales', 'model', 'brand', 'channel'].includes(key)) return null;
                             if (!val) return null;
                             return (
                               <div key={key} className="space-y-1.5 text-left">
                                  <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">{key}</p>
                                  <div className="text-[11px] font-medium text-slate-300 leading-relaxed normal-case bg-white/5 p-4 rounded-2xl border border-white/5">
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
              显示 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)} / {filteredProducts.length} 条
            </span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-white outline-none"
            >
              <option value={10}>10 条/页</option>
              <option value={20}>20 条/页</option>
              <option value={50}>50 条/页</option>
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
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                    {selectedProduct.brand} {selectedProduct.model}
                  </h2>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">
                    竞品情报详情
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
                    {selectedProduct?.attributes?.mainImage ? (
                      <img src={selectedProduct.attributes.mainImage} className="w-full h-full object-contain p-4" alt="" />
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
                      <h4 className="text-[12px] font-black uppercase tracking-widest text-white">产品基础信息</h4>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Basic Product Information</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">产品ID</span>
                        <span className="text-[10px] font-black text-white">{selectedProduct.id}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">品类ID</span>
                        <span className="text-[10px] font-black text-white">{selectedProduct.categoryId || '未设置'}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">创建时间</span>
                        <span className="text-[10px] font-black text-white">
                          {selectedProduct.createdAt ? new Date(selectedProduct.createdAt).toLocaleDateString() : '未知'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">更新时间</span>
                        <span className="text-[10px] font-black text-white">
                          {selectedProduct.updatedAt ? new Date(selectedProduct.updatedAt).toLocaleDateString() : '未知'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">更新者</span>
                        <span className="text-[10px] font-black text-white">{selectedProduct.updatedBy || '未知'}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">主图</span>
                        <span className="text-[10px] font-black text-white truncate max-w-[150px]">
                          {selectedProduct?.attributes?.main_image ? '已设置' : '未设置'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="premium-card p-6 border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Globe size={16} className="text-slate-500" />
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">渠道</span>
                    </div>
                    <p className="text-lg font-black text-white">{selectedProduct.channel || '未知'}</p>
                  </div>
                  
                  <div className="premium-card p-6 border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Star size={16} className="text-yellow-500" />
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">评分</span>
                    </div>
                    <p className="text-lg font-black text-white">{selectedProduct.rating || '0.0'}</p>
                  </div>
                  
                  <div className="premium-card p-6 border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap size={16} className="text-green-500" />
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">价格</span>
                    </div>
                    <p className="text-lg font-black text-white">¥{(Number(selectedProduct.price) || 0).toLocaleString()}</p>
                  </div>
                  
                  <div className="premium-card p-6 border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Package size={16} className="text-blue-500" />
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">月销量</span>
                    </div>
                    <p className="text-lg font-black text-white">{(Number(selectedProduct.monthlySales) || 0).toLocaleString()}</p>
                  </div>
                </div>
                
                {/* 参数卡片 - 硬核参数 */}
                {(selectedProduct?.attributes?.capacity_mah || selectedProduct?.attributes?.weight_g || selectedProduct?.attributes?.interfaces) && (
                  <div className="premium-card p-8 border-cyan-500/30 bg-cyan-950/20">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="size-10 bg-cyan-600 rounded-xl flex items-center justify-center text-white">
                        <Package size={20} />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-white">硬核参数</h4>
                        <p className="text-[8px] font-black text-cyan-400 uppercase tracking-widest mt-1 italic">Technical Specifications</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {selectedProduct?.attributes?.capacity_mah && (
                        <div className="text-center">
                          <div className="text-2xl font-black text-cyan-400">{selectedProduct.attributes.capacity_mah}</div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">mAh 容量</div>
                        </div>
                      )}
                      {selectedProduct?.attributes?.weight_g && (
                        <div className="text-center">
                          <div className="text-2xl font-black text-cyan-400">{selectedProduct.attributes.weight_g}</div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">克 重量</div>
                        </div>
                      )}
                      {selectedProduct?.attributes?.interfaces && (
                        <div className="text-center">
                          <div className="text-lg font-black text-cyan-400">{selectedProduct.attributes.interfaces}</div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">接口规格</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Marketing Messages - 卖点 */}
                {selectedProduct?.attributes?.selling_points && Array.isArray(selectedProduct.attributes.selling_points) && selectedProduct.attributes.selling_points.length > 0 && (
                  <div className="premium-card p-8 border-blue-500/30 bg-blue-950/20">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                        <Star size={20} />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-white">Marketing Messages</h4>
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mt-1 italic">卖点亮点</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {selectedProduct.attributes.selling_points.map((point: string, index: number) => (
                        <div key={index} className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                          <Zap size={12} className="text-blue-400" />
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Voice of Customer - 口碑对比 */}
                <div className="premium-card p-8 border-white/10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="size-10 bg-gradient-to-r from-green-500 to-red-500 rounded-xl flex items-center justify-center text-white">
                      <ThumbsUp size={20} />
                    </div>
                    <div>
                      <h4 className="text-[12px] font-black uppercase tracking-widest text-white">Voice of Customer</h4>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">口碑对比分析</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 好评 */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <ThumbsUp size={16} className="text-green-400" />
                        </div>
                        <h5 className="text-[10px] font-black text-green-400 uppercase tracking-widest">好评 Pros</h5>
                      </div>
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                        <p className="text-[11px] font-medium text-green-300 leading-relaxed">
                          {selectedProduct?.attributes?.pros || (
                            <span className="text-green-400/50 italic">暂无好评数据</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {/* 差评 */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <ThumbsDown size={16} className="text-red-400" />
                        </div>
                        <h5 className="text-[10px] font-black text-red-400 uppercase tracking-widest">差评 Cons</h5>
                      </div>
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                        <p className="text-[11px] font-bold text-red-300 leading-relaxed">
                          {selectedProduct?.attributes?.cons ? (
                            <>
                              {selectedProduct.attributes.cons.includes('99%') ? (
                                <><span className="text-red-200 font-black text-lg">「{selectedProduct.attributes.cons}」</span><br/><span className="text-red-400 text-[9px] mt-2 block">⚠️ 典型痛点案例</span></>
                              ) : (
                                selectedProduct.attributes.cons
                              )}
                            </>
                          ) : (
                            <span className="text-red-400/50 italic">暂无差评数据</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 关键痛点 - 特别突出 */}
                {selectedProduct?.attributes?.raw_review && (
                  <div className="premium-card p-8 border-red-500/50 bg-red-950/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                      <AlertTriangle size={80} className="text-red-400" />
                    </div>
                    <div className="flex items-start gap-4 mb-6">
                      <div className="size-10 bg-red-600 rounded-xl flex items-center justify-center text-white flex-shrink-0 mt-1">
                        <AlertTriangle size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-red-400">⚠️ 关键痛点</h4>
                        <p className="text-[8px] font-black text-red-600 uppercase tracking-widest mt-1 italic">Critical Customer Pain Point</p>
                      </div>
                    </div>
                    <div className="p-6 bg-red-500/10 border-2 border-red-500/30 rounded-2xl">
                      <p className="text-[13px] font-black text-red-200 leading-relaxed">
                        "{selectedProduct.attributes.raw_review}"
                      </p>
                      {selectedProduct.attributes.raw_review.includes('99%') && (
                        <div className="mt-3 text-red-400 text-[9px] font-black uppercase tracking-widest">
                          ⚠️ 高频痛点 - 需重点关注
                        </div>
                      )}
                      {selectedProduct.attributes.raw_review.includes('点滅') && (
                        <div className="mt-3 text-red-400 text-[9px] font-black uppercase tracking-widest">
                          ⚠️ 闪烁问题 - 关键缺陷
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 贾维斯洞察 */}
                {selectedProduct?.attributes?.insight_summary && (
                  <div className="premium-card p-10 border-purple-500/30 bg-purple-950/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Brain size={100} className="text-purple-400" />
                    </div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="size-10 bg-purple-600 rounded-xl flex items-center justify-center text-white">
                        <Brain size={20} />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-white">贾维斯洞察</h4>
                        <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mt-1 italic">Market Opportunity Analysis</p>
                      </div>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <div className="text-purple-300 text-sm leading-relaxed whitespace-pre-wrap italic font-medium">
                        {selectedProduct.attributes.insight_summary}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 外部链接 - 醒目按钮 */}
                {selectedProduct?.attributes?.link_url && (
                  <div className="premium-card p-6 border-white/10">
                    <a
                      href={selectedProduct.attributes.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 border border-blue-500/30 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3"
                    >
                      <ExternalLink size={18} />
                      前往源链接
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
                    {isAiAnalyzing ? 'AI 分析中...' : 'AI 单品深度分析'}
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
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-white">AI 单品深度分析</h4>
                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-1 italic">Generated via Gemini Node</p>
                      </div>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap italic font-medium">
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
                    {isCompetitorAnalyzing ? 'AI 分析中...' : 'AI 竞品对策'}
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
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-white">AI 竞品对策</h4>
                        <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest mt-1 italic">Competitor Counter Strategy</p>
                      </div>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap italic font-medium">
                        {competitorAnalysis}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 完整字段展示 - 所有 attributes数据 */}
                {selectedProduct?.attributes && Object.keys(selectedProduct.attributes).length > 0 && (
                  <div className="premium-card p-8 border-white/10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="size-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                        <Database size={20} />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-white">完整数据档案</h4>
                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-1 italic">Complete Data Profile</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {Object.entries(selectedProduct.attributes).map(([key, value]) => {
                        // 跳过已经在上面展示的字段
                        if (['main_image', 'link_url', 'selling_points', 'pros', 'cons', 'raw_review', 'insight_summary', 'capacity_mah', 'weight_g', 'interfaces'].includes(key)) {
                          return null;
                        }
                        
                        return (
                          <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-900/50 rounded-xl border border-white/5">
                            <div className="md:col-span-1">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{key}</span>
                            </div>
                            <div className="md:col-span-2">
                              {typeof value === 'object' ? (
                                <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              ) : (
                                <p className="text-[11px] text-slate-300 font-medium">
                                  {String(value)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-white">编辑产品信息</h4>
                        <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest mt-1 italic">Edit Product Information</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">品牌</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                          value={editFormData.brand || ''}
                          onChange={e => setEditFormData({...editFormData, brand: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">型号</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                          value={editFormData.model || ''}
                          onChange={e => setEditFormData({...editFormData, model: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">渠道</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                          value={editFormData.channel || ''}
                          onChange={e => setEditFormData({...editFormData, channel: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">价格</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                          value={editFormData.price || ''}
                          onChange={e => setEditFormData({...editFormData, price: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">评分</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                          value={editFormData.rating || ''}
                          onChange={e => setEditFormData({...editFormData, rating: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">月销量</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                          value={editFormData.monthlySales || ''}
                          onChange={e => setEditFormData({...editFormData, monthlySales: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">产品链接</label>
                        <input 
                          type="url" 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                          value={editFormData.linkUrl || ''}
                          onChange={e => setEditFormData({...editFormData, linkUrl: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">主图链接</label>
                        <input 
                          type="url" 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                          value={editFormData.mainImage || ''}
                          onChange={e => setEditFormData({...editFormData, mainImage: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">卖点（用逗号分隔）</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner" 
                          value={Array.isArray(editFormData.sellingPoints) ? editFormData.sellingPoints.join(', ') : editFormData.sellingPoints || ''}
                          onChange={e => setEditFormData({...editFormData, sellingPoints: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                        />
                      </div>
                      
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">好评</label>
                        <textarea 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner resize-none" 
                          rows={3}
                          value={editFormData.pros || ''}
                          onChange={e => setEditFormData({...editFormData, pros: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">差评</label>
                        <textarea 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner resize-none" 
                          rows={3}
                          value={editFormData.cons || ''}
                          onChange={e => setEditFormData({...editFormData, cons: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">关键痛点</label>
                        <textarea 
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-orange-500/40 transition-all shadow-inner resize-none" 
                          rows={2}
                          value={editFormData.rawReview || ''}
                          onChange={e => setEditFormData({...editFormData, rawReview: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">市场洞察</label>
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
                      修改
                    </button>
                  )}
                  
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteProduct(selectedProduct.id, `${selectedProduct.brand} ${selectedProduct.model}`)}
                      className="flex-1 bg-red-600 border border-red-500/30 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-3"
                    >
                      <Trash2 size={18} />
                      删除
                    </button>
                  )}
                  
                  <button
                    onClick={handleCloseDrawer}
                    className="flex-1 bg-slate-900 border border-white/10 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
                  >
                    <X size={18} />
                    关闭
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
                      保存修改
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
