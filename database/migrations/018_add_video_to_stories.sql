-- Add video support to stories table
-- Allows merchants to include videos (under 1 minute) in their stories

ALTER TABLE stories ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN stories.video_url IS 'Optional video URL for story (must be under 1 minute)';
