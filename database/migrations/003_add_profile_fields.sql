-- Add optional profile fields to users table
-- These columns allow customers to store additional profile information

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.users.date_of_birth IS 'User date of birth (optional)';
COMMENT ON COLUMN public.users.bio IS 'User biography or about section (optional)';

-- Optional: Add an updated_at timestamp column to track when user records are modified
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp on user updates
DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON public.users;
CREATE TRIGGER update_users_updated_at_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();
