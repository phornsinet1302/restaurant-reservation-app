-- Add phone field to users table if it doesn't already exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add comment for documentation
COMMENT ON COLUMN public.users.phone IS 'User phone number';
