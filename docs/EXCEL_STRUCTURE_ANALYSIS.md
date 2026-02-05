# 市场调研表 Excel 结构分析

> 基于 `市场调研表-1.1-alex.xlsx` 解析，用于理解 App 需求及导入逻辑

---

## 一、工作簿概览

| Sheet 名称 | 用途 | 行数 |
|-----------|------|------|
| README_使用说明 | 模板说明、使用流程 | 24 |
| Config_下拉选项 | 渠道、形态、协议等枚举配置 | 46 |
| Raw_竞品明细 | 核心竞品数据（主表） | 1000 |
| Review_口碑要点 | 好评/差评关键词、典型原句、归因 | 501 |
| Message_卖点拆解 | 主卖点、支撑证据、表达方式 | 500 |
| PriceLadder_价格阶梯 | 渠道×价格带×代表品牌 | 22 |
| Insights_洞察总结 | 市场范式、同质化、差异化、空白场景 | 22 |

---

## 二、核心表结构

### 1. Raw_竞品明细（主表，导入优先级最高）

**表头（37 列）**：

| 序号 | 列名 | 对应 App 字段 | 说明 |
|-----|------|--------------|------|
| 1 | 记录日期 | createdAt / period | Excel 日期序列 46041 |
| 2 | 渠道/平台 | channel | Yahoo Shopping, Amazon, Rakuten 等 |
| 3 | 店铺名 | shopName | |
| 4 | 上架位置 | attributes.placement | 类目Top 等 |
| 5 | 搜索关键词/入口 | attributes.search_keywords | 多行文本 |
| 6 | 品牌 | brand | |
| 7 | 产品名/型号 | model | |
| 8 | 链接URL | linkUrl | |
| 9 | 形态 | attributes.form_factor | 大容量户外、口袋便携、磁吸背夹 等 |
| 10 | 容量(mAh) | attributes.capacity_mah | |
| 11 | 能量(Wh) | attributes.energy_wh | |
| 12 | 最大输出(V/A/W) | attributes.max_output | |
| 13 | 输入端口 | attributes.input_ports | 逗号分隔 |
| 14 | 输出端口 | attributes.output_ports | 如 USB-A：2 / TYPE-C：1 |
| 15 | 自带线(有/无) | attributes.built_in_cable | |
| 16 | 无线标准 | attributes.wireless_std | Qi 等 |
| 17 | 磁吸/背夹(是/否) | attributes.magnetic | |
| 18 | 重量(g) | attributes.weight_g | |
| 19 | 尺寸(mm) | attributes.dimensions | |
| 20 | 材质/外观要点 | attributes.material | |
| 21 | 协议(逗号分隔) | attributes.protocols | USB PD, PowerIQ 等 |
| 22 | 认证/安全标识 | attributes.certifications | PSE, CCC, CE 等 |
| 23 | 价格(含税) | price | 如 2,180日元 |
| 24 | 常见到手价/券后 | actualPrice | |
| 25 | 价格带 | attributes.price_tier | 主流、入门、中高 |
| 26 | 销量/排名线索 | monthlySales | 可能有 =DISPIMG 公式 |
| 27 | 评分 | rating | 4.78 |
| 28 | 评价数 | attributes.review_count | |
| 29 | 核心卖点一句话 | attributes.selling_points / sellingPoints | |
| 30 | 卖点类型(主) | attributes.selling_point_type | 便携形态型、性能效率型 等 |
| 31 | 差异化要素 | attributes.differentiation | |
| 32 | 配件/套装内容 | attributes.bundle | |
| 33 | 保修/售后承诺 | attributes.warranty | |
| 34 | 包装/礼盒 | attributes.packaging | |
| 35 | 图片风格(主图) | mainImage | 可能有 =DISPIMG 公式 

**特殊值**：

- 日期：Excel 序列号（46041 = 2026-01-16），需转换
- 图片：可能含 `=DISPIMG("ID_xxx",1)` 公式，导入时需跳过或单独处理
- 端口：多行格式如 `USB-A：2\nTYPE-C：1`，可映射为 `multi_select_quantity`
- 价格：含逗号、货币符号，需清洗后转为数字

---

### 2. Config_下拉选项（枚举配置）

**表头**：`枚举类型`, `枚举值（可增删）`, `Key`, `起始行`, `结束行`

**主要枚举**（从样本推断）：

- 渠道/平台：Rakuten, Amazon, Yahoo Shopping, 直营DTC, 线下
- 国家/地区
- 上架位置
- 形态：大容量户外、口袋便携、磁吸背夹 等
- 无线标准
- 卖点类型：便携形态型、性能效率型、价值价格型、生态专属型 等
- 价格带：主流、入门、中高

**与 App 的对应**：

- App 的 `category_templates` 中，SELECT / MULTI_SELECT_QUANTITY 的 `options` 应与此表同步或可配置
- Config 表可作为「品类字段默认选项」的数据源

---

### 3. Review_口碑要点

**表头**：

