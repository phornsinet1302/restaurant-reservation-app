-- MANUAL TEST - Run in Supabase SQL Editor

-- Step 1: Check if column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'profile_picture_url';

-- Step 2: Check current user data
SELECT id, email, profile_picture_url 
FROM users 
WHERE email = 'liig03170@gmail.com' 
LIMIT 1;

-- Step 3: Manually update the column
UPDATE public.users 
SET profile_picture_url = 'https://test-url.jpg' 
WHERE email = 'liig03170@gmail.com';

-- Step 4: Verify it worked
SELECT id, email, profile_picture_url 
FROM users 
WHERE email = 'liig03170@gmail.com' 
LIMIT 1;

-- Step 5: Check column constraints/defaults
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  is_identity
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'profile_picture_url';

-- Step 6: Check for triggers on users table
SELECT 
  trigger_name,
  event_object_table,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'users';
