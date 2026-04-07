-- FIX: The trigger might be blocking updates
-- Run these in Supabase SQL Editor to diagnose and fix

-- Step 1: See what the trigger does
SELECT pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger 
WHERE tgname = 'update_users_updated_at_trigger';

-- Step 2: Temporarily DISABLE the trigger
ALTER TABLE public.users DISABLE TRIGGER update_users_updated_at_trigger;

-- Step 3: Try manual update
UPDATE public.users 
SET profile_picture_url = 'https://test-manual-update.jpg' 
WHERE email = 'liig03170@gmail.com';

-- Step 4: Verify it worked
SELECT id, email, profile_picture_url, updated_at 
FROM users 
WHERE email = 'liig03170@gmail.com' LIMIT 1;

-- Step 5: RE-ENABLE the trigger
ALTER TABLE public.users ENABLE TRIGGER update_users_updated_at_trigger;

-- Step 6: Try update again with trigger enabled
UPDATE public.users 
SET profile_picture_url = 'https://test-with-trigger.jpg' 
WHERE email = 'liig03170@gmail.com';

-- Step 7: Check if it works
SELECT id, email, profile_picture_url 
FROM users 
WHERE email = 'liig03170@gmail.com' LIMIT 1;
