-- ========================================
-- 新项目必跑：建表（products / categories / category_templates / users）
-- 在 Supabase SQL Editor 中先执行本文件，再执行 20260101/20260102/20260103
-- ========================================

-- 1. 用户表（与 Auth 关联用 auth_user_id，后续 migration 会加）
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  email TEXT,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 品类表
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 品类字段模板表
CREATE TABLE IF NOT EXISTS public.category_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  is_required BOOLEAN DEFAULT false,
  options JSONB,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(category_id, field_key)
);

-- 4. 产品表
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  brand TEXT DEFAULT '',
  model TEXT DEFAULT '',
  link_url TEXT DEFAULT '',
  channel TEXT DEFAULT '',
  shop_name TEXT DEFAULT '',
  price NUMERIC(12,2) DEFAULT 0,
  actual_price NUMERIC(12,2),
  monthly_sales INT DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  main_image TEXT DEFAULT '',
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 索引（可选，便于查询）
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_category_templates_category_id ON public.category_templates(category_id);
