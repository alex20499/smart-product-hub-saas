-- ========================================
-- 认证与权限升级：Supabase Auth + RLS
-- 在 Supabase SQL Editor 中执行
-- ========================================

-- 1. 用户表：添加 auth_user_id，关联 auth.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. 确保 email 有值（用于 Supabase Auth 登录）
UPDATE public.users SET email = username || '@internal.local' WHERE email IS NULL OR email = '';

-- 3. 角色辅助函数：获取当前登录用户的角色
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. 启用 RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. products 策略：所有已登录用户可读，admin/editor 可写
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_select" ON public.products
  FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin', 'editor', 'viewer'));

CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'editor'));

CREATE POLICY "products_update" ON public.products
  FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'editor'));

CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('admin', 'editor'));

-- 6. categories 策略
DROP POLICY IF EXISTS "categories_select" ON public.categories;
DROP POLICY IF EXISTS "categories_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_update" ON public.categories;
DROP POLICY IF EXISTS "categories_delete" ON public.categories;
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin', 'editor', 'viewer'));

CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'editor'));

CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'editor'));

CREATE POLICY "categories_delete" ON public.categories
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- 7. category_templates 策略
DROP POLICY IF EXISTS "category_templates_select" ON public.category_templates;
DROP POLICY IF EXISTS "category_templates_insert" ON public.category_templates;
DROP POLICY IF EXISTS "category_templates_update" ON public.category_templates;
DROP POLICY IF EXISTS "category_templates_delete" ON public.category_templates;
CREATE POLICY "category_templates_select" ON public.category_templates
  FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin', 'editor', 'viewer'));

CREATE POLICY "category_templates_insert" ON public.category_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'editor'));

CREATE POLICY "category_templates_update" ON public.category_templates
  FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'editor'));

CREATE POLICY "category_templates_delete" ON public.category_templates
  FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('admin', 'editor'));

-- 8. users 策略：仅 admin 可读/写
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin' OR auth_user_id = auth.uid());

CREATE POLICY "users_insert" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "users_update" ON public.users
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "users_delete" ON public.users
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- 9. 匿名访问：无策略则默认拒绝（anon 无法访问）
-- 如需允许未登录时完全不可用，RLS 已满足
