/**
 * 统一字段定义 - 全站唯一数据源
 * 固定字段 + 自定义字段在此定义，所有前端页面与品类节点定义自动一致。
 */
import { ProductField, FieldType } from './types';

// ========== 固定字段（核心字段）：所有品类共有，设置页顶部展示、不可编辑 ==========
export const CORE_FIELDS: ProductField[] = [
  { id: 'brand', name: '品牌', type: FieldType.TEXT, required: true },
  { id: 'model', name: '产品名/型号', type: FieldType.TEXT, required: true },
  { id: 'linkUrl', name: '产品链接', type: FieldType.URL, required: false },
  { id: 'channel', name: '渠道/平台', type: FieldType.SELECT, required: true, options: ['Amazon', 'Rakuten', 'Yahoo Shopping'] },
  { id: 'shopName', name: '店铺名', type: FieldType.TEXT, required: false },
  { id: 'price', name: '价格(含税)', type: FieldType.NUMBER, required: true },
  { id: 'actualPrice', name: '到手价/券后', type: FieldType.NUMBER, required: false },
  { id: 'monthlySales', name: '月销量线索', type: FieldType.NUMBER, required: true },
  { id: 'rating', name: '评分', type: FieldType.RATING, required: false },
  { id: 'period', name: '记录日期', type: FieldType.DATE, required: false },
];

// ========== 自定义字段（详情/编辑/节点定义共用）：顺序固定，产品洞察由 AI 总结放最后 ==========
export const CONTENT_FIELDS: ProductField[] = [
  { id: 'capacity_mah', name: '容量(mAh)', type: FieldType.NUMBER, required: false },
  { id: 'fast_charge_protocol', name: '快充协议', type: FieldType.TEXT, required: false },
  { id: 'weight_g', name: '重量(g)', type: FieldType.NUMBER, required: false },
  { id: 'size_mm', name: '尺寸(mm)', type: FieldType.TEXT, required: false },
  { id: 'led_display', name: 'LED显示', type: FieldType.TEXT, required: false },
  { id: 'input_ports', name: '输入端口', type: FieldType.TEXT, required: false },
  { id: 'output_ports', name: '输出端口', type: FieldType.TEXT, required: false },
  { id: 'pros', name: '好评', type: FieldType.TEXTAREA, required: false },
  { id: 'cons', name: '差评', type: FieldType.TEXTAREA, required: false },
  { id: 'search_keywords', name: '搜索关键词', type: FieldType.TEXTAREA, required: false },
  { id: 'selling_points', name: '核心卖点 (USP)', type: FieldType.TEXTAREA, required: false },
  { id: 'insight_summary', name: '产品洞察', type: FieldType.TEXTAREA, required: false },
];

// 详情页/编辑页块顺序：链接 + 上述自定义字段
export const DETAIL_BLOCK_KEYS: string[] = ['linkUrl', ...CONTENT_FIELDS.map(f => f.id)];

// 详情块 label：优先用字段 name，部分走 i18n
export const getDetailLabelKey = (key: string): string => {
  const map: Record<string, string> = {
    linkUrl: 'link_url',
    selling_points: 'sell_points',
    pros: 'pros',
    cons: 'cons',
    insight_summary: 'insight_summary',
    search_keywords: 'search_keywords_label',
  };
  return map[key] ?? key;
};

// 固定字段在设置页的 i18n key（用于 t()）
export const getCoreLabelKey = (id: string): string => {
  const map: Record<string, string> = {
    linkUrl: 'link_url',
    shopName: 'shop_name',
    actualPrice: 'actual_price',
    monthlySales: 'monthly_sales',
    period: 'record_date',
  };
  return map[id] ?? id;
};

// 派生：固定字段 ID 列表（含 link_url 兼容后端）
export const CORE_FIELD_IDS: string[] = [
  ...CORE_FIELDS.map(f => f.id),
  'link_url', // 后端 snake_case
];

// 派生：节点定义只展示的内容字段 ID
export const CONTENT_FIELD_IDS: string[] = CONTENT_FIELDS.map(f => f.id);
