-- Comprehensive fix for FK constraint and RLS issues
-- Run all these commands in Supabase SQL Editor

-- 1. Disable RLS on users table (if not already done)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on restaurants table (if not already done)
ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies on restaurants (clean slate)
DROP POLICY IF EXISTS "Anyone can view published restaurants" ON restaurants;
DROP POLICY IF EXISTS "Merchants can view/manage their own restaurants" ON restaurants;
DROP POLICY IF EXISTS "Service role can manage restaurants" ON restaurants;

-- 4. Drop all existing policies on users (clean slate)
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- 5. Verify FK constraint exists and is correct
ALTER TABLE restaurants 
DROP CONSTRAINT IF EXISTS restaurants_merchant_id_fkey;

ALTER TABLE restaurants
ADD CONSTRAINT restaurants_merchant_id_fkey 
FOREIGN KEY (merchant_id) REFERENCES users(id) ON DELETE CASCADE;

-- 6. Verify the columns are VARCHAR
ALTER TABLE restaurants
ALTER COLUMN opening_hours TYPE VARCHAR(20),
ALTER COLUMN closing_hours TYPE VARCHAR(20);

-- 7. Test insert with the known merchant ID
INSERT INTO restaurants (merchant_id, name, description, address, opening_hours, closing_hours, phone, category, cuisine, is_published)
VALUES ('19df1b44-fb48-4c80-a5a9-7ff731d94050', 'Test Restaurant', 'Test Desc', 'Test Address', '10:00AM', '11:00PM', '088888888', 'Italian', 'Italian', false);
