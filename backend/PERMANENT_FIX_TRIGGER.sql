-- PERMANENT FIX: Recreate the trigger to allow profile_picture_url updates

-- Step 1: Drop the old trigger
DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON public.users;

-- Step 2: Drop the old function if it exists
DROP FUNCTION IF EXISTS update_users_updated_at() CASCADE;

-- Step 3: Create new function that properly updates timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate the trigger with proper configuration
CREATE TRIGGER update_users_updated_at_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

-- Step 5: Verify the trigger was created
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'users' AND trigger_name = 'update_users_updated_at_trigger';

-- Step 6: Test that it works
UPDATE public.users 
SET profile_picture_url = 'https://test-with-new-trigger.jpg' 
WHERE email = 'liig03170@gmail.com';

-- Step 7: Verify
SELECT id, email, profile_picture_url, updated_at
FROM users 
WHERE email = 'liig03170@gmail.com' LIMIT 1;
