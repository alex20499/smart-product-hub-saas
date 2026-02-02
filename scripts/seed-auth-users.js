/**
 * 将 public.users 中的用户同步到 Supabase Auth
 * 需要先执行 supabase/migrations/20260101000000_auth_and_rls.sql
 *
 * 使用方法：
 * 1. 在 .env 中配置 SUPABASE_SERVICE_ROLE_KEY（Supabase Dashboard -> Project Settings -> API）
 * 2. node scripts/seed-auth-users.js
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
  const { data: users, error } = await supabase.from('users').select('id, username, email, password, role, auth_user_id');
  if (error) {
    console.error('读取 users 失败:', error);
    process.exit(1);
  }
  if (!users?.length) {
    console.log('没有需要同步的用户');
    return;
  }

  for (const u of users) {
    if (u.auth_user_id) {
      console.log(`跳过 ${u.username}：已关联 Auth`);
      continue;
    }
    const email = u.email || (u.username?.includes('@') ? u.username : `${u.username}@internal.local`);
    const password = u.password || 'password'; // 使用 DB 中存储的密码，无则默认 password

    const { data: authUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createErr) {
      if (createErr.message?.includes('already been registered')) {
        const { data: existing } = await supabase.auth.admin.listUsers();
        const match = existing?.users?.find((x) => x.email === email);
        if (match) {
          const { error: linkErr } = await supabase.from('users').update({ auth_user_id: match.id }).eq('id', u.id);
          if (linkErr) console.error(`关联 ${u.username} 失败:`, linkErr);
          else console.log(`已关联 ${u.username} -> ${email}`);
        }
      } else {
        console.error(`${u.username}:`, createErr.message);
      }
      continue;
    }

    const { error: linkErr } = await supabase.from('users').update({ auth_user_id: authUser.user.id }).eq('id', u.id);
    if (linkErr) {
      console.error(`关联 ${u.username} 失败:`, linkErr);
    } else {
      console.log(`已创建并关联 ${u.username} -> ${email} (默认密码: password)`);
    }
  }
}

main().catch(console.error);
