-- Add custom daily special fields (name/price/image) so admins can program
-- a special that is NOT tied to an existing product row.
-- product_id remains nullable (no NOT NULL constraint in 001_init.sql) so
-- a row can have either a product_id OR custom_* fields populated.

ALTER TABLE daily_specials ADD COLUMN IF NOT EXISTS custom_name text;
ALTER TABLE daily_specials ADD COLUMN IF NOT EXISTS custom_price int8;
ALTER TABLE daily_specials ADD COLUMN IF NOT EXISTS custom_image_url text;

-- Storage bucket for custom daily-special photos.
-- Run this in Supabase Storage (Dashboard > Storage > New bucket):
--   Name: daily-specials
--   Public bucket: ON
--
-- Or programmatically via the Storage API:
--   INSERT INTO storage.buckets (id, name, public)
--     VALUES ('daily-specials', 'daily-specials', true)
--     ON CONFLICT (id) DO NOTHING;
--
-- Public-read policy (so the site can show the image) + permissive
-- insert/update/delete so the admin client (anon key) can upload.
-- Tighten these policies later if you introduce real Supabase auth.
--
--   CREATE POLICY "daily_specials_bucket_public_read"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'daily-specials');
--
--   CREATE POLICY "daily_specials_bucket_insert"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'daily-specials');
--
--   CREATE POLICY "daily_specials_bucket_update"
--     ON storage.objects FOR UPDATE
--     USING (bucket_id = 'daily-specials');
--
--   CREATE POLICY "daily_specials_bucket_delete"
--     ON storage.objects FOR DELETE
--     USING (bucket_id = 'daily-specials');
