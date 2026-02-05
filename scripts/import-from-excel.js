/**
 * 从 Excel 导入产品到 Supabase（使用 SERVICE_ROLE_KEY，不经过浏览器登录）
 *
 * 用法：
 *   node scripts/import-from-excel.js [Excel文件路径]
 *   npm run import:excel
 *   npm run import:excel -- path/to/产品.xlsx
 *
 * 默认读取项目根目录下第一个 .xlsx 文件，或环境变量 IMPORT_EXCEL_PATH。
 * 表头与 docs/EXCEL_STRUCTURE_ANALYSIS.md 中 Raw_竞品明细 一致时自动映射。
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');

// 从 .env 读取配置
function loadEnv() {
  const envPath = join(rootDir, '.env');
  if (!existsSync(envPath)) {
    console.error('请在项目根目录创建 .env，并配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const raw = readFileSync(envPath, 'utf8');
  const env = {};
  raw.split('\n').forEach((line) => {
    const eq = line.indexOf('=');
    if (eq <= 0) return;
    let k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k && v) env[k] = v;
  });
  return env;
}

// Excel 列名 -> 产品表固定字段
const COL_TO_FIXED = {
  品牌: 'brand',
  产品名: 'model',
  '产品名/型号': 'model',
  型号: 'model',
  渠道: 'channel',
  '渠道/平台': 'channel',
  店铺名: 'shop_name',
  链接: 'link_url',
  '链接URL': 'link_url',
  linkUrl: 'link_url',
  价格: 'price',
  '价格(含税)': 'price',
  到手价: 'actual_price',
  '常见到手价/券后': 'actual_price',
  actualPrice: 'actual_price',
  销量: 'monthly_sales',
  '销量/排名线索': 'monthly_sales',
  monthlySales: 'monthly_sales',
  月销量: 'monthly_sales',
  评分: 'rating',
  rating: 'rating',
  主图: 'main_image',
  '图片风格(主图)': 'main_image',
  mainImage: 'main_image',
};

// 这些列放入 attributes（其余未识别的也进 attributes，用英文 key）
const COL_TO_ATTR = {
  记录日期: 'period',
  '渠道/平台': null,
  上架位置: 'placement',
  '搜索关键词/入口': 'search_keywords',
  形态: 'form_factor',
  '容量(mAh)': 'capacity_mah',
  '能量(Wh)': 'energy_wh',
  '最大输出(V/A/W)': 'max_output',
  输入端口: 'input_ports',
  输出端口: 'output_ports',
  '自带线(有/无)': 'built_in_cable',
  无线标准: 'wireless_std',
  '磁吸/背夹(是/否)': 'magnetic',
  '重量(g)': 'weight_g',
  '尺寸(mm)': 'dimensions',
  '材质/外观要点': 'material',
  '协议(逗号分隔)': 'protocols',
  认证: 'certifications',
  '认证/安全标识': 'certifications',
  价格带: 'price_tier',
  评价数: 'review_count',
  '核心卖点一句话': 'selling_points',
  sellingPoints: 'selling_points',
  '卖点类型(主)': 'selling_point_type',
  差异化要素: 'differentiation',
  '配件/套装内容': 'bundle',
  '保修/售后承诺': 'warranty',
  '包装/礼盒': 'packaging',
  备注: 'remark',
  '数据来源可信度': 'dataReliability',
  pros: 'pros',
  cons: 'cons',
  raw_review: 'raw_review',
  insight_summary: 'insight_summary',
};

function toNum(v) {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const s = String(v).replace(/,/g, '').replace(/[¥￥\s]/g, '');
  const n = parseFloat(s);
  return Number.isNaN(n) ? undefined : n;
}

/** 从「销量/排名线索」等文本中提取第一个数字（如 "约1500" -> 1500） */
function extractFirstNum(v) {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const m = /[\d.]+/.exec(String(v));
  return m ? parseFloat(m[0]) : undefined;
}

/** 最大输出(V/A/W) 等：取数字部分 */
function toNumFromUnit(v) {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const m = /[\d.]+/.exec(String(v));
  return m ? parseFloat(m[0]) : undefined;
}

function toStr(v) {
  if (v == null) return '';
  const s = String(v).trim();
  return s;
}