- 品牌、产品名/型号、链接URL、渠道/平台（用于关联 Raw）
- 好评高频关键词(5-10个)
- 差评高频关键词(5-10个)
- 典型好评原句(<=25字)
- 典型差评原句(<=25字)
- 高频问题归因(你判断)
- 售后/退货相关线索
- 备注

**与 App 的对应**：

- 可映射为产品的 `pros`、`cons`、`raw_review`、`insight_summary` 等
- 需通过 品牌+型号+渠道 或 链接URL 与 Raw 主表关联

---

### 4. Message_卖点拆解

**表头**：

- 品牌、产品名/型号、链接URL（关联字段）
- 主卖点(1)、(2)、(3)
- 支撑证据(参数/机制)
- 表达方式(标题/主图/视频/详情)

**与 App 的对应**：

- 可扩展 `selling_points` 为多卖点结构
- 或作为 `attributes.selling_point_1/2/3` 及 `attributes.evidence_1/2/3` 等

---

### 5. PriceLadder_价格阶梯

**表头**：渠道/平台、价格带、典型价格区间、代表品牌/款型、备注

**用途**：市场分析、AI 报告、可视化，非产品主表。

---

### 6. Insights_洞察总结

**表头**：阶段、观察到的市场范式、同质化点、差异化机会、空白主流场景/人群、值得深挖的品牌/款型、下一步行动

**用途**：洞察归档、AI 输入，非产品主表。

---

## 三、与 App 的映射关系

### 固定字段（products 表列）

| Excel 列 | App 字段 | 类型 |
|----------|----------|------|
| 品牌 | brand | TEXT |
| 产品名/型号 | model | TEXT |
| 渠道/平台 | channel | TEXT |
| 店铺名 | shopName | TEXT |
| 链接URL | linkUrl | TEXT |
| 价格(含税) | price | DECIMAL |
| 常见到手价/券后 | actualPrice | DECIMAL |
| 销量/排名线索 | monthlySales | INTEGER |
| 评分 | rating | DECIMAL |
| 图片风格(主图) | mainImage | TEXT |
| 记录日期 | created_at | TIMESTAMP |

### 动态字段（attributes JSONB / category_templates）

- 形态、容量、能量、最大输出、输入/输出端口
- 自带线、无线标准、磁吸
- 重量、尺寸、材质
- 协议、认证
- 价格带、评价数
- 核心卖点、卖点类型、差异化
- 配件、保修、包装
- 上架位置、搜索关键词、备注、数据可信度

### Review / Message 关联逻辑

- 关联键：`brand` + `model` + `linkUrl`（或 `channel`）
- 导入时可：先导入 Raw → 再导入 Review/Message，按关联键合并到同一产品的 `attributes`

---

## 四、导入实现建议

### 阶段 1：Raw_竞品明细

1. 定义列与 App 字段的映射（中英文列名 + 下标）
2. 日期：Excel 序列号 → ISO 日期
3. 价格：去除逗号、货币符号 → 数字
4. 图片：`=DISPIMG(...)` 跳过或置空
5. 端口/协议：逗号或换行分隔 → 数组或 `multi_select_quantity` 格式
6. 选择品类（如充电宝）→ 校验必填 → 写入 `products` + `attributes`

### 阶段 2：Config_下拉选项

- 解析枚举表 → 同步到 `category_templates.options` 或独立配置表
- 供品类字段下拉选项使用

### 阶段 3：Review / Message（可选）

- 解析后按 品牌+型号+链接 关联已有产品
- 合并写入 `attributes.pros`、`attributes.cons`、`attributes.insight_summary` 等

---

## 五、品类「充电宝」字段建议

基于 Excel 列，充电宝品类建议包含：

| field_key | field_name | field_type | 说明 |
|-----------|------------|------------|------|
| placement | 上架位置 | select | 类目Top 等 |
| form_factor | 形态 | select | 大容量户外、口袋便携、磁吸背夹 |
| capacity_mah | 容量(mAh) | number | |
| energy_wh | 能量(Wh) | number | |
| max_output | 最大输出 | text | V/A/W |
| input_ports | 输入端口 | text | |
| output_ports | 输出端口 | multi_select_quantity | USB-A, TYPE-C 等 |
| built_in_cable | 自带线 | select | 有/无 |
| wireless_std | 无线标准 | select | Qi 等 |
| magnetic | 磁吸/背夹 | select | 是/否 |
| weight_g | 重量(g) | number | |
| dimensions | 尺寸(mm) | text | |
| protocols | 协议 | text | 逗号分隔 |
| certifications | 认证 | text | |
| price_tier | 价格带 | select | 主流、入门、中高 |
| selling_point_type | 卖点类型(主) | select | 便携形态型、性能效率型 等 |
| selling_points | 核心卖点 | textarea | |
| pros | 好评要点 | textarea | 来自 Review |
| cons | 差评要点 | textarea | 来自 Review |
| insight_summary | 洞察/归因 | textarea | 来自 Review |

---

*文档基于 市场调研表-1.1-alex.xlsx 解析结果生成*
