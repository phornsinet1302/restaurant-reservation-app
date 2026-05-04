-- Fix RLS policies for restaurants table to allow merchant insertions

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published restaurants" ON restaurants;
DROP POLICY IF EXISTS "Merchants can view/manage their own restaurants" ON restaurants;

-- Create new policies that allow merchant operations

-- Allow anyone to view published restaurants
CREATE POLICY "Anyone can view published restaurants" ON restaurants
  FOR SELECT USING (is_published = true);

-- Allow merchants to view/manage their own restaurants (for reads and updates)
CREATE POLICY "Merchants can manage their own restaurants" ON restaurants
  FOR SELECT USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their own restaurants" ON restaurants
  FOR UPDATE USING (auth.uid() = merchant_id);

-- Allow merchants to insert new restaurants
CREATE POLICY "Merchants can create restaurants" ON restaurants
  FOR INSERT WITH CHECK (auth.uid() = merchant_id);

-- Allow merchants to delete their own restaurants
CREATE POLICY "Merchants can delete their own restaurants" ON restaurants
  FOR DELETE USING (auth.uid() = merchant_id);