// 跳过公式或占位图
function skipFormula(v) {
  const s = toStr(v);
  if (s.startsWith('=') || /DISPIMG|IMAGE/i.test(s)) return '';
  return s;
}

function excelDateToISO(serial) {
  if (serial == null || serial === '') return undefined;
  const n = toNum(serial);
  if (n == null) return undefined;
  const d = new Date((n - 25569) * 86400 * 1000);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function rowToProduct(row, headers, defaultCategoryId = 'cat_powerbank') {
  const fixed = {
    category_id: defaultCategoryId,
    brand: '',
    model: '',
    channel: '',
    shop_name: '',
    link_url: '',
    price: 0,
    actual_price: null,
    monthly_sales: 0,
    rating: 0,
    main_image: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
  const attributes = {};

  headers.forEach((h, i) => {
    const key = (h && String(h).trim()) || '';
    const val = row[i];
    if (key === '') return;

    const fixedField = COL_TO_FIXED[key];
    if (fixedField) {
      if (fixedField === 'main_image') {
        fixed.main_image = skipFormula(val);
      } else if (fixedField === 'monthly_sales') {
        const n = toNum(val) ?? extractFirstNum(val);
        if (n != null) fixed.monthly_sales = Math.max(0, n);
      } else if (fixedField === 'price' || fixedField === 'actual_price' || fixedField === 'rating') {
        const n = toNum(val);
        if (n != null) fixed[fixedField] = fixedField === 'rating' ? Math.min(5, Math.max(0, n)) : n;
        if (fixedField === 'actual_price' && (val == null || val === '')) fixed.actual_price = null;
      } else {
        const s = toStr(val);
        if (s) fixed[fixedField] = s;
      }
      return;
    }

    const attrKey = COL_TO_ATTR[key];
    if (attrKey) {
      if (attrKey === 'period') {
        const iso = excelDateToISO(val);
        if (iso) attributes.period = iso;
      } else if (attrKey === 'max_output') {
        const n = toNumFromUnit(val);
        if (n != null) attributes.max_output = n;
      } else if (attrKey === 'capacity_mah' || attrKey === 'review_count' || attrKey === 'energy_wh' || attrKey === 'weight_g') {
        const n = toNum(val) ?? extractFirstNum(val);
        if (n != null) attributes[attrKey] = n;
      } else if (val != null && String(val).trim() !== '') {
        attributes[attrKey] = typeof val === 'number' ? val : String(val).trim();
      }
      return;
    }

    if (val != null && String(val).trim() !== '') {
      const safeKey = key.replace(/\s+/g, '_').slice(0, 64);
      attributes[safeKey] = typeof val === 'number' ? val : String(val).trim();
    }
  });

  if (!fixed.brand && !fixed.model) return null;
  return { ...fixed, attributes };
}

/** 从 Review_口碑要点 构建 链接URL/品牌+型号+渠道 -> { pros, cons, raw_review, insight_summary } */
function buildReviewMap(wb) {
  const map = new Map();
  const sheet = wb.Sheets['Review_口碑要点'];
  if (!sheet) return map;
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!data.length) return map;
  const h = data[0].map((x) => (x != null ? String(x).trim() : ''));
  const idx = {
    brand: h.indexOf('品牌'),
    model: h.indexOf('产品名/型号'),
    link: h.indexOf('链接URL'),
    channel: h.indexOf('渠道/平台'),
    pros: h.indexOf('好评高频关键词(5-10个)'),
    cons: h.indexOf('差评高频关键词(5-10个)'),
    prosSample: h.indexOf('典型好评原句(<=25字)'),
    consSample: h.indexOf('典型差评原句(<=25字)'),
    insight: h.indexOf('高频问题归因(你判断)'),
    afterSale: h.indexOf('售后/退货相关线索'),
    remark: h.indexOf('备注'),
  };
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const link = toStr(row[idx.link]);
    const brand = toStr(row[idx.brand]);
    const model = toStr(row[idx.model]);
    const channel = toStr(row[idx.channel]);
    const key = link || [brand, model, channel].filter(Boolean).join('|');
    if (!key) continue;
    const norm = key.toLowerCase().trim();
    const pros = toStr(row[idx.pros]);
    const prosSample = toStr(row[idx.prosSample]);
    const cons = toStr(row[idx.cons]);
    const consSample = toStr(row[idx.consSample]);
    const insight = toStr(row[idx.insight]);
    const afterSale = toStr(row[idx.afterSale]);
    const remark = toStr(row[idx.remark]);
    map.set(norm, {
      pros: pros || undefined,
      pros_sample: prosSample || undefined,
      cons: cons || undefined,
      raw_review: consSample || undefined,
      insight_summary: insight || undefined,
      after_sale: afterSale || undefined,
      review_remark: remark || undefined,
    });
  }
  return map;
}

