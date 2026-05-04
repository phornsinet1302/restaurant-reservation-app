-- Add profile_picture_url column to users table
-- This stores the Supabase storage URL for user profile pictures

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.profile_picture_url IS 'Cloud storage URL for user profile picture (Supabase user-profiles bucket)';

-- Create index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_users_profile_picture_url ON users(profile_picture_url);
