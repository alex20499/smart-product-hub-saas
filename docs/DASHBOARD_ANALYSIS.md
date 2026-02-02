# 数据概览页 (Dashboard) 深度分析报告

## 一、业务逻辑

### 1.1 筛选与数据流

```
products (全量) 
  → marketData: 按 category + channel 筛选
  → focusData: 按 brand 筛选 (marketData 的子集)
  → marketBasics: 基于 marketData 计算 (totalSales, avgPrice)
  → tacticalMetrics: 基于 focusData vs marketBasics (segmentSales, marketShare, priceIndex)
```

- **marketShare**：当 brand=all 时，focusData=marketData，故显示 100%（表示「当前细分全量」）
- **priceIndex**：选中品牌均价 / 市场均价 × 100，>100 为溢价，<100 为低价位
- 逻辑正确，无问题

### 1.2 AI 分析触发条件

- 市场分析：需同时选择 category 和 channel（`isAiReady`）
- 单品分析：在详情弹窗内点击按钮即可
- 合理

### 1.3 详情弹窗产品来源

- `detailedProduct = products.find(p => p.id === activeDetailId)` 从全量 products 查找
- 排行榜来自 `marketData`（已筛选），点击后从全量取详情，保证信息完整
- 设计合理

---

## 二、已修复的 Bug

| Bug | 修复 |
|-----|------|
| **评分星级显示错误** | 4.75 分之前会显示 5 颗满星。已改为 `Math.floor(r)` 判断整星，`r % 1 >= 0.5` 判断半星 |
| **卖点未按逗号拆分** | `sellingPoints` 存为逗号分隔字符串时，之前整串显示为一个标签。已改为 `split(',').map(trim).filter(Boolean)` |
| **痛点/洞察字段兼容** | 仅支持 `raw_review`、`insight_summary`。已增加 `rawReview`、`insightSummary` 的 camelCase 回退 |

---

## 三、已完成的优化

### 3.1 市场渗透卡片 UX

- 当 brand=all 时，副标题由「市场占比」改为「当前细分全量」
- 避免 100% 被误解为「占整个市场 100%」

### 3.2 散点图象限参考线

- 当 SKU ≥ 4 时，自动绘制中位价、中位销量的虚线
- 将图表分为四个象限：高价高量、高价低量、低价高量、低价低量
- 便于快速判断产品分布

### 3.3 国际化

- 将 8 处硬编码英文字符串替换为 `t()` 调用
- 新增翻译：segment_coverage、price_sales_matrix、units_current_view、ai_generated_via、product_sell_points、customer_voice_analysis、critical_pain_point、market_opportunity_analysis

---

## 四、已实现的可视化增强

1. **品牌份额饼图「其他」聚合**：品牌数 > 8 时，将长尾品牌合并为「Others」
2. **排行榜排序**：支持按销量、价格、评分切换排序
3. **评分分布**：柱状图展示 0–1、1–2、2–3、3–4、4–5 星产品数量

## 五、后续可选增强

- **时间维度**：若有月度快照，可增加月份筛选与趋势图

---

## 六、技术说明

- **Recharts**：ScatterChart 使用 `ReferenceLine` 绘制参考线
- **SafeChartContainer**：250ms 延迟渲染，避免 Recharts 初始化问题
- **COLORS**：饼图与散点图共用 6 色配色
