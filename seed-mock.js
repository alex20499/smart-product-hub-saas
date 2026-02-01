/**
 * 向各品类注入 3-5 条假数据，用于整体页面测试
 * 运行: node seed-mock.js
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '.env');
let supabaseUrl = '';
let supabaseKey = '';

try {
  const env = readFileSync(envPath, 'utf8');
  env.split('\n').forEach(line => {
    const [k, v] = line.split('=').map(s => s?.trim());
    if (k === 'SUPABASE_URL' && v) supabaseUrl = (v || '').replace(/^["']|["']$/g, '');
    if (k === 'SUPABASE_ANON_KEY' && v) supabaseKey = (v || '').replace(/^["']|["']$/g, '');
  });
} catch (_) {}
if (!supabaseUrl || !supabaseKey) {
  console.error('请在项目根目录 .env 中配置 SUPABASE_URL 和 SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 各品类 3-5 条假数据（与 constants.ts MOCK_PRODUCTS 对应）
const TODAY = new Date().toISOString().split('T')[0];
const mockProducts = [
  { category_id: 'cat_powerbank', brand: 'Anker', model: '737 Power Bank (GaNPrime)', channel: 'Amazon', shop_name: 'Anker Official', price: 199, monthly_sales: 4500, rating: 4.8, main_image: 'https://picsum.photos/seed/m1/400/500', attributes: { capacity_mah: 24000, max_output: 140, sellingPoints: 'PD 3.1 140W双向快充，智能数显屏。' } },
  { category_id: 'cat_powerbank', brand: '小米', model: '10000mAh 33W 快充版', channel: 'Rakuten', shop_name: '小米旗舰店', price: 89, monthly_sales: 12000, rating: 4.6, main_image: 'https://picsum.photos/seed/m2/400/500', attributes: { capacity_mah: 10000, max_output: 33, sellingPoints: '高性价比，小米生态链。' } },
  { category_id: 'cat_powerbank', brand: '罗马仕', model: 'Sense 6+ 20000mAh', channel: 'Yahoo Shopping', shop_name: 'Romoss Store', price: 129, monthly_sales: 8000, rating: 4.5, main_image: 'https://picsum.photos/seed/m3/400/500', attributes: { capacity_mah: 20000, max_output: 22, sellingPoints: '大容量，双USB输出。' } },
  { category_id: 'cat_powerbank', brand: '紫米', model: '20号 Pro 25000mAh', channel: 'Amazon', shop_name: 'ZMI Official', price: 369, monthly_sales: 3200, rating: 4.9, main_image: 'https://picsum.photos/seed/m4/400/500', attributes: { capacity_mah: 25000, max_output: 200, sellingPoints: '专业级，支持笔记本充电。' } },
  { category_id: 'cat_powerbank', brand: '品胜', model: 'PB-T20 20000mAh', channel: 'Rakuten', shop_name: 'Pisen Direct', price: 99, monthly_sales: 5600, rating: 4.4, main_image: 'https://picsum.photos/seed/m5/400/500', attributes: { capacity_mah: 20000, max_output: 18, sellingPoints: '国民品牌，稳定耐用。' } },

  { category_id: 'cat_earbuds', brand: 'Apple', model: 'AirPods Pro 2', channel: 'Amazon', shop_name: 'Apple Store', price: 1899, monthly_sales: 15000, rating: 4.9, main_image: 'https://picsum.photos/seed/e1/400/500', attributes: { battery_life: 6, bluetooth_version: '5.3', noise_cancelling: '主动降噪', water_resistance: 'IPX4' } },
  { category_id: 'cat_earbuds', brand: '索尼', model: 'WF-1000XM5', channel: 'Rakuten', shop_name: 'Sony Direct', price: 1499, monthly_sales: 6200, rating: 4.8, main_image: 'https://picsum.photos/seed/e2/400/500', attributes: { battery_life: 8, bluetooth_version: '5.3', noise_cancelling: '主动降噪' } },
  { category_id: 'cat_earbuds', brand: '华为', model: 'FreeBuds Pro 3', channel: 'Yahoo Shopping', shop_name: 'Huawei VMall', price: 899, monthly_sales: 9800, rating: 4.7, main_image: 'https://picsum.photos/seed/e3/400/500', attributes: { battery_life: 7, bluetooth_version: '5.3', noise_cancelling: '主动降噪' } },
  { category_id: 'cat_earbuds', brand: '小米', model: 'Buds 4 Pro', channel: 'Amazon', shop_name: 'Xiaomi Global', price: 699, monthly_sales: 11000, rating: 4.6, main_image: 'https://picsum.photos/seed/e4/400/500', attributes: { battery_life: 9, bluetooth_version: '5.3', noise_cancelling: '主动降噪' } },

  { category_id: 'cat_smartwatch', brand: 'Apple', model: 'Watch Ultra 2', channel: 'Amazon', shop_name: 'Apple Store', price: 6499, monthly_sales: 4200, rating: 4.9, main_image: 'https://picsum.photos/seed/s1/400/500', attributes: { screen_size: 1.92, battery_days: 2, water_resistance: '100m' } },
  { category_id: 'cat_smartwatch', brand: '华为', model: 'Watch GT 4', channel: 'Rakuten', shop_name: 'Huawei VMall', price: 1488, monthly_sales: 8500, rating: 4.8, main_image: 'https://picsum.photos/seed/s2/400/500', attributes: { screen_size: 1.43, battery_days: 14, water_resistance: '50m' } },
  { category_id: 'cat_smartwatch', brand: '小米', model: 'Watch S3', channel: 'Yahoo Shopping', shop_name: 'Xiaomi Global', price: 999, monthly_sales: 12000, rating: 4.6, main_image: 'https://picsum.photos/seed/s3/400/500', attributes: { screen_size: 1.43, battery_days: 15, water_resistance: '50m' } },
  { category_id: 'cat_smartwatch', brand: 'OPPO', model: 'Watch 4 Pro', channel: 'Amazon', shop_name: 'OPPO Store', price: 2299, monthly_sales: 3600, rating: 4.7, main_image: 'https://picsum.photos/seed/s4/400/500', attributes: { screen_size: 1.91, battery_days: 5, water_resistance: '50m' } },

  { category_id: 'cat_laptop', brand: 'Apple', model: 'MacBook Pro 14 M3 Pro', channel: 'Amazon', shop_name: 'Apple Store', price: 14999, monthly_sales: 2800, rating: 4.9, main_image: 'https://picsum.photos/seed/l1/400/500', attributes: { cpu_model: 'M3 Pro', ram_gb: 18, storage_gb: 512, screen_size: 14.2, weight_kg: 1.55 } },
  { category_id: 'cat_laptop', brand: '联想', model: 'ThinkPad X1 Carbon', channel: 'Rakuten', shop_name: 'Lenovo Direct', price: 9999, monthly_sales: 4500, rating: 4.7, main_image: 'https://picsum.photos/seed/l2/400/500', attributes: { cpu_model: 'i7-1365U', ram_gb: 16, storage_gb: 512, screen_size: 14, weight_kg: 1.12 } },
  { category_id: 'cat_laptop', brand: '华为', model: 'MateBook X Pro', channel: 'Yahoo Shopping', shop_name: 'Huawei VMall', price: 8999, monthly_sales: 6200, rating: 4.8, main_image: 'https://picsum.photos/seed/l3/400/500', attributes: { cpu_model: 'i7-1360P', ram_gb: 16, storage_gb: 512, screen_size: 14.2, weight_kg: 1.26 } },
  { category_id: 'cat_laptop', brand: '小米', model: 'RedmiBook Pro 15', channel: 'Amazon', shop_name: 'Xiaomi Global', price: 4999, monthly_sales: 9500, rating: 4.5, main_image: 'https://picsum.photos/seed/l4/400/500', attributes: { cpu_model: 'i5-13500H', ram_gb: 16, storage_gb: 512, screen_size: 15.6, weight_kg: 1.78 } },

  { category_id: 'cat_phone', brand: 'Apple', model: 'iPhone 15 Pro Max', channel: 'Amazon', shop_name: 'Apple Store', price: 9999, monthly_sales: 22000, rating: 4.9, main_image: 'https://picsum.photos/seed/p1/400/500', attributes: { screen_size: 6.7, ram_gb: 8, storage_gb: 256, battery_mah: 4422, network_5g: '支持' } },
  { category_id: 'cat_phone', brand: '华为', model: 'Mate 60 Pro+', channel: 'Rakuten', shop_name: 'Huawei VMall', price: 8999, monthly_sales: 18000, rating: 4.8, main_image: 'https://picsum.photos/seed/p2/400/500', attributes: { screen_size: 6.82, ram_gb: 12, storage_gb: 512, battery_mah: 5000, network_5g: '支持' } },
  { category_id: 'cat_phone', brand: '小米', model: '14 Ultra', channel: 'Yahoo Shopping', shop_name: 'Xiaomi Global', price: 5999, monthly_sales: 12000, rating: 4.7, main_image: 'https://picsum.photos/seed/p3/400/500', attributes: { screen_size: 6.73, ram_gb: 16, storage_gb: 512, battery_mah: 5000, network_5g: '支持' } },
  { category_id: 'cat_phone', brand: 'OPPO', model: 'Find X7 Ultra', channel: 'Amazon', shop_name: 'OPPO Store', price: 5999, monthly_sales: 8500, rating: 4.8, main_image: 'https://picsum.photos/seed/p4/400/500', attributes: { screen_size: 6.82, ram_gb: 16, storage_gb: 512, battery_mah: 5000, network_5g: '支持' } },
  { category_id: 'cat_phone', brand: 'vivo', model: 'X100 Pro', channel: 'Rakuten', shop_name: 'vivo Direct', price: 4999, monthly_sales: 14000, rating: 4.7, main_image: 'https://picsum.photos/seed/p5/400/500', attributes: { screen_size: 6.78, ram_gb: 16, storage_gb: 512, battery_mah: 5400, network_5g: '支持' } },
];

async function seedMock() {
  console.log('🚀 开始注入各品类假数据...\n');
  try {
    let inserted = 0;
    for (const p of mockProducts) {
      const { error } = await supabase.from('products').insert({
        category_id: p.category_id,
        brand: p.brand,
        model: p.model,
        channel: p.channel,
        shop_name: p.shop_name || '',
        price: p.price,
        monthly_sales: p.monthly_sales,
        rating: p.rating,
        main_image: p.main_image,
        attributes: p.attributes || {},
      });
      if (error) {
        console.error(`❌ 插入失败 ${p.brand} ${p.model}:`, error.message);
      } else {
        inserted++;
        console.log(`✅ ${p.category_id} | ${p.brand} ${p.model} | ¥${p.price}`);
      }
    }
    console.log(`\n🎉 注入完成！共 ${inserted}/${mockProducts.length} 条`);
  } catch (e) {
    console.error('❌ 注入失败:', e.message);
    process.exit(1);
  }
}

seedMock();
