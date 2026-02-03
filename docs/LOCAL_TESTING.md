# 本地测试指南

在本地运行项目，方便排查「添加产品」超时、提交失败等问题。

## 1. 环境准备

1. **Node.js**：建议 18+（`node -v` 检查）
2. **复制环境变量**：
   ```bash
   cp .env.example .env
   ```
3. **编辑 `.env`**，填入你的 Supabase 配置（**变量名必须一致，值不要有多余空格**）：
   - `SUPABASE_URL`：项目 URL（Dashboard → API → Project URL），如 `https://xxx.supabase.co`
   - `SUPABASE_ANON_KEY`：anon public / Publishable key（Dashboard → API → anon public），格式为 `eyJ...` 或 `sb_publishable_...`
   - `SUPABASE_SERVICE_ROLE_KEY`：service_role key（用于本地 /api/create-user、/api/create-product 等代理）

没有 `SUPABASE_SERVICE_ROLE_KEY` 时，添加产品会走服务端 API；本地代理需要它才能模拟服务端插入。

## 2. 安装依赖并启动

```bash
npm install
npm run dev
```

浏览器打开：**http://127.0.0.1:3000**

## 3. 测试「添加产品」

1. 登录（使用已在 Supabase 里存在的用户）
2. 进入「产品管理」→ 点击「添加产品」
3. 选择品类，填写必填项（品牌、型号、渠道等），可不填主图
4. 点击「保存配置」

## 4. 看控制台日志（排查 bug）

打开浏览器 **开发者工具 → Console**，点击保存后应看到类似输出：

- `[Product Add] 开始` — 流程开始
- `[Product Add] payload 已构建, categoryId: xxx` — 数据已组好
- `[Product Add] 请求 /api/create-product` — 即将请求接口
- `[Product Add] 响应 status= 200` — 接口返回（200 为成功）
- `[Product Add] 成功` — 插入成功

若卡在某一步或出现错误：

- **只有「payload 已构建」且无「请求 /api/create-product」**：多半是 `getSession()` 未返回。请确认 `.env` 中变量名为 `SUPABASE_URL`、`SUPABASE_ANON_KEY`（不要用别的名字），值无多余空格；刷新页面后若控制台有 `[Supabase] 配置缺失`，说明未正确加载。
- **无 token**：先重新登录
- **响应 status= 401/403**：检查登录状态或 service role 配置
- **响应 status= 408 或 500**：服务端超时或报错，看终端里 Vite 代理日志
- **异常: AbortError**：客户端超时（95s），多为网络或 Supabase 慢

终端里也会打印 Vite 代理的请求，便于确认 `/api/create-product` 是否被调用。

## 5. 本地与云端的区别

| 项目       | 本地 (npm run dev)     | 云端 (Vercel)              |
|------------|------------------------|----------------------------|
| 添加产品   | Vite 代理 → 本机请求 Supabase | Serverless → Vercel 请求 Supabase |
| 超时限制   | 无 10s 限制            | 免费版函数约 10s           |
| 日志       | 浏览器 Console + 终端  | 需到 Vercel Functions 日志 |

本地可长时间等待、看完整日志，便于定位是「无 token / 接口报错 / 超时」中的哪一种。
