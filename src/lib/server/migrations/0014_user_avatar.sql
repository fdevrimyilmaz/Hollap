-- Allow users to upload a profile picture; URL or data URL stored in users.avatar_url.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
