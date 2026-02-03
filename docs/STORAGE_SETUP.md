# 产品主图存储桶 - 配置步骤（新手向）

为了让「主图上传到云端」功能正常工作，需要在 Supabase 里创建一个存储桶（bucket）。下面是详细操作步骤。

---

## 第一步：登录 Supabase 控制台

1. 打开浏览器，访问 [https://supabase.com](https://supabase.com)
2. 点击右上角 **Sign In** 登录你的账号
3. 在项目列表中，点击你正在使用的项目（例如 `smart-product-hub-saas`）

---

## 第二步：打开 SQL 编辑器

1. 进入项目后，在左侧栏找到 **SQL Editor**（SQL 编辑器）
2. 点击 **SQL Editor**
3. 点击 **New query**（新建查询）创建一个新的 SQL 窗口


---

## 第三步：复制并粘贴 SQL 代码

1. 打开项目中的这个文件：
   ```
   supabase/migrations/20260102000000_storage_product_images.sql
   ```

2. 用文本编辑器打开该文件，**全选**（Ctrl+A 或 Cmd+A）并**复制**（Ctrl+C 或 Cmd+C）全部内容

3. 回到 Supabase 的 SQL 编辑器窗口，在空白处 **粘贴**（Ctrl+V 或 Cmd+V）

你会看到类似下面这段 SQL：

```sql
-- 产品主图存储桶：公开读取，已认证用户可上传
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  '["image/jpeg","image/png","image/gif","image/webp"]'
)
ON CONFLICT (id) DO NOTHING;
-- ... 后面还有 CREATE POLICY 等语句
```

---

## 第四步：执行 SQL

1. 确认 SQL 已全部粘贴进编辑器
2. 点击右下角的 **Run**（运行）按钮，或按快捷键 **Ctrl+Enter**（Windows） / **Cmd+Enter**（Mac）

3. 等待几秒，如果成功，会看到类似提示：
   - `Success. No rows returned` 或
   - `Success`

---

## 第五步：检查是否创建成功

1. 在左侧栏找到 **Storage**（存储）
2. 点击进入
3. 应该能看到名为 **product-images** 的存储桶

如果能看到，说明配置完成。

---

## 常见问题

### 1. 报错：`policy "product_images_select" already exists`

说明你已经执行过这段 SQL。可以忽略，或者先把已有的 policy 删掉再重新执行。

### 2. 报错：`function public.get_my_role() does not exist`

说明还没有执行过认证相关的迁移（`20260101000000_auth_and_rls.sql`）。请先执行该迁移，再执行存储桶的 SQL。

### 3. 找不到 SQL Editor

Supabase 界面有时会更新，如果左侧没有 SQL Editor，可以尝试：
- 在顶部搜索框输入 "SQL"
- 或进入 **Database** → **SQL Editor**

---

## 总结

| 步骤 | 操作 |
|------|------|
| 1 | 登录 Supabase，进入你的项目 |
| 2 | 左侧点击 **SQL Editor** → **New query** |
| 3 | 复制 `supabase/migrations/20260102000000_storage_product_images.sql` 的全部内容，粘贴到 SQL 编辑器 |
| 4 | 点击 **Run** 执行 |
| 5 | 到 **Storage** 中确认 `product-images` 桶已创建 |

完成以上步骤后，主图上传功能即可正常使用。
