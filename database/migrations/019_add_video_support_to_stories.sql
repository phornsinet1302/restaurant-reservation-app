-- Add video support to stories table
-- Allow stories to have both image and video URLs

ALTER TABLE stories ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN stories.video_url IS 'Optional video URL for story video content';
