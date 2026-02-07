
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Zap, TrendingUp, PieChart as PieIcon, 
  ShoppingCart, Award, DollarSign, Globe, Layers,
  ChevronDown, RefreshCw, MessageSquare, 
  Target, Activity, SlidersHorizontal, Table as TableIcon,
  Tag, Percent, Info, ExternalLink, ArrowRight, Star,
  Search, Eye, ChevronRight, LayoutGrid, Package, Layout,
  ArrowLeft, Calendar, ShieldCheck, Database, Lock, Trophy,
  ThumbsUp, ThumbsDown, AlertTriangle, Brain, GitBranch
} from 'lucide-react';
import { ProductData, ProductField, Category, FieldType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, LineChart, Line, CartesianGrid, ScatterChart, Scatter, ZAxis,
  ReferenceLine, ReferenceArea
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
  const [leaderboardSort, setLeaderboardSort] = useState<'sales' | 'price' | 'rating'>('sales');
  
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const [flowHoverNodeId, setFlowHoverNodeId] = useState<string | null>(null);

  // 当产品列表变化且当前详情产品已不存在时，清空详情 ID（如被删除或同步后列表更新）
  useEffect(() => {
    if (activeDetailId && !products.some(p => p?.id === activeDetailId)) {
      setActiveDetailId(null);
    }
  }, [products, activeDetailId]);

  const channels = useMemo(() => Array.from(new Set(products.map(p => p?.channel).filter(Boolean))).sort(), [products]);

  // 优惠后价格优先：有 actualPrice（到手价/券后）则用，否则用 price；兼容从 attributes 读
  const getEffectivePrice = (p: ProductData) => {
    const raw = p?.actualPrice != null && p?.actualPrice !== '' ? p.actualPrice : p?.price;
    const v = raw != null && raw !== '' ? Number(raw) : Number((p as any)?.attributes?.actual_price ?? (p as any)?.attributes?.price ?? (p as any)?.price) || 0;
    return Number.isFinite(v) ? v : 0;
  };

  // 销量：优先表字段 monthlySales，兼容 monthly_sales / attributes，保证三块版块有数可算
  const getMonthlySales = (p: ProductData) => {
    const raw = p?.monthlySales ?? (p as any)?.monthly_sales ?? (p as any)?.attributes?.monthly_sales ?? (p as any)?.attributes?.monthlySales;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  };

  const marketData = useMemo(() => {
    let data = Array.isArray(products) ? [...products] : [];
    if (selectedCategory !== 'all') data = data.filter(p => p?.categoryId === selectedCategory);
    if (selectedChannel !== 'all') data = data.filter(p => p?.channel === selectedChannel);
    
    return data.map(p => {
      const effectivePrice = getEffectivePrice(p);
      const monthlySales = getMonthlySales(p);
      return {
        ...p,
        price: effectivePrice,
        monthlySales
      };
    });
  }, [products, selectedCategory, selectedChannel]);

  // 品牌列表基于当前品类+平台下的 marketData，保证选中的品牌一定在该细分内有数据，三块卡片才能正确联动
  const brands = useMemo(() => Array.from(new Set(marketData.map(p => p?.brand).filter(Boolean))).sort(), [marketData]);

  useEffect(() => {
    if (selectedBrand !== 'all' && (brands.length === 0 || !brands.includes(selectedBrand))) {
      setSelectedBrand('all');
    }
  }, [brands, selectedBrand]);

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

  const brandShareDataForPie = useMemo(() => {
    const maxTop = 8;
    if (brandShareData.length <= maxTop) return brandShareData;
    const top = brandShareData.slice(0, maxTop);
    const rest = brandShareData.slice(maxTop);
    const othersVal = rest.reduce((acc, r) => acc + r.value, 0);
    return [...top, { name: t('others'), value: othersVal }];
  }, [brandShareData, t]);

  const sortedLeaderboard = useMemo(() => {
    const data = [...marketData];
    if (leaderboardSort === 'sales') return data.sort((a, b) => (b?.monthlySales || 0) - (a?.monthlySales || 0));
    if (leaderboardSort === 'price') return data.sort((a, b) => (b?.price || 0) - (a?.price || 0));
    if (leaderboardSort === 'rating') return data.sort((a, b) => (Number(b?.rating) || 0) - (Number(a?.rating) || 0));
    return data;
  }, [marketData, leaderboardSort]);

  // 价格指数区间：以 100 为基准 → 入门 / 主流 / 中端 / 中高端 / 高端
  const SEGMENT_BANDS = [
    { key: 'segment_entry', x1: 0, x2: 80, fill: 'rgba(45,212,191,0.06)' },      // 入门
    { key: 'segment_mainstream', x1: 80, x2: 100, fill: 'rgba(163,230,53,0.06)' }, // 主流
    { key: 'segment_mid', x1: 100, x2: 120, fill: 'rgba(251,146,60,0.06)' },       // 中端
    { key: 'segment_mid_high', x1: 120, x2: 150, fill: 'rgba(129,140,248,0.08)' }, // 中高端
    { key: 'segment_high', x1: 150, x2: 400, fill: 'rgba(244,114,182,0.06)' }      // 高端
  ] as const;

  const getSegmentKey = (priceIndex: number): string => {
    if (priceIndex < 80) return 'segment_entry';
    if (priceIndex < 100) return 'segment_mainstream';
    if (priceIndex < 120) return 'segment_mid';
    if (priceIndex < 150) return 'segment_mid_high';
    return 'segment_high';
  };

  // 产品价格指数定位：同品类同平台下，每个产品一个点，X=价格指数(100=均价)，Y=销量，占位高端/中高端/中端/主流/入门
  const productPriceIndexData = useMemo(() => {
    if (marketData.length === 0) return [];
    const marketAvgPrice = marketBasics.avgPrice || 1;
    return marketData.map(p => {
      const price = p?.price || 0;
      const priceIndex = marketAvgPrice > 0 ? (price / marketAvgPrice) * 100 : 100;
      const idx = Math.round(priceIndex * 10) / 10;
      const segmentKey = getSegmentKey(idx);
      return {
        id: p?.id,
        name: p?.model || t('unnamed_product'),
        brand: p?.brand || t('unknown_brand'),
        priceIndex: idx,
        segmentKey,
        monthlySales: p?.monthlySales || 0,
        price: p?.price ?? 0
      };
    });
  }, [marketData, marketBasics, t]);

  // 渠道·品类对比：全渠道或单渠道下均按品类聚合，K 线展示价格区间与分位，保留多平台/单平台筛选
  const categoryComparisonData = useMemo(() => {
    if (marketData.length === 0) return [];
    const byCat = new Map<string, { sales: number; totalPrice: number; count: number; prices: number[] }>();
    for (const p of marketData) {
      const cid = p?.categoryId ?? 'unknown';
      const cur = byCat.get(cid) ?? { sales: 0, totalPrice: 0, count: 0, prices: [] };
      const price = p?.price ?? 0;
      cur.sales += p?.monthlySales ?? 0;
      cur.totalPrice += price * (p?.monthlySales ?? 0);
      cur.count += 1;
      cur.prices.push(price);
      byCat.set(cid, cur);
    }
    const quartile = (arr: number[], q: number) => {
      const s = [...arr].sort((a, b) => a - b);
      const i = (s.length - 1) * q;
      const lo = Math.floor(i);
      const hi = Math.ceil(i);
      return lo === hi ? s[lo]! : s[lo]! * (1 - (i - lo)) + s[hi]! * (i - lo);
    };
    const catList = Array.from(byCat.entries()).map(([categoryId, agg]) => {
      const name = categories.find(c => c.id === categoryId)?.name ?? categoryId;
      const avgPrice = agg.sales > 0 ? agg.totalPrice / agg.sales : 0;
      const prices = agg.prices.filter(Number.isFinite);
      const minPrice = prices.length ? Math.min(...prices) : avgPrice;
      const maxPrice = prices.length ? Math.max(...prices) : avgPrice;
      const open = prices.length > 1 ? quartile(prices, 0.25) : avgPrice;
      const close = prices.length > 1 ? quartile(prices, 0.75) : avgPrice;
      return { categoryId, name, sales: agg.sales, avgPrice, count: agg.count, minPrice, maxPrice, open, close };
    });
    return catList.sort((a, b) => b.sales - a.sales);
  }, [marketData, categories]);

  // 折扣力度：有 actualPrice 的产品算 (price - actualPrice)/price，按渠道求平均
  const discountByChannelData = useMemo(() => {
    let base = Array.isArray(products) ? [...products] : [];
    if (selectedCategory !== 'all') base = base.filter(p => p?.categoryId === selectedCategory);
    const withDiscount = base.filter(p => {
      const list = Number(p?.price);
      const actual = p?.actualPrice != null && p?.actualPrice !== '' ? Number(p.actualPrice) : NaN;
      return list > 0 && Number.isFinite(actual) && actual < list;
    });
    if (withDiscount.length === 0) return [];
    const byChannel = new Map<string, number[]>();
    for (const p of withDiscount) {
      const list = Number(p.price);
      const actual = Number(p.actualPrice);
      const rate = (list - actual) / list;
      const ch = p?.channel ?? 'unknown';
      if (!byChannel.has(ch)) byChannel.set(ch, []);
      byChannel.get(ch)!.push(rate);
    }
    return Array.from(byChannel.entries()).map(([channel, rates]) => {
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      return { channel, avgDiscountPct: avg * 100, count: rates.length };
    }).sort((a, b) => b.avgDiscountPct - a.avgDiscountPct);
  }, [products, selectedCategory]);

  // 桑基流图：渠道 → 品类 → 价格带（用当前视图 marketData，支持全渠道/单渠道）
  const flowSankeyData = useMemo(() => {
    if (marketData.length === 0) return { nodes: [], links: [], segmentKeys: [] as string[] };
    const marketAvgPrice = marketBasics.avgPrice || 1;
    const segmentKeys = ['segment_entry', 'segment_mainstream', 'segment_mid', 'segment_mid_high', 'segment_high'];
    type Node = { id: string; name: string; layer: number; value: number };
    const nodes: Node[] = [];
    const links: { source: string; target: string; value: number }[] = [];
    const channelSales = new Map<string, number>();
    const channelCatSales = new Map<string, number>();
    const catSegmentSales = new Map<string, number>();
    for (const p of marketData) {
      const ch = p?.channel ?? 'unknown';
      const cid = p?.categoryId ?? 'unknown';
      const catName = categories.find(c => c.id === cid)?.name ?? cid;
      const price = p?.price ?? 0;
      const priceIndex = marketAvgPrice > 0 ? (price / marketAvgPrice) * 100 : 100;
      const seg = getSegmentKey(priceIndex);
      const sales = p?.monthlySales ?? 0;
      channelSales.set(ch, (channelSales.get(ch) ?? 0) + sales);
      const ck = `${ch}|${cid}`;
      channelCatSales.set(ck, (channelCatSales.get(ck) ?? 0) + sales);
      const sk = `${ck}|${seg}`;
      catSegmentSales.set(sk, (catSegmentSales.get(sk) ?? 0) + sales);
    }
    const channels = Array.from(channelSales.entries()).sort((a, b) => b[1] - a[1]);
    const channelCat = Array.from(channelCatSales.entries()).sort((a, b) => b[1] - a[1]);
    channels.forEach(([ch]) => nodes.push({ id: ch, name: ch, layer: 0, value: channelSales.get(ch) ?? 0 }));
    channelCat.forEach(([ck]) => {
      const [ch, cid] = ck.split('|');
      const name = categories.find(c => c.id === cid)?.name ?? cid;
      nodes.push({ id: `mid_${ck}`, name, layer: 1, value: channelCatSales.get(ck) ?? 0 });
      links.push({ source: ch, target: `mid_${ck}`, value: channelCatSales.get(ck) ?? 0 });
    });
    segmentKeys.forEach(seg => {
      const total = channelCat.reduce((acc, [ck]) => acc + (catSegmentSales.get(`${ck}|${seg}`) ?? 0), 0);
      if (total > 0) nodes.push({ id: seg, name: t(seg), layer: 2, value: total });
    });
    channelCat.forEach(([ck]) => {
      segmentKeys.forEach(seg => {
        const v = catSegmentSales.get(`${ck}|${seg}`) ?? 0;
        if (v > 0) links.push({ source: `mid_${ck}`, target: seg, value: v });
      });
    });
    return { nodes, links, segmentKeys };
  }, [marketData, marketBasics, categories, t]);

  // 节点颜色（参考图：蓝→青→橙 三列）
  const flowNodeColor = (id: string, layer: number) => {
    const seg: Record<string, string> = { segment_entry: '#0D9488', segment_mainstream: '#65A30D', segment_mid: '#EA580C', segment_mid_high: '#7C3AED', segment_high: '#DB2777' };
    if (layer === 0) return '#2563EB';
    if (layer === 1) return '#0891B2';
    return seg[id] ?? '#EA580C';
  };

  // 桑基图布局：带状流线（渐变填充）、层合计（百分比）、每条 link 的 source/target 色
  const flowLayout = useMemo(() => {
    const { nodes, links } = flowSankeyData;
    const nodeGap = 5;
    const headerH = 36;
    const titleY = 18;
    if (nodes.length === 0) return { positions: new Map(), paths: [], ribbons: [], layerTotals: [0, 0, 0], totalSales: 0, maxLink: 0, W: 1120, H: 320, headerH, titleY: 18, labelOffset: 16, colWidth: 40, xByLayer: [134, 560, 930] };
    const chartH = 260;
    const W = 1120;
    const colWidth = 40;
    const xByLayer = [134, 560, 930];
    const labelOffset = 16;
    const byLayer = new Map<number, { id: string; name: string; value: number }[]>();
    nodes.forEach(n => {
      const list = byLayer.get(n.layer) ?? [];
      list.push({ id: n.id, name: n.name, value: n.value });
      byLayer.set(n.layer, list);
    });
    byLayer.forEach(list => list.sort((a, b) => b.value - a.value));
    const layerTotals = [0, 0, 0] as number[];
    const positions = new Map<string, { x: number; y: number; w: number; h: number; name: string; value: number; layer: number; pct: number }>();
    byLayer.forEach((list, layer) => {
      const total = list.reduce((a, n) => a + n.value, 0) || 1;
      layerTotals[layer] = total;
      const nCount = list.length;
      const gapTotal = (nCount - 1) * nodeGap;
      const barTotal = chartH - gapTotal;
      let y = headerH;
      list.forEach(n => {
        const h = Math.max(14, (n.value / total) * barTotal);
        const pct = total > 0 ? (n.value / total) * 100 : 0;
        positions.set(n.id, { x: xByLayer[layer]! - colWidth / 2, y, w: colWidth, h, name: n.name, value: n.value, layer, pct });
        y += h + nodeGap;
      });
    });
    const totalSales = layerTotals[0] || 1;
    const maxLink = Math.max(...links.map(l => l.value), 1);
    const outflowTotal = new Map<string, number>();
    const inflowTotal = new Map<string, number>();
    links.forEach(l => {
      outflowTotal.set(l.source, (outflowTotal.get(l.source) ?? 0) + l.value);
      inflowTotal.set(l.target, (inflowTotal.get(l.target) ?? 0) + l.value);
    });
    const paths: { d: string; value: number; strokeWidth: number; sourceId: string; targetId: string }[] = [];
    const ribbons: { d: string; value: number; sourceColor: string; targetColor: string }[] = [];
    links.forEach(l => {
      const src = positions.get(l.source);
      const dst = positions.get(l.target);
      if (!src || !dst) return;
      const sx = src.x + src.w;
      const sy = src.y + src.h / 2;
      const tx = dst.x;
      const ty = dst.y + dst.h / 2;
      const dx = tx - sx;
      const d = `M ${sx} ${sy} C ${sx + dx * 0.5} ${sy}, ${tx - dx * 0.5} ${ty}, ${tx} ${ty}`;
      const srcOut = outflowTotal.get(l.source) || 1;
      const dstIn = inflowTotal.get(l.target) || 1;
      const widthAtSource = (l.value / srcOut) * src.h;
      const widthAtTarget = (l.value / dstIn) * dst.h;
      const strokeWidth = Math.max(4, (widthAtSource + widthAtTarget) / 2);
      paths.push({ d, value: l.value, strokeWidth, sourceId: l.source, targetId: l.target });
      const sourceColor = flowNodeColor(l.source, src.layer);
      const targetColor = flowNodeColor(l.target, dst.layer);
      const N = 28;
      const pts: { x: number; y: number }[] = [];
      const lower: { x: number; y: number }[] = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const mt = 1 - t;
        const halfWidth = (1 - t) * (widthAtSource / 2) + t * (widthAtTarget / 2);
        const x = mt * mt * mt * sx + 3 * mt * mt * t * (sx + dx * 0.5) + 3 * mt * t * t * (tx - dx * 0.5) + t * t * t * tx;
        const y = mt * mt * mt * sy + 3 * mt * mt * t * (sy) + 3 * mt * t * t * (ty) + t * t * t * ty;
        const dxdt = 3 * mt * mt * ((sx + dx * 0.5) - sx) + 6 * mt * t * ((tx - dx * 0.5) - (sx + dx * 0.5)) + 3 * t * t * (tx - (tx - dx * 0.5));
        const dydt = 3 * mt * mt * (sy - sy) + 6 * mt * t * (ty - sy) + 3 * t * t * (ty - ty);
        const len = Math.hypot(dxdt, dydt) || 1;
        const nx = -dydt / len;
        const ny = dxdt / len;
        pts.push({ x: x + nx * halfWidth, y: y + ny * halfWidth });
        lower.push({ x: x - nx * halfWidth, y: y - ny * halfWidth });
      }
      const ribbonD = `M ${pts.map(p => `${p.x} ${p.y}`).join(' L ')} L ${lower.reverse().map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
      ribbons.push({ d: ribbonD, value: l.value, sourceColor, targetColor });
    });
    return { positions, paths, ribbons, layerTotals, totalSales, maxLink, W, H: headerH + chartH + 20, headerH, titleY, labelOffset, colWidth, xByLayer };
  }, [flowSankeyData]);

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

  const ProductPriceIndexTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as { name: string; brand: string; priceIndex: number; segmentKey: string; monthlySales: number; price: number };
    return (
      <div className="bg-slate-950/98 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl text-left min-w-[200px]">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">{t('value_positioning')}</p>
        <p className="text-[11px] font-black text-white mb-1">{p?.name || '—'}</p>
        <p className="text-[9px] font-black text-[#818CF8] mb-2">{p?.brand || '—'}</p>
        <p className="text-[10px] font-black text-slate-400 flex justify-between"><span>{t('price_index')}:</span> <span className="text-[#A3E635]">{p?.priceIndex ?? 0}</span></p>
        <p className="text-[10px] font-black text-slate-400 flex justify-between"><span>{t('price_index_segment')}:</span> <span>{p?.segmentKey ? t(p.segmentKey) : '—'}</span></p>
        <p className="text-[10px] font-black text-slate-400 flex justify-between"><span>{t('sales')}:</span> <span>{(p?.monthlySales ?? 0).toLocaleString()}</span></p>
      </div>
    );
  };

  const PieShareTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as { name: string; value: number };
    return (
      <div className="bg-slate-950/98 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl text-left min-w-[140px]">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">{t('category_share')}</p>
        <p className="text-[10px] font-black text-white">{p?.name || '—'}</p>
        <p className="text-[11px] font-black text-[#A3E635] mt-1">{p?.value?.toLocaleString?.() ?? p?.value}</p>
      </div>
    );
  };

  const CategoryCompareTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as { name: string; sales: number; avgPrice: number; count: number; minPrice?: number; maxPrice?: number; open?: number; close?: number };
    return (
      <div className="bg-slate-950/98 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl text-left min-w-[200px]">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">{t('panel_category_by_channel')}</p>
        <p className="text-[10px] font-black text-white mb-2">{p?.name || '—'}</p>
        <p className="text-[10px] font-black text-slate-400 flex justify-between"><span>{t('sales')}:</span> <span className="text-[#A3E635]">{(p?.sales ?? 0).toLocaleString()}</span></p>
        <p className="text-[10px] font-black text-slate-400 flex justify-between"><span>{t('avg_price')}:</span> <span>¥{(p?.avgPrice ?? 0).toLocaleString()}</span></p>
        {(p?.minPrice != null && p?.maxPrice != null) && (
          <p className="text-[9px] font-bold text-slate-500 mt-1">¥{(p.minPrice).toLocaleString()} ~ ¥{(p.maxPrice).toLocaleString()}</p>
        )}
        <p className="text-[10px] font-black text-slate-400 flex justify-between"><span>{t('sku_count')}:</span> <span>{p?.count ?? 0}</span></p>
      </div>
    );
  };

  // K 线（蜡烛图）自定义 Bar 形状：影线 min→max，实体 open→close（25%～75% 分位）
  const CandlestickBar = (props: any) => {
    const { x, y, width, height, payload, index } = props;
    const maxPrice = payload?.maxPrice ?? 1;
    const minPrice = payload?.minPrice ?? 0;
    const open = payload?.open ?? minPrice;
    const close = payload?.close ?? maxPrice;
    if (maxPrice <= 0 || height < 4) return null;
    const scale = width / maxPrice;
    const xMin = x + minPrice * scale;
    const xMax = x + maxPrice * scale;
    const xOpen = x + Math.min(open, close) * scale;
    const xClose = x + Math.max(open, close) * scale;
    const bodyH = Math.max(4, height - 4);
    const cy = y + height / 2;
    return (
      <g>
        <line x1={xMin} y1={cy} x2={xMax} y2={cy} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
        <rect x={xOpen} y={y + 2} width={Math.max(2, xClose - xOpen)} height={bodyH} fill="#38BDF8" fillOpacity={0.9} stroke="rgba(255,255,255,0.4)" strokeWidth={1} rx={2} />
      </g>
    );
  };

  const DiscountTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as { channel: string; avgDiscountPct: number; count: number };
    return (
      <div className="bg-slate-950/98 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl text-left min-w-[160px]">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">{t('panel_discount')}</p>
        <p className="text-[10px] font-black text-white">{p?.channel || '—'}</p>
        <p className="text-[11px] font-black text-[#A3E635] mt-1">{t('avg_discount_pct')}: {(p?.avgDiscountPct ?? 0).toFixed(1)}%</p>
        <p className="text-[10px] font-black text-slate-400">{t('sku_count')}: {p?.count ?? 0}</p>
      </div>
    );
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
            <h2 className="text-3xl sm:text-5xl font-black tracking-normal uppercase text-white leading-none">{t('market_intel')}</h2>
          </div>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">{t('benchmarking_protocol')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:gap-4 no-print">
          <div className="relative group">
            <Layout size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-[#A3E635] transition-colors" />
            <select 
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setVisibleProducts(5); }}
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
              onChange={(e) => { setSelectedChannel(e.target.value); setVisibleProducts(5); }}
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

      {/* 核心卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
          <div className="premium-card p-10 flex flex-col justify-between min-h-[220px] bg-slate-900/40 border-white/5 text-left group">
             <div className="flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity"><Percent size={20} /> <span className="text-[9px] font-black uppercase tracking-widest">{t('market_penetration')}</span></div>
             <div>
                <h3 className="text-4xl lg:text-6xl font-black tracking-normal text-white font-num">{tacticalMetrics.marketShare.toFixed(1)}%</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mt-4 leading-relaxed uppercase">{selectedBrand === 'all' ? t('segment_coverage') : t('market_share')}</p>
             </div>
          </div>
          <div className="premium-card p-10 flex flex-col justify-between min-h-[220px] border-[#A3E635]/20 text-left group">
             <div className="flex items-center justify-between text-[#A3E635]"><ShoppingCart size={20} /> <span className="text-[9px] font-black uppercase tracking-widest">{t('price_competitiveness')}</span></div>
             <div>
                <h3 className="text-4xl lg:text-6xl font-black tracking-normal text-white font-num">{Math.round(tacticalMetrics.priceIndex)}<span className="text-xl ml-2 text-slate-500 uppercase">Index</span></h3>
                <div className="flex items-center gap-2 mt-4">
                   <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${tacticalMetrics.priceIndex > 100 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                      {tacticalMetrics.priceIndex > 100 ? t('premium_pos') : t('budget_pos')}
                   </div>
                   <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{t('vs_global_avg')}</p>
                </div>
             </div>
          </div>
          <div className="premium-card p-10 flex flex-col justify-between min-h-[220px] border-[#818CF8]/20 text-left group">
             <div className="flex items-center justify-between text-[#818CF8]"><TrendingUp size={20} /> <span className="text-[9px] font-black uppercase tracking-widest">{t('segment_volume')}</span></div>
             <div>
                <h3 className="text-4xl lg:text-6xl font-black tracking-normal text-white font-num">{tacticalMetrics.segmentSales.toLocaleString()}</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mt-4 font-bold">{t('units_current_view')}</p>
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
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">{t('price_sales_matrix')}</p>
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
                        {marketData.length >= 4 && (() => {
                          const prices = [...marketData.map(p => Number(p?.price) || 0).filter(Boolean)].sort((a,b)=>a-b);
                          const sales = [...marketData.map(p => Number(p?.monthlySales) || 0).filter(Boolean)].sort((a,b)=>a-b);
                          const medP = prices.length ? prices[Math.floor(prices.length/2)] : 0;
                          const medS = sales.length ? sales[Math.floor(sales.length/2)] : 0;
                          return (
                            <>
                              <ReferenceLine x={medP} stroke="rgba(163,230,53,0.25)" strokeDasharray="4 4" />
                              <ReferenceLine y={medS} stroke="rgba(163,230,53,0.25)" strokeDasharray="4 4" />
                            </>
                          );
                        })()}
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
                {brandShareDataForPie.length > 0 ? (
                  <SafeChartContainer height="100%">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                          <Pie
                            data={brandShareDataForPie}
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                            nameKey="name"
                            isAnimationActive={false}
                            label={renderCustomizedPieLabel}
                            labelLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                          >
                            {brandShareDataForPie.map((entry, index) => entry?.name ? (
                              <Cell key={`cell-${index}`} fill={entry.name === selectedBrand ? '#A3E635' : COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                            ) : null)}
                          </Pie>
                          <Tooltip content={<PieShareTooltip />} />
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

      {/* 渠道·品类对比：全渠道/单渠道均可，K 线展示价格区间，对比更清晰 */}
      <div className="premium-card p-10 lg:p-14 text-left border-white/5 min-w-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-[#38BDF8] shadow-inner"><Layers size={18} /></div>
            <div>
              <h4 className="text-[12px] font-black uppercase tracking-widest text-white">
                {selectedChannel === 'all' ? t('panel_category_compare_all') : t('panel_category_by_channel')}
              </h4>
              <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">
                {selectedChannel === 'all' ? t('panel_category_compare_all_hint') : t('panel_category_by_channel_hint')}
              </p>
              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{t('panel_category_candle_hint')}</p>
            </div>
          </div>
        </div>
        {categoryComparisonData.length > 0 ? (
          <SafeChartContainer height={Math.max(180, categoryComparisonData.length * 52)}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart
                data={categoryComparisonData}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
                barCategoryGap="20%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis
                  type="number"
                  dataKey="maxPrice"
                  domain={[0, (dataMax: number) => Math.ceil((dataMax || 0) * 1.08)]}
                  tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }}
                />
                <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                <Tooltip content={<CategoryCompareTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="maxPrice" shape={<CandlestickBar />} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </SafeChartContainer>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-slate-600">
            <p className="text-[10px] font-black uppercase tracking-widest">{t('no_data')}</p>
          </div>
        )}
      </div>

      {/* 桑基流图：与其他版块一致的留白，版块不显大、图表不显挤 */}
      {flowSankeyData.nodes.length > 0 && (
        <div className="premium-card p-10 lg:p-14 text-left border-white/5 min-w-0 flex flex-col overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-white/5 text-cyan-400"><GitBranch size={18} strokeWidth={2} /></div>
              <div>
                <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('panel_flow_sankey')}</h4>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-1">{t('panel_flow_sankey_hint')}</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('sales')}</span>
              <span className="text-[18px] font-black text-[#A3E635] tabular-nums">{(flowLayout.totalSales ?? 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="w-full overflow-x-auto overflow-y-hidden rounded-2xl bg-slate-900/30 border border-white/5 relative pt-4 pb-5 px-5">
            <SafeChartContainer height={340}>
              <svg viewBox={`0 0 ${flowLayout.W} ${flowLayout.H}`} className="w-full h-full min-h-[300px] block" preserveAspectRatio="xMidYMid meet" style={{ minWidth: 1120 }}>
                <defs>
                  {flowLayout.ribbons?.map((r, i) => (
                    <linearGradient key={i} id={`ribbonGrad${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={r.sourceColor} stopOpacity={0.75} />
                      <stop offset="100%" stopColor={r.targetColor} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                  <linearGradient id="nodeChannel" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#2563EB" /></linearGradient>
                  <linearGradient id="nodeCategory" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#06B6D4" /><stop offset="100%" stopColor="#0891B2" /></linearGradient>
                  <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx={0} dy={1} stdDeviation={2} floodOpacity={0.12} /></filter>
                </defs>
                <text x={flowLayout.xByLayer?.[0] ?? 134} y={flowLayout.titleY ?? 22} fill="#64748B" fontSize={10} fontWeight={800} textAnchor="middle" className="uppercase tracking-widest">{t('channel')}</text>
                <text x={flowLayout.xByLayer?.[1] ?? 560} y={flowLayout.titleY ?? 22} fill="#64748B" fontSize={10} fontWeight={800} textAnchor="middle" className="uppercase tracking-widest">{t('category')}</text>
                <text x={flowLayout.xByLayer?.[2] ?? 930} y={flowLayout.titleY ?? 22} fill="#64748B" fontSize={10} fontWeight={800} textAnchor="middle" className="uppercase tracking-widest">{t('price_index_segment')}</text>
                {/* 带状流线：渐变填充，从源色到目标色 */}
                {(flowLayout.ribbons ?? []).map((r, i) => (
                  <path key={i} d={r.d} fill={`url(#ribbonGrad${i})`} stroke="none" opacity={0.88} />
                ))}
                {/* 节点：带百分比、可悬停 */}
                {Array.from(flowLayout.positions.entries()).map(([id, pos]) => {
                  const isLeft = pos.layer === 0;
                  const isRight = pos.layer === 2;
                  const segColors: Record<string, string> = { segment_entry: '#0D9488', segment_mainstream: '#65A30D', segment_mid: '#EA580C', segment_mid_high: '#7C3AED', segment_high: '#DB2777' };
                  const fill = isLeft ? 'url(#nodeChannel)' : isRight ? (segColors[id] ?? '#EA580C') : 'url(#nodeCategory)';
                  const labelX = pos.x + pos.w + (flowLayout.labelOffset ?? 14);
                  const isHover = flowHoverNodeId === id;
                  return (
                    <g
                      key={id}
                      filter="url(#nodeShadow)"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setFlowHoverNodeId(id)}
                      onMouseLeave={() => setFlowHoverNodeId(null)}
                    >
                      <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx={6} fill={fill} fillOpacity={isHover ? 1 : 0.92} stroke={isHover ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'} strokeWidth={isHover ? 1.5 : 1} />
                      <text x={labelX} y={pos.y + pos.h / 2} fill={isHover ? '#FFF' : '#E2E8F0'} fontSize={11} fontWeight={700} dominantBaseline="middle" style={{ letterSpacing: isLeft || isRight ? '0.04em' : '0' }}>
                        {pos.name} <tspan fill="#94A3B8" fontWeight={600}> {pos.pct != null ? `${pos.pct.toFixed(1)}%` : ''}</tspan>
                      </text>
                    </g>
                  );
                })}
              </svg>
            </SafeChartContainer>
            {flowHoverNodeId && (() => {
              const pos = flowLayout.positions.get(flowHoverNodeId);
              if (!pos) return null;
              const globalPct = flowLayout.totalSales ? (pos.value / flowLayout.totalSales * 100) : 0;
              return (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-3 rounded-xl bg-slate-950/95 border border-white/10 shadow-xl backdrop-blur-sm pointer-events-none">
                  <p className="text-[11px] font-black text-white whitespace-nowrap">{pos.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{t('sales')}: <span className="text-[#A3E635]">{pos.value.toLocaleString()}</span></p>
                  <p className="text-[9px] font-bold text-slate-500">{pos.pct != null ? `${pos.pct.toFixed(1)}%` : ''} {t('flow_column_pct')} · {globalPct.toFixed(1)}% {t('flow_total_pct')}</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 折扣力度：按渠道平均折扣率 */}
      {discountByChannelData.length > 0 && (
        <div className="premium-card p-10 lg:p-14 text-left border-white/5 min-w-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-[#F472B6] shadow-inner"><Percent size={18} /></div>
              <div>
                <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('panel_discount')}</h4>
                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">{t('panel_discount_hint')}</p>
              </div>
            </div>
          </div>
          <SafeChartContainer height={220}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={discountByChannelData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="channel" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                <YAxis unit="%" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} domain={[0, 'auto']} />
                <Tooltip content={<DiscountTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="avgDiscountPct" radius={[4, 4, 0, 0]} name={t('avg_discount_pct')}>
                  {discountByChannelData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SafeChartContainer>
        </div>
      )}

      {/* 产品价格指数定位：同品类同平台，所有产品 X=价格指数(100=均价) Y=销量，五档占位 入门/主流/中端/中高端/高端 */}
      {productPriceIndexData.length > 0 && (
        <div className="premium-card p-10 lg:p-14 text-left border-white/5 min-w-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-[#818CF8] shadow-inner"><Target size={18} /></div>
              <div>
                <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('value_positioning')}</h4>
                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">{t('value_positioning_hint')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {SEGMENT_BANDS.map((band) => (
                <span key={band.key} className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider text-slate-500" style={{ backgroundColor: band.fill }}>{t(band.key)}</span>
              ))}
            </div>
          </div>
          <SafeChartContainer height={360}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis type="number" dataKey="priceIndex" name={t('price_index')} domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }} />
                <YAxis type="number" dataKey="monthlySales" name={t('sales')} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }} />
                <Tooltip content={<ProductPriceIndexTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                {SEGMENT_BANDS.map((band) => (
                  <ReferenceArea key={band.key} x1={band.x1} x2={band.x2} fill={band.fill} strokeOpacity={0} />
                ))}
                <ReferenceLine x={100} stroke="rgba(163,230,53,0.4)" strokeDasharray="4 4" strokeWidth={1.5} />
                <Scatter name="Product" data={productPriceIndexData}>
                  {productPriceIndexData.map((entry, index) => (
                    <Cell key={entry?.id ?? index} fill={entry?.brand === selectedBrand ? '#A3E635' : COLORS[index % COLORS.length]} fillOpacity={entry?.brand === selectedBrand ? 1 : 0.75} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </SafeChartContainer>
        </div>
      )}

      {/* 排行榜 */}
      <div className="space-y-8 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6">
             <div className="flex items-center gap-4">
               <div className="size-10 bg-slate-900 rounded-xl flex items-center justify-center text-indigo-400 border border-white/5"><TableIcon size={18} /></div>
               <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">{t('leaderboard')}</h3>
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">{t('ranking_velocity')}</p>
               </div>
             </div>
             <div className="flex items-center gap-2 flex-wrap">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{marketData.length} {t('skus_tracked')}</span>
               <div className="flex items-center gap-1">
                 {(['sales', 'price', 'rating'] as const).map(key => (
                   <button
                     key={key}
                     onClick={() => setLeaderboardSort(key)}
                     className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${leaderboardSort === key ? 'bg-[#A3E635] text-slate-950' : 'bg-slate-900/60 text-slate-500 hover:text-slate-300 border border-white/5'}`}
                   >
                     {key === 'sales' ? t('sort_by_sales') : key === 'price' ? t('sort_by_price') : t('sort_by_rating')}
                   </button>
                 ))}
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
             {sortedLeaderboard.slice(0, visibleProducts).map((product, idx) => product?.id ? (
               <div 
                 key={product.id} 
                 onClick={() => setActiveDetailId(product.id)}
                 className={`premium-card p-6 lg:px-10 flex flex-col sm:flex-row items-center gap-8 group cursor-pointer border-white/5 hover:bg-slate-900/40 transition-all animate-in slide-in-from-bottom-2 ${product?.brand === selectedBrand ? 'border-[#A3E635]/30 bg-[#A3E635]/5' : ''}`}
                 style={{ animationDelay: `${idx * 50}ms` }}
               >
                  <div className="flex items-center gap-8 flex-1 w-full">
                     <div className="text-2xl font-black text-slate-800 font-num w-10 group-hover:text-[#A3E635] transition-colors">#{idx + 1}</div>
                     <div className="size-16 bg-slate-950 rounded-2xl overflow-hidden p-2 border border-white/5 shrink-0 flex items-center justify-center">
                        <Package className="text-slate-800 size-full" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-[9px] font-black text-[#818CF8] uppercase tracking-widest">{product?.brand || t('unknown_brand')}</span>
                           <span className="text-[9px] font-bold text-slate-600 uppercase px-2 py-0.5 bg-slate-950 rounded-md border border-white/5">{product?.channel || t('unknown_channel')}</span>
                        </div>
                        <h4 className="text-sm font-black text-white uppercase truncate group-hover:text-[#A3E635] transition-colors">{product?.model || t('unnamed_product')}</h4>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-12 shrink-0">
                     <div className="text-right space-y-1">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{t('market_value')}</p>
                        <p className="text-lg font-black text-white font-num">¥{(Number(product?.price) || 0).toLocaleString()}</p>
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

      {/* 详情页弹窗 - 与产品管理页详情信息量一致 */}
      {activeDetailId && detailedProduct && (
        <div className="detail-modal-overlay animate-in fade-in duration-500" onClick={() => setActiveDetailId(null)}>
           <div className="detail-modal-container open animate-in slide-in-from-right duration-500 flex flex-col max-w-2xl sm:max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <div className="detail-modal-header shrink-0">
                <button onClick={() => setActiveDetailId(null)} className="flex items-center gap-4 text-slate-500 hover:text-white transition-all group">
                   <ArrowLeft size={24} className="text-[#A3E635]" />
                   <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t('close')}</span>
                </button>
              </div>

              <div className="detail-modal-content flex-1 overflow-y-auto space-y-12 text-left pb-32 custom-scrollbar min-h-0">
                 {/* 顶部：图片 + 核心信息（与 ProductInventory 一致） */}
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12">
                    <div className="lg:col-span-5 flex flex-col justify-center gap-4 min-h-[160px] sm:min-h-[200px] bg-slate-950/50 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 border border-white/5 shrink-0">
                       {(() => {
                         const p = detailedProduct as any;
                         const att = typeof p?.attributes === 'string' 
                           ? (() => { try { return JSON.parse(p.attributes || '{}'); } catch { return {}; } })() 
                           : (p?.attributes ?? {}) as Record<string, unknown>;
                         const linkUrl = detailedProduct?.linkUrl || att?.link_url || att?.linkUrl || '';
                         return linkUrl ? (
                           <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-[#A3E635] text-slate-950 font-black text-[10px] sm:text-[11px] uppercase rounded-2xl hover:opacity-90 transition-opacity">
                             <ExternalLink size={20} /> {t('open_official')}
                           </a>
                         ) : (
                           <span className="text-[10px] font-black text-slate-600 uppercase">{t('product_link')} {t('not_set')}</span>
                         );
                       })()}
                    </div>
                    <div className="lg:col-span-7 space-y-6 min-w-0">
                       <div className="flex items-center gap-2 flex-wrap">
                          <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg">{detailedProduct?.channel || t('unknown_channel')}</div>
                          <div className="px-3 py-1 bg-slate-800 border border-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-lg">{detailedProduct?.brand || t('unknown_brand')}</div>
                          <div className="px-3 py-1 bg-[#A3E635]/10 border border-[#A3E635]/20 text-[#A3E635] text-[9px] font-black uppercase tracking-widest rounded-lg">{detailedCategory?.name || '—'}</div>
                       </div>
                       <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-normal leading-tight">{detailedProduct?.model || t('unnamed_product')}</h1>
                       <div className="grid grid-cols-2 gap-4 sm:gap-8 border-b border-white/5 pb-6 sm:pb-10">
                          <div>
                             <p className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 sm:mb-2">{t('price')}</p>
                             <p className="text-2xl sm:text-4xl font-black text-white font-num">¥{(Number(detailedProduct?.price) || 0).toLocaleString()}</p>
                          </div>
                          {(detailedProduct?.actualPrice != null && detailedProduct?.actualPrice !== '') && (
                          <div>
                             <p className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 sm:mb-2">{t('actual_price')}</p>
                             <p className="text-2xl sm:text-4xl font-black text-amber-400 font-num">¥{(Number(detailedProduct?.actualPrice) || 0).toLocaleString()}</p>
                          </div>
                          )}
                          <div>
                             <p className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 sm:mb-2">{t('volume')}</p>
                             <p className="text-2xl sm:text-4xl font-black text-[#A3E635] font-num">{(Number(detailedProduct?.monthlySales) || 0).toLocaleString()} <span className="text-xs uppercase ml-1">{t('units')}</span></p>
                          </div>
                          {(detailedProduct?.rating != null && detailedProduct?.rating !== '') && (
                          <div className="col-span-2">
                             <p className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 sm:mb-2">{t('rating')}</p>
                             <div className="flex items-center gap-2">
                                {Array.from({length: 5}).map((_, i) => {
                                  const r = Number(detailedProduct?.rating) || 0;
                                  const filled = i < Math.floor(r) || (i === Math.floor(r) && r % 1 >= 0.5);
                                  return (
                                    <Star key={i} size={16} fill={filled ? "#A3E635" : "transparent"} className={filled ? "text-[#A3E635]" : "text-slate-800"} />
                                  );
                                })}
                                <span className="ml-2 text-xl font-black text-white font-num">{(Number(detailedProduct?.rating) || 0).toFixed(2)}</span>
                             </div>
                          </div>
                          )}
                          {((detailedProduct?.linkUrl || detailedProduct?.attributes?.link_url) && (
                          <div className="col-span-2">
                             <p className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 sm:mb-2">{t('visit_link')}</p>
                             <a href={String(detailedProduct?.linkUrl || detailedProduct?.attributes?.link_url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest truncate">
                                <span className="truncate flex-1">{(detailedProduct?.linkUrl || detailedProduct?.attributes?.link_url) as string}</span>
                                <ExternalLink size={14} className="shrink-0" />
                             </a>
                          </div>
                          ))}
                       </div>
                       {/* 品类自定义字段 - 按后台配置展示，使用用户创建字段名称 */}
                       <div className="space-y-4 sm:space-y-6">
                          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                             <Database size={16} className="text-slate-500" />
                             <p className="text-[10px] font-black text-white uppercase tracking-widest">{t('full_node_data')}</p>
                          </div>
                          {(() => {
                             const FIXED_IDS = ['brand', 'model', 'linkUrl', 'channel', 'shopName', 'price', 'monthlySales', 'rating', 'mainImage', 'link_url', 'main_image'];
                             const customFields = (detailedCategory?.fields ?? []).filter((f: ProductField) => f?.id && f?.name && !FIXED_IDS.includes(f.id));
                             const getVal = (f: ProductField) => detailedProduct?.[f.id] ?? detailedProduct?.attributes?.[f.id];
                             const formatVal = (v: unknown, isMultiQty?: boolean) => {
                               if (v === undefined || v === null || v === '') return '—';
                               if (Array.isArray(v)) return v.join(', ');
                               if (typeof v === 'object' && v !== null) {
                                 const entries = Object.entries(v).filter(([, n]) => n != null && n !== '');
                                 if (isMultiQty && entries.length > 0) return entries.map(([k, n]) => `${k}×${n}`).join(' · ');
                                 return JSON.stringify(v);
                               }
                               return String(v);
                             };
                             return customFields.map((field: ProductField) => {
                               const val = getVal(field);
                               const isMultiQty = field.type === FieldType.MULTI_SELECT_QUANTITY;
                               return (
                                 <div key={field.id} className="space-y-1 sm:space-y-1.5 text-left">
                                   <p className="text-[7px] sm:text-[8px] font-black text-slate-600 uppercase tracking-widest">{field.name}</p>
                                   <div className="text-[10px] sm:text-[11px] font-medium text-slate-300 leading-relaxed normal-case bg-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5">
                                     {formatVal(val, isMultiQty)}
                                   </div>
                                 </div>
                               );
                             });
                          })()}
                       </div>
                    </div>
                 </div>

                 {/* 卖点区 - 蓝色药丸标签（兼容 sellingPoints 字符串或 attributes.selling_points 数组） */}
                 {(() => {
                   const sp = detailedProduct?.sellingPoints ?? detailedProduct?.attributes?.selling_points;
                   const points = Array.isArray(sp) ? sp : (typeof sp === 'string' && sp ? sp.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
                   return points.length > 0 ? (
                    <div className="premium-card p-8 border-blue-500/30 bg-blue-950/20">
                       <div className="flex items-center gap-4 mb-6">
                          <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Star size={20} /></div>
                          <div>
                             <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('core_sell_points')}</h4>
                             <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mt-1">{t('product_sell_points')}</p>
                          </div>
                       </div>
                       <div className="flex flex-wrap gap-3">
                          {points.map((point: string, index: number) => (
                             <div key={index} className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                                <Zap size={12} className="text-blue-400" />
                                {point}
                             </div>
                          ))}
                       </div>
                    </div>
                 ) : null;
                 })()}

                 {/* 口碑对比卡片（兼容 top-level 或 attributes） */}
                 {((detailedProduct?.pros ?? detailedProduct?.attributes?.pros) || (detailedProduct?.cons ?? detailedProduct?.attributes?.cons)) && (
                    <div className="premium-card p-8 border-white/10">
                       <div className="flex items-center gap-4 mb-6">
                          <div className="size-10 bg-gradient-to-r from-green-500 to-red-500 rounded-xl flex items-center justify-center text-white"><MessageSquare size={20} /></div>
                          <div>
                             <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('review_compare')}</h4>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('customer_voice_analysis')}</p>
                          </div>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* 好评 - 绿色 */}
                          {(detailedProduct?.pros ?? detailedProduct?.attributes?.pros) && (
                             <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                   <div className="size-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                      <ThumbsUp size={16} className="text-green-400" />
                                   </div>
                                   <h5 className="text-[10px] font-black text-green-400 uppercase tracking-widest">{t('pros_wordcloud')}</h5>
                                </div>
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                                   <p className="text-[11px] text-green-300 leading-relaxed">{detailedProduct?.pros ?? detailedProduct?.attributes?.pros}</p>
                                </div>
                             </div>
                          )}
                          {/* 差评 - 红色 */}
                          {(detailedProduct?.cons ?? detailedProduct?.attributes?.cons) && (
                             <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                   <div className="size-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                                      <ThumbsDown size={16} className="text-red-400" />
                                   </div>
                                   <h5 className="text-[10px] font-black text-red-400 uppercase tracking-widest">{t('cons_wordcloud')}</h5>
                                </div>
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                   <p className="text-[11px] text-red-300 leading-relaxed">{detailedProduct?.cons ?? detailedProduct?.attributes?.cons}</p>
                                </div>
                             </div>
                          )}
                       </div>
                    </div>
                 )}

                 {/* 痛点高亮 - 警告框（兼容 top-level 或 attributes） */}
                 {(detailedProduct?.rawReview ?? detailedProduct?.raw_review ?? detailedProduct?.attributes?.raw_review) && (
                    <div className="premium-card p-8 border-red-500/50 bg-red-950/30 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-20"><AlertTriangle size={80} className="text-red-400" /></div>
                       <div className="flex items-start gap-4 mb-6">
                          <div className="size-10 bg-red-600 rounded-xl flex items-center justify-center text-white flex-shrink-0 mt-1">
                             <AlertTriangle size={20} />
                          </div>
                          <div className="flex-1">
                             <h4 className="text-[12px] font-black uppercase tracking-widest text-red-400">⚠️ {t('key_pain_point')}</h4>
                             <p className="text-[8px] font-black text-red-600 uppercase tracking-widest mt-1">{t('critical_pain_point')}</p>
                          </div>
                       </div>
                       <div className="p-6 bg-red-500/10 border-2 border-red-500/30 rounded-2xl">
                          <p className="text-[13px] font-bold text-red-300 leading-relaxed">"{detailedProduct?.rawReview ?? detailedProduct?.raw_review ?? detailedProduct?.attributes?.raw_review}"</p>
                       </div>
                    </div>
                 )}

                 {/* 贾维斯洞察 - 市场洞察（兼容 top-level 或 attributes） */}
                 {(detailedProduct?.insightSummary ?? detailedProduct?.insight_summary ?? detailedProduct?.attributes?.insight_summary) && (
                    <div className="premium-card p-10 border-purple-500/30 bg-purple-950/20 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-10"><Brain size={100} className="text-purple-400" /></div>
                       <div className="flex items-center gap-4 mb-8">
                          <div className="size-10 bg-purple-600 rounded-xl flex items-center justify-center text-white"><Brain size={20} /></div>
                          <div>
                             <h4 className="text-[12px] font-black uppercase tracking-widest text-white">{t('jarvis_insight')}</h4>
                             <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mt-1">{t('market_opportunity_analysis')}</p>
                          </div>
                       </div>
                       <div className="prose prose-invert max-w-none">
                          <div className="text-purple-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">{detailedProduct?.insightSummary ?? detailedProduct?.insight_summary ?? detailedProduct?.attributes?.insight_summary}</div>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
