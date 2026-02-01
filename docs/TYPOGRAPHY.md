# Smart Hub 字体层级规范

> 参考 Notion、Linear、Vercel 等成熟 SaaS 的排版体系，统一全站视觉层级。  
> 支持 **中文、日文、英文** 三语，采用开源无版权字体。

## 字体族 (Font Families)

| 语言 | 主字体 | 备选 | 授权 |
|------|--------|------|------|
| **英文** | Inter | -apple-system, BlinkMacSystemFont | OFL (Open Font License) |
| **简体中文** | Noto Sans SC | PingFang SC, Microsoft YaHei | OFL |
| **日文** | Noto Sans JP | Hiragino Kaku Gothic Pro, Meiryo | OFL |

**CSS 组合：**
```css
font-family: 'Inter', 'Noto Sans SC', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
```

- **Inter**：英文数字主字体，几何无衬线，适配 SaaS 界面  
- **Noto Sans SC**：Google 开源，覆盖简体中文，与 Inter 字形和谐  
- **Noto Sans JP**：Google 开源，覆盖日文假名与汉字  

Google Fonts 引入：
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Noto+Sans+SC:wght@400;500;600;700;900&family=Noto+Sans+JP:wght@400;500;600;700;900&display=swap" rel="stylesheet">
```

## 层级定义

| 层级 | 用途 | Tailwind 类 | 字号 | 字重 | 颜色 | 示例 |
|------|------|-------------|------|------|------|------|
| **L1 页面标题** | 页面主标题 | `type-page-title` | 1.5rem–2rem | font-bold | 白 | 产品管理、市场情报中心 |
| **L2 区块标题** | 区块/卡片标题 | `type-section-title` | 0.875rem (14px) | font-semibold | 白 | 产品基础信息、品类参数 |
| **L3 区块副标题** | 英文副标题 | `type-section-subtitle` | 0.625rem (10px) | font-medium | slate-500 | Basic Product Information |
| **L4 字段标签** | 表单/详情字段名 | `type-label` | 0.75rem (12px) | font-semibold | slate-500 | 品类、渠道、价格 |
| **L5 正文/数值** | 主要内容、数据 | `type-value` | 0.875rem (14px) | font-medium | 白 | 充电宝、Amazon、¥199 |
| **L5+ 强调数值** | 关键指标 | `type-value-emphasis` | 1rem (16px) | font-semibold | 白 | 价格、销量、评分 |
| **L6 说明文字** | 提示、时间戳等 | `type-caption` | 0.625rem (10px) | font-medium | slate-400 | 未知、已设置 |

## 三语示例

| 中文 | 日文 | 英文 |
|------|------|------|
| 产品基础信息 | 製品基本情報 | Basic Product Information |
| 品类 | カテゴリ | Category |
| 未设置 | 未設定 | Not Set |

## 字间距 (Letter-spacing)

| 场景 | 值 | 说明 |
|------|------|------|
| **CJK 标题** (中/日) | `0.02em` | 略宽松，避免挤在一起 |
| **英文** | `normal` | 使用字体默认间距 |
| **区块标题 / 副标题** | `0.06em` | 大写字母需适度拉开 |
| **字段标签** | `0.04em` | 介于标题与正文之间 |
| **正文/数值** | `normal` | 保持可读 |

**避免：** `tracking-tighter` (-0.05em)、`tracking-tight` (-0.025em)、`letter-spacing: -0.01em` 等负值，易使 CJK 与拉丁混排显得拥挤。

## 使用原则

1. **页面内仅一个 L1**：用于页面顶部主标题  
2. **区块标题用 L2**：每个卡片/区块一个 L2  
3. **字段名用 L4**：列表、表单、详情页字段名统一  
4. **数据值用 L5**：常规内容用 L5，关键数据用 L5+  
5. **辅助信息用 L6**：状态、时间戳、占位符  
6. **所有可见文案通过 t(key) 切换语言**，禁止硬编码

## CSS 类映射

```
type-page-title      → text-xl sm:text-2xl font-bold text-white
type-section-title   → text-sm font-semibold text-white uppercase tracking-widest
type-section-subtitle→ text-[10px] font-medium text-slate-500 uppercase tracking-widest
type-label           → text-xs font-semibold text-slate-500 uppercase tracking-wider
type-value           → text-sm font-medium text-white
type-value-emphasis  → text-base font-semibold text-white
type-caption         → text-[10px] font-medium text-slate-400
```

## 避免

- 混用 `text-[9px]`、`text-[10px]`、`text-[11px]` 等随意字号  
- 全部使用 `font-black` 导致无层级  
- 标签与数值字号过于接近  
- 硬编码中/日/英文案，未使用 `t(key)` 翻译  
- **负值字间距**：`tracking-tighter`、`letter-spacing: -0.01em` 会使 CJK 与 SKU 等混排显得拥挤
