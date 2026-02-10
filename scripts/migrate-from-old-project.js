/**
 * 从旧 Supabase 项目（如孟买）迁移数据到新项目（如东京）
 *
 * 使用前：
 * 1. .env 里配置【新项目】的 SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY（东京）
 * 2. .env 里增加【旧项目】的 MIGRATE_FROM_URL、MIGRATE_FROM_SERVICE_ROLE_KEY（孟买）
 * 3. 新项目已执行完 4 段 SQL（建表 + RLS + Storage + rating）
 *
 * 运行：node scripts/migrate-from-old-project.js
 *
 * 说明：
 * - 仅迁移表数据（users / categories / category_templates / products），不迁移 Storage 桶内文件。
 * - 若 products.main_image 为旧项目 Storage URL，在新项目中可能 404，需在新项目重新上传或改为外链。
 * - 可重复运行：用户已存在会关联，categories/products/category_templates 会 upsert，不会重复插入。
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

function loadEnv() {
  const env = {};
  try {
    readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx <= 0) return;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (v) env[k] = v;
    });
  } catch (_) {}
  return env;
}

const env = loadEnv();
const oldUrl = env.MIGRATE_FROM_URL || '';
const oldKey = env.MIGRATE_FROM_SERVICE_ROLE_KEY || '';
const newUrl = env.SUPABASE_URL || '';
const newKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!oldUrl || !oldKey) {
  console.error('请在 .env 中配置 MIGRATE_FROM_URL 和 MIGRATE_FROM_SERVICE_ROLE_KEY（旧项目/孟买）');
  process.exit(1);
}
if (!newUrl || !newKey) {
  console.error('请在 .env 中配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY（新项目/东京）');
  process.exit(1);
}

const oldSupabase = createClient(oldUrl, oldKey, { auth: { autoRefreshToken: false, persistSession: false } });
const newSupabase = createClient(newUrl, newKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  console.log('从旧项目读取数据...');
  const [usersRes, categoriesRes, templatesRes, productsRes] = await Promise.all([
    oldSupabase.from('users').select('*'),
    oldSupabase.from('categories').select('*'),
    oldSupabase.from('category_templates').select('*'),
    oldSupabase.from('products').select('*')
  ]);

  if (usersRes.error) { console.error('读取 users 失败:', usersRes.error); process.exit(1); }
  if (categoriesRes.error) { console.error('读取 categories 失败:', categoriesRes.error); process.exit(1); }
  if (templatesRes.error) { console.error('读取 category_templates 失败:', templatesRes.error); process.exit(1); }
  if (productsRes.error) { console.error('读取 products 失败:', productsRes.error); process.exit(1); }

  const users = usersRes.data || [];
  const categories = categoriesRes.data || [];
  const templates = templatesRes.data || [];
  const products = productsRes.data || [];

  console.log(`users: ${users.length}, categories: ${categories.length}, category_templates: ${templates.length}, products: ${products.length}`);

  // 1. 在新项目为每个旧用户创建 Auth 用户，并插入 public.users（保留原 id，便于 products.updated_by 引用）
  console.log('迁移用户到新项目 Auth + public.users...');
  for (const u of users) {
    const email = u.email || (u.username?.includes('@') ? u.username : `${u.username}@internal.local`);
    const password = u.password || 'password';
    const { data: authUser, error: createErr } = await newSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createErr) {
      if (createErr.message?.includes('already been registered')) {
        const { data: list } = await newSupabase.auth.admin.listUsers();
        const match = list?.users?.find((x) => x.email === email);
        if (match) {
          const { error: upErr } = await newSupabase.from('users').upsert({
            id: u.id,
            username: u.username,
            email: u.email || null,
            password: u.password || null,
            role: u.role || 'viewer',
            auth_user_id: match.id
          }, { onConflict: 'id' });
          if (upErr) console.error(`关联用户 ${u.username} 失败:`, upErr.message);
          else console.log(`已关联 ${u.username}`);
        }
      } else {
        console.error(`${u.username}:`, createErr.message);
      }
      continue;
    }
    const { error: insertErr } = await newSupabase.from('users').insert({
      id: u.id,
      username: u.username,
      email: u.email || null,
      password: u.password || null,
      role: u.role || 'viewer',
      auth_user_id: authUser.user.id
    });
    if (insertErr) console.error(`插入用户 ${u.username} 失败:`, insertErr.message);
    else console.log(`已创建并关联 ${u.username}`);
  }

  // 2. 品类
  if (categories.length) {
    const { error } = await newSupabase.from('categories').upsert(categories, { onConflict: 'id' });
    if (error) console.error('插入 categories 失败:', error.message);
    else console.log('categories 已写入');
  }

  // 3. 品类模板（新项目表无 created_at/updated_at，只写入存在的列，避免 schema 不一致报错）
  const categoryTemplateColumns = ['id', 'category_id', 'field_key', 'field_name', 'field_type', 'is_required', 'options', 'sort_order', 'is_active'];
  if (templates.length) {
    const templateRows = templates.map((t) => {
      const row = {};
      for (const col of categoryTemplateColumns) {
        if (t[col] !== undefined) row[col] = t[col];
      }
      return row;
    });
    const { error } = await newSupabase.from('category_templates').upsert(templateRows, { onConflict: 'id' });
    if (error) console.error('插入 category_templates 失败:', error.message);
    else console.log('category_templates 已写入');
  }

  // 4. 产品（分批 upsert 按 id，便于重跑脚本时不会重复插入）
  if (products.length) {
    const BATCH = 50;
    for (let i = 0; i < products.length; i += BATCH) {
      const chunk = products.slice(i, i + BATCH);
      const { error } = await newSupabase.from('products').upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.error(`插入 products 批次 ${i / BATCH + 1} 失败:`, error.message);
      } else {
        console.log(`products 已写入 ${Math.min(i + BATCH, products.length)}/${products.length}`);
      }
    }
  }

  console.log('迁移完成。请用新项目账号登录验证。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
