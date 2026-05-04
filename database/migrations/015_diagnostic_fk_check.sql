-- Diagnostic query to check FK constraints and table structure
-- Run this in Supabase SQL Editor to see what's blocking the insert

-- Check the foreign key constraint definition
SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
FROM information_schema.key_column_usage
WHERE table_name = 'restaurants' AND constraint_name LIKE '%merchant%';

-- Check the restaurants table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'restaurants'
ORDER BY ordinal_position;

-- Check if RLS is enabled on restaurants
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'restaurants';

-- Try a test insert to see detailed error
INSERT INTO restaurants (merchant_id, name, description, address, opening_hours, closing_hours, phone, category, cuisine, is_published)
VALUES ('19df1b44-fb48-4c80-a5a9-7ff731d94050', 'Test', 'Test', 'Test', '10:00AM', '11:00PM', '123', 'Test', 'Test', false);
