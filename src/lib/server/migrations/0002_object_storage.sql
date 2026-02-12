ALTER TABLE file_assets
  ADD COLUMN IF NOT EXISTS upload_status TEXT NOT NULL DEFAULT 'uploaded';

ALTER TABLE file_assets
  ADD COLUMN IF NOT EXISTS upload_expires_at TEXT;

ALTER TABLE file_assets
  ADD COLUMN IF NOT EXISTS uploaded_at TEXT;

ALTER TABLE file_assets
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'local';

ALTER TABLE file_assets
  ADD COLUMN IF NOT EXISTS deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_file_assets_upload_status
  ON file_assets (upload_status, upload_expires_at);
