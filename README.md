# Smart Product Hub SaaS

一个轻量级、可定制的 SaaS 平台，用于产品跟踪、竞品分析和动态库存管理，支持 AI 驱动的洞察分析。

## 功能特性

- 📦 **产品管理**：动态字段支持，多品类管理
- 📊 **数据概览**：市场分析、竞品对比、可视化图表
- 👥 **用户权限**：admin、editor、viewer 三级权限
- 🔐 **安全认证**：基于 Supabase Auth 的邮箱密码登录
- 🤖 **AI 分析**：集成 Gemini API 进行产品洞察分析
- 📤 **数据导入**：支持 Excel 批量导入产品数据

## 快速开始

### 前置要求

- Node.js 18+ 
- Supabase 项目（用于数据库和认证）

### 安装步骤

1. **克隆项目并安装依赖**
   ```bash
   npm install
   ```

2. **配置环境变量**
   
   复制 `.env.example` 为 `.env`，并填入以下配置：
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. **初始化数据库**
   
   在 Supabase Dashboard -> SQL Editor 中依次执行：
   - `supabase/migrations/20260101000000_auth_and_rls.sql`
   - `supabase/migrations/20260102000000_storage_product_images.sql`
   - `supabase/migrations/20260103000000_products_rating_decimal.sql`

4. **创建默认用户**
   ```bash
   node scripts/ensure-default-auth.js
   ```
   
   默认账号：
   - admin@example.com / password
   - editor@example.com / password
   - viewer@example.com / password

5. **启动开发服务器**
   ```bash
   npm run dev
   ```
   
   访问 http://127.0.0.1:3000

## 项目结构

```
├── components/          # React 组件
├── api/                # API 路由（Vercel Serverless）
├── lib/                # 工具库（Supabase、认证）
├── utils/              # 工具函数（图片上传、AI）
├── scripts/            # 脚本（数据导入、用户管理）
├── supabase/migrations/ # 数据库迁移文件
└── docs/               # 项目文档
```

## 部署

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 文档

- [本地测试指南](./docs/LOCAL_TESTING.md)
- [认证升级指南](./docs/AUTH_UPGRADE.md)
- [存储设置](./docs/STORAGE_SETUP.md)
- [Excel 导入](./docs/EXCEL_STRUCTURE_ANALYSIS.md)

## License

MIT
