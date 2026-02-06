/**
 * 一键清空所有产品的 main_image 字段（与「不要主图」策略一致）
 *
 * 前置：.env 中配置 SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY
 * 运行：node scripts/clear-main-images.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
let supabaseUrl = '';
let serviceRoleKey = '';

try {
  const env = readFileSync(envPath, 'utf8');
  env.split('\n').forEach((line) => {
    const [k, v] = line.split('=').map((s) => s?.trim());
    if (k === 'SUPABASE_URL' && v) supabaseUrl = (v || '').replace(/^["']|["']$/g, '');
    if (k === 'SUPABASE_SERVICE_ROLE_KEY' && v) serviceRoleKey = (v || '').replace(/^["']|["']$/g, '');
  });
} catch (_) {}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('请在 .env 中配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const { data: rows, error: selectError } = await supabase.from('products').select('id');
  if (selectError) {
    console.error('获取产品列表失败:', selectError.message);
    process.exit(1);
  }
  const ids = (rows || []).map((r) => r.id).filter(Boolean);
  if (ids.length === 0) {
    console.log('当前无产品，无需清空。');
    process.exit(0);
  }
  const { error: updateError } = await supabase.from('products').update({ main_image: '' }).in('id', ids);
  if (updateError) {
    console.error('清空 main_image 失败:', updateError.message);
    process.exit(1);
  }
  console.log(`已清空 ${ids.length} 个产品的 main_image。`);
}

main();
