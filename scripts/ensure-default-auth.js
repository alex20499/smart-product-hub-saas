/**
 * 确保默认账号存在并可登录
 * 1. 若 public.users 中无 admin/editor/viewer，则插入
 * 2. 为所有未关联 Auth 的用户创建 Supabase Auth 账号并关联
 *
 * 使用前：
 * - 已执行 supabase/migrations/20260101000000_auth_and_rls.sql
 * - .env 中配置 SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY
 *
 * 运行：node scripts/ensure-default-auth.js
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

const DEFAULTS = [
  { username: 'admin', email: 'admin@example.com', password: 'password', role: 'admin' },
  { username: 'editor', email: 'editor@example.com', password: 'password', role: 'editor' },
  { username: 'viewer', email: 'viewer@example.com', password: 'password', role: 'viewer' },
];

async function main() {
  const { data: existing, error: fetchErr } = await supabase.from('users').select('id, username, email, password, role, auth_user_id');
  if (fetchErr) {
    console.error('读取 users 失败:', fetchErr);
    process.exit(1);
  }

  const usernames = new Set((existing || []).map((u) => u.username));

  for (const d of DEFAULTS) {
    if (usernames.has(d.username)) continue;
    const { error: insertErr } = await supabase
      .from('users')
      .insert([{ username: d.username, email: d.email, password: d.password, role: d.role }]);
    if (insertErr) {
      console.error(`插入 ${d.username} 失败:`, insertErr.message);
      continue;
    }
    console.log(`已插入默认用户: ${d.username} (${d.email})`);
  }

  const { data: users, error: refetchErr } = await supabase.from('users').select('id, username, email, password, role, auth_user_id');
  if (refetchErr) {
    console.error('重新读取 users 失败:', refetchErr);
    process.exit(1);
  }

  for (const u of users || []) {
    if (u.auth_user_id) {
      console.log(`跳过 ${u.username}：已关联 Auth`);
      continue;
    }
    const email = u.email || (u.username?.includes('@') ? u.username : `${u.username}@internal.local`);
    const password = u.password || 'password';

    const { data: authUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr) {
      if (createErr.message?.includes('already been registered')) {
        const { data: list } = await supabase.auth.admin.listUsers();
        const match = list?.users?.find((x) => x.email === email);
        if (match) {
          const { error: linkErr } = await supabase.from('users').update({ auth_user_id: match.id }).eq('id', u.id).select();
          if (linkErr) console.error(`关联 ${u.username} 失败:`, linkErr.message);
          else console.log(`已关联已有 Auth 用户: ${u.username} -> ${email}`);
        }
      } else {
        console.error(`${u.username}:`, createErr.message);
      }
      continue;
    }

    const { error: linkErr } = await supabase.from('users').update({ auth_user_id: authUser.user.id }).eq('id', u.id);
    if (linkErr) {
      console.error(`关联 ${u.username} 失败:`, linkErr.message);
    } else {
      console.log(`已创建并关联: ${u.username} -> ${email} (密码: ${password})`);
    }
  }

  console.log('\n默认登录账号：');
  console.log('  邮箱: admin@example.com  密码: password');
  console.log('  邮箱: editor@example.com 密码: password');
  console.log('  邮箱: viewer@example.com 密码: password');
}

main().catch(console.error);
