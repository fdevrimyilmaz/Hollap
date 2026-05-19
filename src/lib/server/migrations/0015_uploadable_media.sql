-- Custom product thumbnails and creator cover images.
-- Both fields are optional: NULL falls back to the deterministic Unsplash/avatar map.
ALTER TABLE products ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;
