# 调研架构板块 · 默认字段合理性分析

> 基于 `市场调研表-1.1-alex.xlsx` 与当前 App 结构对比

---

## 一、当前结构概览

### 1.1 核心固定字段（CORE_SYSTEM_FIELDS）

| 字段 ID | 名称 | 类型 | Excel 对应 |
|---------|------|------|------------|
| brand | 品牌 | TEXT | ✓ 品牌 |
| model | 产品名/型号 | TEXT | ✓ 产品名/型号 |
| linkUrl | 产品链接 | URL | ✓ 链接URL |
| channel | 渠道/平台 | SELECT | ✓ 渠道/平台 |
| shopName | 店铺名 | TEXT | ✓ 店铺名 |
| price | 价格 | NUMBER | ✓ 价格(含税) |
| monthlySales | 月销量 | NUMBER | ✓ 销量/排名线索 |
| rating | 评分 | RATING | ✓ 评分 |
| mainImage | 主图 | IMAGE | ✓ 图片风格(主图) |

### 1.2 新建品类默认动态字段（CATEGORY_SPECIFIC_FIELDS）

| 字段 ID | 名称 | 类型 | Excel 对应 |
|---------|------|------|------------|
| period | 记录日期 | DATE | 记录日期 (Raw 第1列) |
| dataReliability | 数据可信度 | SELECT | 无直接对应 |
| sellingPoints | 核心卖点 (USP) | TEXTAREA | ✓ 核心卖点一句话 |
| marketDiff | 差异化/空白机会 | TEXTAREA | ✓ 差异化要素 |
| proPoints | 好评高频词 | TEXT | Review 表 好评高频关键词 |
| conPoints | 差评高频词 | TEXT | Review 表 差评高频关键词 |
| targetAudience | 场景/人群分析 | TEXT | Insights 表 空白主流场景/人群 |

---

## 二、Excel 与 App 对照结论

### 2.1 核心字段缺失

| Excel 列 | 说明 | 建议 |
|----------|------|------|
| **到手价/券后** (actualPrice) | 常见到手价、券后价，电商通用 | **应加入 CORE**：DB 已有 `actual_price` 列，但未接入表单与保存逻辑 |

### 2.2 电商共性字段（建议加入默认品类字段）

以下字段在 Excel Raw 表中存在，且与品类无关，适合作为「新建品类默认字段」：

| Excel 列 | 字段建议 | 类型 | 说明 |
|----------|----------|------|------|
| 上架位置 | placement | SELECT | 类目Top、首页推荐 等 |
| 搜索关键词/入口 | search_keywords | TEXTAREA | 多行文本 |
| 价格带 | price_tier | SELECT | 主流、入门、中高 |
| 评价数 | review_count | NUMBER | 电商通用指标 |
| 卖点类型(主) | selling_point_type | SELECT | 便携形态型、性能效率型、价值价格型、生态专属型 |

### 2.3 当前默认字段与 Excel 的对应关系

| 当前字段 | 状态 |
|----------|------|
| period (记录日期) | 合理，对应 Excel 记录日期 |
| dataReliability | 合理，调研特有 |
| sellingPoints | ✓ 对应核心卖点 |
| marketDiff | ✓ 对应差异化要素 |
| proPoints / conPoints | 对应 Review 高频词，建议保留；Excel 另有 典型好评/差评原句 可映射为 pros / cons |
| targetAudience | 合理，对应 Insights 场景/人群 |

### 2.4 品类专属字段（不放入默认）

以下为品类相关，应由用户按品类自行配置：

- 形态 (form_factor)、容量 (capacity_mah)、重量 (weight_g)、尺寸 (dimensions)
- 输入/输出端口、协议、认证、自带线、无线标准、磁吸
- 配件、保修、包装 等

---

## 三、建议调整汇总

### 3.1 核心固定字段

- **新增**：`actualPrice`（到手价/券后）
- **Settings 展示**：补充 `shopName`（当前展示列表缺失）

### 3.2 新建品类默认字段（CATEGORY_SPECIFIC_FIELDS）

在保留现有字段基础上，**新增** 5 个电商共性字段：

1. **placement** - 上架位置 (SELECT)
2. **search_keywords** - 搜索关键词/入口 (TEXTAREA)
3. **price_tier** - 价格带 (SELECT: 主流、入门、中高)
4. **review_count** - 评价数 (NUMBER)
5. **selling_point_type** - 卖点类型(主) (SELECT)

可选扩展（与 Review 表对齐）：

- **pros** - 典型好评原句 (TEXTAREA)
- **cons** - 典型差评原句 (TEXTAREA)
- **raw_review** - 典型差评/痛点原句 (TEXTAREA)
- **insight_summary** - 洞察/归因 (TEXTAREA)

当前 `sellingPoints`、`proPoints`、`conPoints`、`marketDiff` 已覆盖主要场景，pros/cons/raw_review/insight_summary 可后续按需加入。

---

## 四、实施优先级

| 优先级 | 项目 | 状态 |
|--------|------|------|
| P0 | actualPrice 接入 CORE + 表单 + 保存 | ✅ 已完成 |
| P0 | Settings 核心字段展示补全 shopName | ✅ 已完成 |
| P1 | CATEGORY_SPECIFIC_FIELDS 新增 5 个电商共性字段 | ✅ 已完成 |
| P2 | 视需求增加 pros/cons/raw_review/insight_summary | 待定 |

**P1 新增字段**：placement（上架位置）、search_keywords（搜索关键词/入口）、price_tier（价格带）、review_count（评价数）、selling_point_type（卖点类型(主)）。
