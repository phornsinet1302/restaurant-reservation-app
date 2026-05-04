-- Drop all existing INSERT policies on restaurants table
DROP POLICY IF EXISTS "Allow restaurant inserts" ON restaurants;
DROP POLICY IF EXISTS "Merchants can create restaurants" ON restaurants;
DROP POLICY IF EXISTS "Anyone can insert restaurants" ON restaurants;

-- Create a permissive INSERT policy that allows all inserts
-- Note: With supabaseAdmin, this policy should not block anything
-- Application layer must validate merchant_id
CREATE POLICY "Insert restaurants unrestricted" ON restaurants
FOR INSERT WITH CHECK (true);

-- Ensure SELECT policies allow merchants to see their own restaurants
DROP POLICY IF EXISTS "Merchants can view their restaurants" ON restaurants;
CREATE POLICY "Merchants can view their restaurants" ON restaurants
FOR SELECT USING (auth.uid() = merchant_id OR is_published = true);

-- Ensure UPDATE policies allow merchants to update their restaurants
DROP POLICY IF EXISTS "Merchants can update their restaurants" ON restaurants;
CREATE POLICY "Merchants can update their restaurants" ON restaurants
FOR UPDATE USING (auth.uid() = merchant_id) WITH CHECK (auth.uid() = merchant_id);
