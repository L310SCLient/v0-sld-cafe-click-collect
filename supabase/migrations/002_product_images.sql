-- Add image_url to products (formules already has it from 001)
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;
