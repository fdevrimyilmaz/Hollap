-- Per-lesson uploaded video reference. NULL means "no video uploaded yet"
-- (placeholder thumbnail/free preview state). When set, the watch page
-- resolves it to a short-lived signed URL via /api/files/signed-url.
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS video_asset_id TEXT;
