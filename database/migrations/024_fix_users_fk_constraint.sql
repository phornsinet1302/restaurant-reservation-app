-- Fix users table foreign key constraint (Migration 024)
-- The users table originally had a FK to auth.users which causes issues with custom registrations
-- This migration removes that constraint and allows independent user management

-- Step 1: Drop dependent constraints on other tables
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_customer_id_fkey;
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_customer_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_merchant_id_fkey;
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_merchant_id_fkey;

-- Step 2: Remove the problematic PK on users.id that references auth.users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;

-- Step 3: Add back primary key without FK reference to auth.users
ALTER TABLE users ADD PRIMARY KEY (id);

-- Step 4: Recreate the foreign keys (users.id is now independent)
ALTER TABLE reservations 
ADD CONSTRAINT reservations_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE favorites 
ADD CONSTRAINT favorites_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE restaurants 
ADD CONSTRAINT restaurants_merchant_id_fkey 
FOREIGN KEY (merchant_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE stories 
ADD CONSTRAINT stories_merchant_id_fkey 
FOREIGN KEY (merchant_id) REFERENCES users(id) ON DELETE CASCADE;
