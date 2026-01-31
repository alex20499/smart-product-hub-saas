
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Zap, TrendingUp, BarChart3, PieChart as PieIcon, 
  ShoppingCart, Award, DollarSign, Globe, Layers,
  ChevronDown, Sparkles, RefreshCw, MessageSquare, 
  Target, Activity, SlidersHorizontal, Table as TableIcon,
  Tag, Percent, Info, ExternalLink, ArrowRight, Star,
  Search, Eye, ChevronRight, LayoutGrid, Package, Layout,
  ArrowLeft, Calendar, ShieldCheck, Database, Lock, Trophy,
  ThumbsUp, ThumbsDown, AlertTriangle, Brain
} from 'lucide-react';
import { ProductData, Category, FieldType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, LineChart, Line, CartesianGrid, ScatterChart, Scatter, ZAxis
} from 'recharts';

interface DashboardProps {
  products: ProductData[];
  categories: Category[];
  t: (key: string) => string;
}

const SafeChartContainer: React.FC<{ children: React.ReactNode; height?: number | string }> = ({ children, height = 300 }) => {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true);
    }, 250);
    return () => {
      clearTimeout(timer);
      setReady(false);
    };
  }, []);

  return (
    <div 
      className="chart-container relative w-full h-full min-w-0 min-h-0 overflow-hidden flex flex-col" 
      style={{ height, minHeight: typeof height === 'number' ? height : undefined }}
    >
      {ready ? children : (
        <div className="w-full h-full flex items-center justify-center bg-slate-900/10 rounded-[2.5rem]">
          <div className="w-6 h-6 border-2 border-white/5 border-t-[#A3E635] rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ products = [], categories = [], t }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [visibleProducts, setVisibleProducts] = useState(5);
  
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [globalAiAnalysis, setGlobalAiAnalysis] = useState<string | null>(null);
  const [isGlobalAnalyzing, setIsGlobalAnalyzing] = useState(false);

  const channels = useMemo(() => Array.from(new Set(products.map(p => p?.channel).filter(Boolean))).sort(), [products]);
  const brands = useMemo(() => Array.from(new Set(products.map(p => p?.brand).filter(Boolean))).sort(), [products]);

  const isAiReady = useMemo(() => selectedCategory !== 'all' && selectedChannel !== 'all', [selectedCategory, selectedChannel]);

  const marketData = useMemo(() => {
    let data = Array.isArray(products) ? [...products] : [];
    if (selectedCategory !== 'all') data = data.filter(p => p?.categoryId === selectedCategory);
    if (selectedChannel !== 'all') data = data.filter(p => p?.channel === selectedChannel);
    
    return data.map(p => ({
      ...p,
      price: Number(p?.price) || 0,
      monthlySales: Number(p?.monthlySales) || 0
    }));
  }, [products, selectedCategory, selectedChannel]);

  const focusData = useMemo(() => {
    let data = [...marketData];
    if (selectedBrand !== 'all') data = data.filter(p => p?.brand === selectedBrand);
    return data;
  }, [marketData, selectedBrand]);

  const marketBasics = useMemo(() => {
    const totalSales = marketData.reduce((acc, curr) => acc + (curr?.monthlySales || 0), 0);
    const totalRev = marketData.reduce((acc, curr) => acc + ((curr?.price || 0) * (curr?.monthlySales || 0)), 0);
    const avgPrice = totalSales > 0 ? totalRev / totalSales : 0;
    return { totalSales, avgPrice };
  }, [marketData]);

  const tacticalMetrics = useMemo(() => {
    const segmentSales = focusData.reduce((acc, curr) => acc + (curr?.monthlySales || 0), 0);
    const segmentRev = focusData.reduce((acc, curr) => acc + ((curr?.price || 0) * (curr?.monthlySales || 0)), 0);
    const segmentAvgPrice = segmentSales > 0 ? segmentRev / segmentSales : 0;
    const marketShare = marketBasics.totalSales > 0 ? (segmentSales / marketBasics.totalSales) * 100 : 0;
    const priceIndex = marketBasics.avgPrice > 0 ? (segmentAvgPrice / marketBasics.avgPrice) * 100 : 100;
    return { segmentSales, marketShare, priceIndex };
  }, [focusData, marketBasics]);

  const brandShareData = useMemo(() => {
    const brandMap = new Map<string, number>();
    marketData.forEach(p => {
      const bName = p?.brand || 'Unknown';
      brandMap.set(bName, (brandMap.get(bName) || 0) + (p?.monthlySales || 0));
    });
    return Array.from(brandMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [marketData]);

  const sortedLeaderboard = useMemo(() => {
    return [...marketData].sort((a, b) => (b?.monthlySales || 0) - (a?.monthlySales || 0));
  }, [marketData]);

  const COLORS = ['#A3E635', '#818CF8', '#FB923C', '#38BDF8', '#F472B6', '#2DD4BF'];

  const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? 'start' : 'end';
    if (percent < 0.02) return null;
    return (
      <text x={x} y={y} fill="#94A3B8" textAnchor={textAnchor} dominantBaseline="central" className="text-[9px] font-black uppercase tracking-tighter">
        {`${name}: ${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  const handleMarketAIAnalysis = async () => {
    if (!isAiReady) return;
    setIsGlobalAnalyzing(true);
    setGlobalAiAnalysis(null);
    const apiKey = "AIzaSyC0KhY_VWsw1RR0avGka_m5EJw7vCr8ROs";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    try {
      const marketContext = {
        category: categories.find(c => c.id === selectedCategory)?.name,
        channel: selectedChannel,
        skusCount: marketData.length,
        topBrands: brandShareData.slice(0, 3).map(b => b.name),
        avgPrice: marketBasics.avgPrice
      };
      const prompt = `你是一位电商战略分析官。基于以下市场大盘快照进行分析，预测竞争激烈程度并给出3条关键建议：${JSON.stringify(marketContext)}。请使用${t('category')}对应的语言回答，保持专业精炼。`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      setGlobalAiAnalysis(data.candidates[0].content.parts[0].text);
    } catch (error) { 
      console.error('Gemini API Error Detail:', error); 
      setGlobalAiAnalysis("AI 分析节点受阻，原因：" + (error instanceof Error ? error.message : "未知错误")); 
    } finally { 
      setIsGlobalAnalyzing(false); 
    } 
  };

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-slate-950/98 backdrop-blur-2xl border border-white/10 p-5 rounded-[2rem] shadow-2xl text-left min-w-[200px]">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">{p.brand || 'N/A'} | {p.model || 'N/A'}</p>
          <div className="space-y-1 mt-2">
            <p className="text-[10px] font-black text-white flex justify-between"><span>{t('price')}:</span> <span>¥{(p?.price || 0).toLocaleString()}</span></p>
            <p className="text-[10px] font-black text-[#A3E635] flex justify-between"><span>{t('sales')}:</span> <span>{(p?.monthlySales || 0).toLocaleString()}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  const detailedProduct = products.find(p => p.id === activeDetailId);
  const detailedCategory = categories.find(c => c.id === detailedProduct?.categoryId);

  return (
    <div className="space-y-12 lg:space-y-16 pb-40 max-w-[1500px] mx-auto animate-in fade-in duration-1000">
      {/* 顶部控制塔 */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 lg:gap-8">
        <div className="text-left space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-[#A3E635] rounded-2xl flex items-center justify-center text-slate-950 shadow-[0_0_30_px_rgba(163,230,53,0.3)]">
               <Activity size={20} />
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase text-white leading-none italic">{t('market_intel')}</h2>
          </div>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">{t('benchmarking_protocol')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:gap-4 no-print">
          <div className="relative group">
            <Layout size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-[#A3E635] transition-colors" />
            <select 
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setVisibleProducts(5); setGlobalAiAnalysis(null); }}
              className="bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-10 py-3 lg:py-4 text-[10px] lg:text-[11px] font-black uppercase text-white tracking-widest outline-none focus:border-[#A3E635]/40 appearance-none min-w-[140px] lg:min-w-[160px] cursor-pointer"
            >
              <option value="all">{t('category')}</option>
              {categories.map(c => c?.id && c?.name ? <option key={c.id} value={c.id}>{c.name}</option> : null)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          </div>

          <div className="relative group">
            <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-[#A3E635] transition-colors" />
            <select 
              value={selectedChannel}
              onChange={(e) => { setSelectedChannel(e.target.value); setVisibleProducts(5); setGlobalAiAnalysis(null); }}
              className="bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-10 py-3 lg:py-4 text-[10px] lg:text-[11px] font-black uppercase text-white tracking-widest outline-none focus:border-[#A3E635]/40 appearance-none min-w-[140px] lg:min-w-[160px] cursor-pointer"
            >
              <option value="all">{t('global_channels')}</option>
              {channels.map(ch => ch ? <option key={ch} value={ch}>{ch}</option> : null)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          </div>

          <div className="relative group">
            <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-[#818CF8] transition-colors" />
            <select 
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-10 py-4 text-[10px] font-black uppercase text-white tracking-widest outline-none focus:border-[#818CF8]/40 appearance-none min-w-[160px] cursor-pointer"
            >
              <option value="all">{t('all_brands')}</option>
              {brands.map(b => b ? <option key={b} value={b}>{b}</option> : null)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* AI 市场分析面板 */}
      <div className={`premium-card p-6 lg:p-10 border-dashed border-2 transition-all duration-700 ${isAiReady ? 'border-[#A3E635]/30 bg-[#A3E635]/5 shadow-[0_0_50px_rgba(163,230,53,0.05)]' : 'border-white/5 bg-slate-900/20'}`}>
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-5 text-left">
               <div className={`size-14 rounded-2xl flex items-center justify-center transition-all ${isAiReady ? 'bg-[#A3E635] text-slate-950 shadow-[0_0_30px_rgba(163,230,53,0.3)]' : 'bg-slate-800 text-slate-600'}`}>
                  {isAiReady ? <Sparkles size={24} /> : <Lock size={24} />}
               </div>
               <div>
                  <h4 className="text-[13px] font-black uppercase text-white tracking-widest flex items-center gap-2">
                     {t('ai_insights')}
                     {!isAiReady && <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] rounded-md border border-red-500/20 animate-pulse">{t('cancel')}</span>}
                     {isAiReady && <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[9px] rounded-md border border-green-500/20">✓ 就绪</span>}
                  </h4>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isAiReady ? 'text-[#A3E635]' : 'text-slate-600'}`}>
                     {isAiReady ? t('ai_ready') : t('ai_lock_hint')}
                  </p>
               </div>
            </div>
            
            <button 
              onClick={handleMarketAIAnalysis}
              disabled={!isAiReady || isGlobalAnalyzing}
              className={`px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3 shadow-lg ${isAiReady ? 'bg-white text-slate-950 hover:bg-[#A3E635] hover:shadow-[#A3E635]/25' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
            >
               {isGlobalAnalyzing ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
               {t('generate_insight')}
            </button>
         </div>

         {globalAiAnalysis && (
           <div className="mt-10 p-6 lg:p-8 bg-slate-950/50 rounded-[2.5rem] border border-white/5 animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3 mb-6 text-[#A3E635]">
                 <MessageSquare size={16} />
                 <p className="text-[11px] font-black uppercase tracking-widest">{t('ai_analysis')}</p>
                 <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[9px] rounded-md border border-green-500/20">✓ 完成</span>
              </div>
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap italic font-medium text-left">
                 {globalAiAnalysis}
              </div>
           </div>
         )}
      </div>

      {/* 核心卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
          <div className="premium-card p-10 flex flex-col justify-between min-h-[220px] bg-slate-900/40 border-white/5 text-left group">
             <div className="flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity"><Percent size={20} /> <span className="text-[9px] font-black uppercase tracking-widest">{t('market_penetration')}</span></div>
             <div>
                <h3 className="text-4xl lg:text-6xl font-black tracking-tighter text-white font-num">{tacticalMetrics.marketShare.toFixed(1)}%</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mt-4 leading-relaxed uppercase">{t('market_share')}</p>
             </div>
          </div>
          <div className="premium-card p-10 flex flex-col justify-between min-h-[220px] border-[#A3E635]/20 text-left group">
             <div className="flex items-center justify-between text-[#A3E635]"><ShoppingCart size={20} /> <span className="text-[9px] font-black uppercase tracking-widest">{t('price_competitiveness')}</span></div>
             <div>
                <h3 className="text-4xl lg:text-6xl font-black tracking-tighter text-white font-num">{Math.round(tacticalMetrics.priceIndex)}<span className="text-xl ml-2 text-slate-500 uppercase">Index</span></h3>
                <div className="flex items-center gap-2 mt-4">
                   <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${tacticalMetrics.priceIndex > 100 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                      {tacticalMetrics.priceIndex > 100 ? 'PREMIUM POS' : 'BUDGET POS'}
                   </div>
                   <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{t('vs_global_avg')}</p>
                </div>
             </div>
          </div>
          <div className="premium-card p-10 flex flex-col justify-between min-h-[220px] border-[#818CF8]/20 text-left group">
             <div className="flex items-center justify-between text-[#818CF8]"><TrendingUp size={20} /> <span className="text-[9px] font-black uppercase tracking-widest">{t('segment_volume')}</span></div>
             <div>
                <h3 className="text-4xl lg:text-6xl font-black tracking-tighter text-white font-num">{tacticalMetrics.segmentSales.toLocaleString()}</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mt-4 italic font-bold">UNITS EXECUTED IN CURRENT VIEW</p>
             </div>
          </div>
      </div>

      {/* 图表展示 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative">
          <div className="lg:col-span-7 premium-card p-10 lg:p-14 text-left border-white/5 min-w-0 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-12">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-[#FB923C] shadow-inner"><Target size={18} /></div>
                    <div>
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('price_vs_sales')}</h4>
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">Price vs Sales Volume Matrix</p>
                    </div>
                 </div>
              </div>
              {marketData.length > 0 ? (
                <SafeChartContainer height={420}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                        <XAxis type="number" dataKey="price" name={t('price')} unit="¥" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 900}} />
                        <YAxis type="number" dataKey="monthlySales" name={t('sales')} unit="" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 900}} />
                        <ZAxis type="number" dataKey="monthlySales" range={[150, 2500]} />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Market" data={marketData}>
                          {marketData.map((entry, index) => entry?.id ? (
                            <Cell key={`cell-${index}`} fill={entry?.brand === selectedBrand ? '#A3E635' : COLORS[index % COLORS.length]} fillOpacity={entry?.brand === selectedBrand ? 1 : 0.4} stroke={entry?.brand === selectedBrand ? '#fff' : 'none'} strokeWidth={2} />
                          ) : null)}
                        </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </SafeChartContainer>
              ) : (
                <div className="h-[420px] flex flex-col items-center justify-center text-slate-700 space-y-4">
                   <Layers size={40} className="opacity-20" />
                   <p className="text-[10px] font-black uppercase tracking-widest">{t('no_data')}</p>
                </div>
              )}
          </div>

          <div className="lg:col-span-5 premium-card p-10 lg:p-14 text-left border-white/5 flex flex-col min-w-0 overflow-hidden">
              <div className="flex items-center justify-between mb-12">
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('category_share')}</h4>
                  <PieIcon size={18} className="text-slate-800" />
              </div>
              <div className="flex-1 min-h-[400px] mt-4">
                {brandShareData.length > 0 ? (
                  <SafeChartContainer height="100%">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                          <Pie
                            data={brandShareData}
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                            nameKey="name"
                            isAnimationActive={false}
                            label={renderCustomizedPieLabel}
                            labelLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                          >
                            {brandShareData.map((entry, index) => entry?.name ? (
                              <Cell key={`cell-${index}`} fill={entry.name === selectedBrand ? '#A3E635' : COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                            ) : null)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                  </SafeChartContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4">
                     <PieIcon size={40} className="opacity-20" />
                     <p className="text-[10px] font-black uppercase tracking-widest">{t('no_data')}</p>
                  </div>
                )}
              </div>
          </div>
      </div>

      {/* 排行榜 */}
      <div className="space-y-8 text-left">
          <div className="flex items-center justify-between px-6">
             <div className="flex items-center gap-4">
               <div className="size-10 bg-slate-900 rounded-xl flex items-center justify-center text-indigo-400 border border-white/5"><TableIcon size={18} /></div>
               <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">{t('leaderboard')}</h3>
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">{t('ranking_velocity')}</p>
               </div>
             </div>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{marketData.length} {t('skus_tracked')}</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
             {sortedLeaderboard.slice(0, visibleProducts).map((product, idx) => product?.id ? (
               <div 
                 key={product.id} 
                 onClick={() => { setActiveDetailId(product.id); setAiAnalysis(null); }}
                 className={`premium-card p-6 lg:px-10 flex flex-col sm:flex-row items-center gap-8 group cursor-pointer border-white/5 hover:bg-slate-900/40 transition-all animate-in slide-in-from-bottom-2 ${product?.brand === selectedBrand ? 'border-[#A3E635]/30 bg-[#A3E635]/5' : ''}`}
                 style={{ animationDelay: `${idx * 50}ms` }}
               >
                  <div className="flex items-center gap-8 flex-1 w-full">
                     <div className="text-2xl font-black text-slate-800 font-num italic w-10 group-hover:text-[#A3E635] transition-colors">#{idx + 1}</div>
                     <div className="size-16 bg-slate-950 rounded-2xl overflow-hidden p-2 border border-white/5 shrink-0">
                        {product?.mainImage ? <img src={product.mainImage} className="w-full h-full object-contain" alt="" /> : <Package className="text-slate-800 size-full" />}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-[9px] font-black text-[#818CF8] uppercase tracking-widest">{product?.brand || '未知品牌'}</span>
                           <span className="text-[9px] font-bold text-slate-600 uppercase px-2 py-0.5 bg-slate-950 rounded-md border border-white/5">{product?.channel || '未知渠道'}</span>
                        </div>
                        <h4 className="text-sm font-black text-white uppercase truncate group-hover:text-[#A3E635] transition-colors">{product?.model || '未命名产品'}</h4>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-12 shrink-0">
                     <div className="text-right space-y-1">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{t('market_value')}</p>
                        <p className="text-lg font-black text-white italic font-num">¥{(Number(product?.price) || 0).toLocaleString()}</p>
                     </div>
                     <div className="text-right space-y-1">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{t('velocity')}</p>
                        <p className="text-lg font-black text-[#A3E635] font-num">{(Number(product?.monthlySales) || 0).toLocaleString()} <span className="text-[10px] ml-1 uppercase">{t('units')}</span></p>
                     </div>
                     <div className="size-12 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-600 group-hover:text-white group-hover:bg-[#A3E635] transition-all">
                        <ChevronRight size={20} />
                     </div>
                  </div>
               </div>
             ) : null)}
          </div>

          {marketData.length > visibleProducts && (
            <div className="flex justify-center pt-8">
               <button 
                 onClick={() => setVisibleProducts(prev => prev + 5)}
                 className="flex items-center gap-4 px-12 py-5 bg-slate-900 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white hover:border-[#A3E635]/30 transition-all active:scale-95 group"
               >
                  <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
                  {t('expand_waterfall')}
               </button>
            </div>
          )}
      </div>

      {/* 详情页弹窗 */}
      {activeDetailId && detailedProduct && (
        <div className="detail-modal-overlay animate-in fade-in duration-500" onClick={() => setActiveDetailId(null)}>
           <div className="detail-modal-container open animate-in slide-in-from-right duration-500" onClick={(e) => e.stopPropagation()}>
              <div className="detail-modal-header">
                <button onClick={() => setActiveDetailId(null)} className="flex items-center gap-4 text-slate-500 hover:text-white transition-all group">
                   <ArrowLeft size={24} className="text-[#A3E635]" />
                   <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t('close')}</span>
                </button>
              </div>

              <div className="detail-modal-content space-y-16 text-left pb-32">
                 <div className="flex flex-col md:flex-row gap-12 items-start">
                    <div className="w-full md:w-80 aspect-square bg-slate-950 rounded-[3rem] p-8 border border-white/5 shadow-2xl flex items-center justify-center shrink-0">
                       {detailedProduct?.attributes?.mainImage ? (
                         <img src={detailedProduct.attributes.mainImage} className="w-full h-full object-contain" alt="" />
                       ) : (
                         <Package size={60} className="text-slate-800" />
                       )}
                    </div>
                    <div className="flex-1 space-y-6">
                       <div className="flex items-center gap-3">
                          <div className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2">
                             <Globe size={10} /> {detailedProduct?.channel || '未知渠道'}
                          </div>
                          <div className="px-4 py-1.5 bg-slate-800 border border-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2">
                             <Tag size={10} /> {detailedProduct?.brand || '未知品牌'}
                          </div>
                          <div className="px-4 py-1.5 bg-[#A3E635]/10 border border-[#A3E635]/20 text-[#A3E635] text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2">
                             <Package size={10} /> {detailedCategory?.name || 'GENERIC'}
                          </div>
                       </div>
                       <h1 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter leading-tight">{detailedProduct?.model || '未命名产品'}</h1>
                       
                       <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-8">
                          <div className="space-y-2">
                             <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t('price')}</p>
                             <p className="text-3xl font-black text-white italic font-num">¥{(Number(detailedProduct?.price) || 0).toLocaleString()}</p>
                          </div>
                          <div className="space-y-2">
                             <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t('volume')}</p>
                             <p className="text-3xl font-black text-[#A3E635] font-num">{(Number(detailedProduct?.monthlySales) || 0).toLocaleString()} <span className="text-xs uppercase ml-1">{t('units')}</span></p>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* AI分析按钮 - 放在产品信息之后 */}
                 <div className="flex justify-center">
                    <button 
                      onClick={() => handleProductAIAnalysis(detailedProduct)} 
                      disabled={isAiAnalyzing}
                      className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                    >
                      {isAiAnalyzing ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />} 
                      {isAiAnalyzing ? t('analyzing') : t('ai_analysis_btn')}
                    </button>
                 </div>

                 {/* AI分析结果 */}
                 {aiAnalysis && (
                   <div className="premium-card p-10 border-indigo-500/30 bg-indigo-950/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={100} className="text-indigo-400" /></div>
                      <div className="flex items-center gap-4 mb-8">
                         <div className="size-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Sparkles size={20} /></div>
                         <div>
                            <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('ai_tactical_analysis')}</h4>
                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-1 italic">Generated via Gemini Node</p>
                         </div>
                      </div>
                      <div className="prose prose-invert max-w-none">
                         <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap italic font-medium">{aiAnalysis}</div>
                      </div>
                   </div>
                 )}

                 {/* 卖点区 - 蓝色药丸标签 */}
                 {detailedProduct?.attributes?.selling_points && Array.isArray(detailedProduct.attributes.selling_points) && detailedProduct.attributes.selling_points.length > 0 && (
                    <div className="premium-card p-8 border-blue-500/30 bg-blue-950/20">
                       <div className="flex items-center gap-4 mb-6">
                          <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Star size={20} /></div>
                          <div>
                             <h4 className="text-[12px] font-black uppercase tracking-widest text-white">核心卖点</h4>
                             <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mt-1 italic">Product Selling Points</p>
                          </div>
                       </div>
                       <div className="flex flex-wrap gap-3">
                          {detailedProduct.attributes.selling_points.map((point: string, index: number) => (
                             <div key={index} className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                                <Zap size={12} className="text-blue-400" />
                                {point}
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {/* 口碑对比卡片 */}
                 {(detailedProduct?.attributes?.pros || detailedProduct?.attributes?.cons) && (
                    <div className="premium-card p-8 border-white/10">
                       <div className="flex items-center gap-4 mb-6">
                          <div className="size-10 bg-gradient-to-r from-green-500 to-red-500 rounded-xl flex items-center justify-center text-white"><MessageSquare size={20} /></div>
                          <div>
                             <h4 className="text-[12px] font-black uppercase tracking-widest text-white">口碑对比</h4>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Customer Voice Analysis</p>
                          </div>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* 好评 - 绿色 */}
                          {detailedProduct?.attributes?.pros && (
                             <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                   <div className="size-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                      <ThumbsUp size={16} className="text-green-400" />
                                   </div>
                                   <h5 className="text-[10px] font-black text-green-400 uppercase tracking-widest">好评词云</h5>
                                </div>
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                                   <p className="text-[11px] text-green-300 leading-relaxed">{detailedProduct.attributes.pros}</p>
                                </div>
                             </div>
                          )}
                          {/* 差评 - 红色 */}
                          {detailedProduct?.attributes?.cons && (
                             <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                   <div className="size-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                                      <ThumbsDown size={16} className="text-red-400" />
                                   </div>
                                   <h5 className="text-[10px] font-black text-red-400 uppercase tracking-widest">差评词云</h5>
                                </div>
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                   <p className="text-[11px] text-red-300 leading-relaxed">{detailedProduct.attributes.cons}</p>
                                </div>
                             </div>
                          )}
                       </div>
                    </div>
                 )}

                 {/* 痛点高亮 - 警告框 */}
                 {detailedProduct?.attributes?.raw_review && (
                    <div className="premium-card p-8 border-red-500/50 bg-red-950/30 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-20"><AlertTriangle size={80} className="text-red-400" /></div>
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
                          <p className="text-[13px] font-bold text-red-300 leading-relaxed">"{detailedProduct.attributes.raw_review}"</p>
                       </div>
                    </div>
                 )}

                 {/* 贾维斯洞察 - 市场洞察 */}
                 {detailedProduct?.attributes?.insight_summary && (
                    <div className="premium-card p-10 border-purple-500/30 bg-purple-950/20 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-10"><Brain size={100} className="text-purple-400" /></div>
                       <div className="flex items-center gap-4 mb-8">
                          <div className="size-10 bg-purple-600 rounded-xl flex items-center justify-center text-white"><Brain size={20} /></div>
                          <div>
                             <h4 className="text-[12px] font-black uppercase tracking-widest text-white">贾维斯洞察</h4>
                             <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mt-1 italic">Market Opportunity Analysis</p>
                          </div>
                       </div>
                       <div className="prose prose-invert max-w-none">
                          <div className="text-purple-300 text-sm leading-relaxed whitespace-pre-wrap italic font-medium">{detailedProduct.attributes.insight_summary}</div>
                       </div>
                    </div>
                 )}
                 <div className="space-y-12">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                       <Database size={18} className="text-slate-500" />
                       <p className="text-[11px] font-black text-white uppercase tracking-[0.3em]">{t('full_node_data')}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {detailedCategory?.fields?.map(field => {
                         // 防崩溃：确保 field 和 detailedProduct 存在
                         if (!field?.id || !detailedProduct) return null;
                         const value = detailedProduct[field.id];
                         if (value === undefined || value === null || value === '') return null;
                         const isLongText = field.type === FieldType.TEXTAREA || field.type === FieldType.MULTI_SELECT_QUANTITY;
                         const isImage = field.type === FieldType.IMAGE;
                         
                         const isRanking = field.type === FieldType.NUMBER && (field.name.includes('排名') || field.name.toLowerCase().includes('rank'));
                         
                         return (
                           <div key={field.id} className={`p-8 bg-slate-900/40 rounded-[2.5rem] border border-white/5 space-y-4 hover:border-white/10 transition-colors ${isLongText || isImage ? 'md:col-span-2 lg:col-span-3' : ''}`}>
                              <div className="flex items-center gap-3 opacity-40">
                                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{field.name}</p>
                              </div>
                              {isImage ? (
                                <div className="w-full aspect-video bg-slate-950 rounded-[2rem] overflow-hidden border border-white/5 p-4 flex items-center justify-center relative">
                                   <img src={value} className="w-full h-full object-contain" alt="" />
                                </div>
                              ) : isRanking ? (
                                <div className="flex items-center gap-4">
                                   <div className="size-14 bg-[#A3E635] rounded-2xl flex items-center justify-center text-slate-950 shadow-[0_0_30px_rgba(163,230,53,0.4)]">
                                      <Trophy size={28} />
                                   </div>
                                   <p className="text-4xl font-black text-white italic font-num">#{value}</p>
                                </div>
                              ) : field.type === FieldType.URL ? (
                                <a href={String(value)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 px-6 py-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all group/link mt-2">
                                   <span className="text-[10px] font-black uppercase tracking-widest truncate flex-1">{String(value)}</span>
                                   <ExternalLink size={14} className="shrink-0" />
                                </a>
                              ) : field.type === FieldType.RATING ? (
                                <div className="flex items-center gap-2">
                                   {Array.from({length: 5}).map((_, i) => i !== null ? (
                                      <Star key={i} size={16} fill={i < Number(value) ? "#A3E635" : "transparent"} className={i < Number(value) ? "text-[#A3E635]" : "text-slate-800"} />
                                   ) : null)}
                                   <span className="ml-2 text-xl font-black text-white font-num">{value}</span>
                                </div>
                              ) : field.type === FieldType.MULTI_SELECT_QUANTITY ? (
                                <div className="flex flex-wrap gap-3">
                                   {Object.entries(value as Record<string, number>).map(([opt, qty]) => opt && qty !== null ? (
                                      <div key={opt} className="px-4 py-2 bg-slate-950 border border-white/5 rounded-xl flex items-center gap-3">
                                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{opt}</span>
                                         <span className="text-xs font-black text-[#A3E635] font-num italic">x {qty}</span>
                                      </div>
                                   ) : null)}
                                </div>
                              ) : (
                                <p className={`text-white uppercase leading-relaxed font-black tracking-tight ${isLongText ? 'text-sm font-medium normal-case text-slate-300' : 'text-lg italic font-num'}`}>
                                   {String(value)}
                                </p>
                              )}
                           </div>
                         );
                       })}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
