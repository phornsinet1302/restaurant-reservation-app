-- Add email_verified column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Add an index on email_verified for faster queries
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
