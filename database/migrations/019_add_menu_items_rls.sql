-- Add missing RLS policies for menu_items table

-- Policy 1: Anyone can view menu items (for customers browsing)
CREATE POLICY "Anyone can view menu items" ON menu_items
  FOR SELECT USING (true);

-- Policy 2: Merchants can INSERT menu items for their restaurants
CREATE POLICY "Merchants can insert menu items for their restaurants" ON menu_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = restaurant_id
      AND restaurants.merchant_id = auth.uid()
    )
  );

-- Policy 3: Merchants can UPDATE menu items for their restaurants
CREATE POLICY "Merchants can update menu items for their restaurants" ON menu_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = restaurant_id
      AND restaurants.merchant_id = auth.uid()
    )
  );

-- Policy 4: Merchants can DELETE menu items for their restaurants
CREATE POLICY "Merchants can delete menu items for their restaurants" ON menu_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = restaurant_id
      AND restaurants.merchant_id = auth.uid()
    )
  );

-- Ensure RLS is enabled on menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
