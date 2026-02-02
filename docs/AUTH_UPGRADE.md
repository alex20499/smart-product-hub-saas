# 认证与权限升级指南

## 概述

2.0 版本接入 Supabase Auth，实现：
- 邮箱 + 密码登录
- 角色权限：admin（全权限）、editor（无用户管理）、viewer（只读）
- RLS 行级安全策略

## 升级步骤

### 1. 执行数据库迁移

在 **Supabase Dashboard** -> **SQL Editor** 中执行：

```
supabase/migrations/20260101000000_auth_and_rls.sql
```

### 2. 创建 Auth 用户并关联

1. 在 `.env` 中配置 `SUPABASE_SERVICE_ROLE_KEY`（Supabase Dashboard -> Project Settings -> API）
2. 运行：
   ```bash
   node scripts/seed-auth-users.js
   ```
3. 脚本会将 `public.users` 中的用户同步到 Supabase Auth，并建立关联
4. 默认密码为 `password`，建议首次登录后修改

### 3. 登录方式变更

- **旧版**：用户名 + 密码（如 `admin` / `password`）
- **新版**：邮箱 + 密码（如 `admin@example.com` / `password`）

若 `users` 表中无 `email`，脚本会使用 `username@internal.local` 作为邮箱。

### 4. 权限说明

| 角色  | Dashboard | 产品管理 | 品类管理 | 用户管理 |
|-------|-----------|----------|----------|----------|
| admin | ✓         | 增删改查 | ✓        | ✓        |
| editor| ✓         | 增删改查 | ✓        | ✗ 不可见 |
| viewer| ✓         | 仅查看   | ✗ 不可见 | ✗ 不可见 |

### 5. 新建用户（2.0+）

通过「用户管理」创建的新用户会**自动**在 Supabase Auth 中创建账号，可直接用邮箱+密码登录。

- **本地开发**：需在 `.env` 中配置 `SUPABASE_SERVICE_ROLE_KEY`，Vite 代理会处理 `/api/create-user`
- **Vercel 部署**：在 Vercel 项目环境变量中配置 `SUPABASE_SERVICE_ROLE_KEY`

### 6. 历史用户补关联

若在升级前或通过其他方式添加的用户无法登录，可运行 `node scripts/seed-auth-users.js` 将 `public.users` 中未关联的用户同步到 Auth。

### 7. 默认账号无法登录时（一键修复）

若使用 `admin@example.com` / `password` 仍提示「ID或密钥不匹配」或「Invalid login credentials」：

1. 确保 `.env` 中配置的是**云端使用的** Supabase：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
2. 在项目根目录执行：
   ```bash
   node scripts/ensure-default-auth.js
   ```
3. 脚本会：若 `public.users` 中无 admin/editor/viewer 则插入；为所有未关联用户创建 Supabase Auth 账号并关联
4. 再次用 `admin@example.com` / `password` 登录

## 故障排查

- **登录失败**：先运行 `node scripts/ensure-default-auth.js` 确保默认账号存在并已关联 Auth；或运行 `seed-auth-users.js`（仅补关联已有用户）；或通过 UI 新建用户（会自动创建 Auth 账号）
- **RLS 拒绝**：确认用户已通过 Supabase Auth 登录，JWT 有效
- **无数据**：确认当前用户的 `get_my_role()` 返回正确角色
