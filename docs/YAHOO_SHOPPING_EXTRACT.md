# Yahoo Shopping 商品详情页抓取与 AI 部署说明

以 [Anker Nano Power Bank (Yahoo!ショッピング)](https://store.shopping.yahoo.co.jp/ankerdirect/a1645.html) 为例，说明页面结构及如何部署 AI 有效抓取字段。

---

## 1. 页面结构要点

### 1.1 两个评分（必须区分）

| 位置 | 示例 | 含义 | 是否填入 product.rating |
|------|------|------|--------------------------|
| 店铺/ストア区域 | **4.72（7,766件）** | ストア評価（店铺整体评价） | ❌ 不填 |
| 商品/価格区域 | **4.59（661件）** | 商品の評価（该单品评价） | ✅ 填此值 |

- 单品评分通常出现在 **「価格」「3,990円」「送料」** 附近。
- 系统规则：从原文中找所有 `X.XX（N件）`，取**最靠近「価格」或「円」**的那一个作为 `rating`，避免误用店铺 4.72。

### 1.2 价格

- 正文中：`3,990円`、`価格` 等。
- 规则提取：匹配 `[\d,]+円` 或 `¥[\d,]+`，取数字作为 `price` / `actualPrice`。

### 1.3 品牌 / 店铺 / 商品名

- **品牌**: Anker（标题或店铺名中）
- **店铺**: AnkerDirect
- **商品名/型号**: モバイルバッテリーアンカー 小型コンパクト 5000mAh Anker Nano Power Bank (12W、Lightningコネクタ内蔵) 【ライトニング端子一体型】
- **渠道**: Yahoo Shopping / Yahoo!ショッピング

### 1.4 商品情報・规格（表格或段落）

- **商品カテゴリ**: モバイルバッテリー 等
- **JAN/ISBNコード**: 4571411208706
- **商品コード**: A1645
- 规格描述中的 **5000mAh、12W、Lightning** 等，对应品类字段（如容量、接口、功率）填入 `attributes` 或对应 key。

### 1.5 レビュー中的补充信息

- 重量等可能出现在口コミ中，如「本体は100gです」→ 可填入重量相关字段（若品类有该字段）。

---

## 2. 部署 AI 抓取的有效字段建议

### 2.1 核心字段（系统固定）

| 字段 key | 说明 | 来源建议 |
|----------|------|----------|
| brand | 品牌 | 标题/店铺名，如 Anker |
| model | 商品名/型号 | 主标题全文或缩短 |
| channel | 渠道 | 固定 "Yahoo Shopping" 或 "Yahoo!ショッピング" |
| shop_name | 店铺名 | AnkerDirect |
| link_url | 详情页 URL | 用户输入的链接 |
| price | 价格（数字） | **规则提取** 3,990 |
| actual_price | 到手价 | 同 price（无券时） |
| rating | 评分（数字） | **规则提取**，仅用靠近「価格/円」的 4.59 |
| monthly_sales | 月销量 | 若页面有则填，否则 null |
| main_image | 主图 URL | 若原文/HTML 中有首图 URL 则填 |

### 2.2 品类相关字段（attributes 或品类字段）

- **容量**: 5000mAh（标题或规格）
- **接口/充电**: 12W、Lightningコネクタ内蔵（标题或规格）
- **重量**: 100g（若出现在レビュー或规格表）
- **尺寸**: 若有「寸法」等则填
- **商品コード / JAN**: A1645、4571411208706（商品情報表格）

AI 只需按「当前品类已建字段」从原文中抽取对应键值；评分与价格由**规则优先**，AI 可填 null。

---

## 3. 当前实现要点

1. **评分**：`extractRatingFromRawText(raw)`  
   - 匹配所有 `X.XX（N件）`，取与「価格」或「円」**距离最近**的一组作为单品评分，避免用店铺 4.72。

2. **价格**：`extractPriceFromRawText(raw)`  
   - 匹配 `¥`/`円` 后的数字，作为 price/actualPrice。

3. **AI 只填文本**：  
   - Prompt 中说明「Yahoo Shopping 等日站有两个评分，只填单品相关信息；评分和价格由系统另行提取」。  
   - AI 输出 brand、model、channel、shop_name、规格/容量/接口等；rating/price 由上述规则覆盖。

4. **「展开更多」**：  
   - 若规格在「もっと見る」等动态区域，当前拉取首屏 HTML 可能不包含。  
   - 建议：用户先在浏览器展开后复制全文，或将链接交给 GPT 抓取完整内容再粘贴到「从文本录入」。

---

## 4. 测试用 URL

- 商品页: https://store.shopping.yahoo.co.jp/ankerdirect/a1645.html?sc_i=shopping-pc-web-list-ranking-crk01_02-title  
- 期望：rating = **4.59**（不是 4.72），price = **3990**，brand = Anker，model 含 5000mAh / 12W / Lightning 等关键词。