function rowToProductWithReview(row, headers, defaultCategoryId, reviewMap) {
  const product = rowToProduct(row, headers, defaultCategoryId);
  if (!product || !reviewMap || reviewMap.size === 0) return product;
  const key = (product.link_url || '').trim() || [product.brand, product.model, product.channel].filter(Boolean).join('|');
  if (!key) return product;
  const review = reviewMap.get(key.toLowerCase());
  if (!review) return product;
  Object.assign(product.attributes, review);
  return product;
}

function getExcelPath() {
  const arg = process.argv[2];
  if (arg) {
    const p = resolve(process.cwd(), arg);
    if (existsSync(p)) return p;
    if (existsSync(arg)) return arg;
  }
  const envPath = process.env.IMPORT_EXCEL_PATH;
  if (envPath && existsSync(envPath)) return envPath;
  try {
    const files = readdirSync(rootDir).filter((f) => /\.xlsx?$/i.test(f));
    if (files.length) return join(rootDir, files[0]);
  } catch (_) {}
  return null;
}

async function main() {
  const excelPath = getExcelPath();
  if (!excelPath) {
    console.error('未找到 Excel 文件。请：');
    console.error('  node scripts/import-from-excel.js <路径/产品.xlsx>');
    console.error('  或将 .xlsx 文件放在项目根目录');
    process.exit(1);
  }

  const env = loadEnv();
  const url = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('.env 中需配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('读取 Excel:', excelPath);
  const buf = readFileSync(excelPath);
  const wb = XLSX.read(buf, { type: 'buffer', cellFormula: false });
  const sheetName = wb.SheetNames.find((n) => /Raw_竞品明细|竞品明细/i.test(n)) || wb.SheetNames.find((n) => /raw|竞品|明细/i.test(n)) || wb.SheetNames[0];
  console.log('使用 Sheet:', sheetName);
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!data.length) {
    console.error('表为空');
    process.exit(1);
  }

  const headers = data[0].map((h) => (h != null ? String(h).trim() : ''));
  const rows = data.slice(1);
  const defaultCategory = process.env.IMPORT_DEFAULT_CATEGORY || 'cat_powerbank';

  const reviewMap = buildReviewMap(wb);
  console.log('Review_口碑要点 关联条数:', reviewMap.size);

  const products = [];
  for (const row of rows) {
    const p = rowToProductWithReview(row, headers, defaultCategory, reviewMap);
    if (p) products.push(p);
  }

  if (!products.length) {
    console.error('没有可导入的行（需至少包含 品牌 或 产品名/型号）');
    process.exit(1);
  }

  const clearCategory = process.env.IMPORT_CLEAR_CATEGORY || '';
  if (clearCategory) {
    console.log('清空该品类下已有产品:', clearCategory);
    const { error: delErr } = await supabase.from('products').delete().eq('category_id', clearCategory);
    if (delErr) {
      console.error('清空失败:', delErr.message);
      process.exit(1);
    }
  }

  console.log('准备导入', products.length, '条产品，品类默认:', defaultCategory);
  const BATCH = 20;
  let ok = 0;
  let err = 0;
  for (let i = 0; i < products.length; i += BATCH) {
    const chunk = products.slice(i, i + BATCH);
    const { data: inserted, error } = await supabase.from('products').insert(chunk).select('id');
    if (error) {
      console.error('插入失败:', error.message);
      err += chunk.length;
    } else {
      ok += (inserted || []).length;
      console.log('已导入', ok, '/', products.length);
    }
  }
  console.log('完成。成功:', ok, '失败:', err);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
