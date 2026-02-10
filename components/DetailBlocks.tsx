/**
 * 产品详情统一展示：核心卖点、口碑对比、产品参数、贾维斯洞察
 * 与设计稿一致：圆角卡片、分区标题+图标、蓝/绿/红/紫配色
 */
import React from 'react';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Brain, Zap, Link2 } from 'lucide-react';
import { DETAIL_BLOCK_KEYS, CONTENT_FIELDS } from '../constants';

const fmtDefault = (v: unknown): string => {
  if (v == null || v === '') return '—';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
};

export interface DetailBlocksProps {
  get: (k: string) => unknown;
  fmt?: (v: unknown) => string;
  t: (key: string) => string;
  /** 可选：卡片类名前缀，用于与不同页面样式统一 */
  cardClass?: string;
}

export const DetailBlocks: React.FC<DetailBlocksProps> = ({ get, fmt = fmtDefault, t, cardClass = 'p-4 sm:p-6 rounded-2xl sm:rounded-3xl border' }) => {
  const getVal = (key: string) =>
    key === 'linkUrl' ? (get('linkUrl') ?? get('link_url')) : get(key) ?? (key === 'selling_points' ? get('sellingPoints') : key === 'insight_summary' ? get('insightSummary') : undefined);
  const sellingPointsVal = getVal('selling_points');
  const prosVal = getVal('pros');
  const consVal = getVal('cons');
  const insightVal = getVal('insight_summary');
  const paramKeys = DETAIL_BLOCK_KEYS.filter(k => !['selling_points', 'pros', 'cons', 'insight_summary', 'linkUrl'].includes(k));

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. 核心卖点 - 蓝色 */}
      <div className={`${cardClass} bg-blue-500/5 border-blue-500/20`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="size-10 sm:size-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Star size={22} className="text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-widest">{t('core_sell_points')}</h4>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t('product_sell_points')}</p>
          </div>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 inline-flex items-center gap-2 flex-wrap">
          <Zap size={16} className="text-blue-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed whitespace-pre-wrap">{fmt(sellingPointsVal)}</span>
        </div>
      </div>

      {/* 2. 口碑对比 - 好评词云(绿) + 差评词云(红) */}
      <div className={`${cardClass} bg-slate-900/50 border-white/10`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="size-10 sm:size-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <MessageSquare size={22} className="text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-widest">{t('review_compare')}</h4>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t('customer_voice_analysis')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsUp size={18} className="text-green-400" />
              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">{t('pros_wordcloud')}</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed whitespace-pre-wrap min-h-[2.5rem]">{fmt(prosVal)}</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsDown size={18} className="text-red-400" />
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{t('cons_wordcloud')}</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed whitespace-pre-wrap min-h-[2.5rem]">{fmt(consVal)}</p>
          </div>
        </div>
      </div>

      {/* 3. 产品参数 - 链接 + 其余字段 */}
      <div className={`${cardClass} bg-slate-900/40 border-white/10`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="size-10 sm:size-12 rounded-xl bg-slate-600/30 flex items-center justify-center">
            <Link2 size={22} className="text-slate-400" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-widest">规格与参数</h4>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">容量、端口、尺寸等</p>
          </div>
        </div>
        <div className="space-y-3">
          {paramKeys.map(key => {
            const label = CONTENT_FIELDS.find(f => f.id === key)?.name ?? key;
            const val = getVal(key);
            return (
              <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2 border-b border-white/5 last:border-0">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0 w-28">{label}</p>
                <div className="text-xs sm:text-sm font-medium text-slate-200 break-all">{fmt(val)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 贾维斯洞察 - 紫色 */}
      <div className={`${cardClass} bg-purple-500/10 border-purple-500/20`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="size-10 sm:size-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Brain size={22} className="text-purple-400" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-widest">{t('jarvis_insight')}</h4>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t('market_opportunity_analysis')}</p>
          </div>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 sm:p-5">
          <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed whitespace-pre-wrap">{fmt(insightVal)}</p>
        </div>
      </div>
    </div>
  );
};
