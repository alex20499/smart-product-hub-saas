-- 确保 products.rating 支持两位小数（若当前为 integer 会四舍五入导致 4.52 显示为 5.00）
ALTER TABLE public.products
  ALTER COLUMN rating TYPE NUMERIC(3,2) USING (COALESCE(rating, 0)::numeric(3,2));
