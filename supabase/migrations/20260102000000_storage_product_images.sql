-- 产品主图存储桶：公开读取，已认证用户可上传
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 公开读取（用于 img src 展示）
CREATE POLICY "product_images_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- 允许已认证用户（admin/editor）上传
CREATE POLICY "product_images_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (public.get_my_role() IN ('admin', 'editor'))
);

-- 允许已认证用户更新/删除自己的上传（可选）
CREATE POLICY "product_images_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND (public.get_my_role() IN ('admin', 'editor')));

CREATE POLICY "product_images_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND (public.get_my_role() IN ('admin', 'editor')));
