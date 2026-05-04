-- Create menu_photos table for restaurant top 3 menu pictures
-- These will be displayed in the "Photos" section on customer view

CREATE TABLE IF NOT EXISTS menu_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  display_order INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()),
  
  -- Indexes for performance
  UNIQUE(restaurant_id, display_order)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS menu_photos_restaurant_id_idx ON menu_photos(restaurant_id);
CREATE INDEX IF NOT EXISTS menu_photos_display_order_idx ON menu_photos(restaurant_id, display_order);

-- Enable RLS (Row Level Security)
ALTER TABLE menu_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Merchants can see/manage their own restaurant's photos
CREATE POLICY menu_photos_merchant_select ON menu_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = menu_photos.restaurant_id
      AND restaurants.merchant_id = auth.uid()
    )
  );

-- RLS Policy: Customers can view published restaurants' photos
CREATE POLICY menu_photos_customer_select ON menu_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = menu_photos.restaurant_id
      AND restaurants.is_published = true
    )
  );

-- RLS Policy: Merchants can insert photos for their own restaurants
CREATE POLICY menu_photos_merchant_insert ON menu_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = menu_photos.restaurant_id
      AND restaurants.merchant_id = auth.uid()
    )
  );

-- RLS Policy: Merchants can update their own photos
CREATE POLICY menu_photos_merchant_update ON menu_photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = menu_photos.restaurant_id
      AND restaurants.merchant_id = auth.uid()
    )
  );

-- RLS Policy: Merchants can delete their own photos
CREATE POLICY menu_photos_merchant_delete ON menu_photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = menu_photos.restaurant_id
      AND restaurants.merchant_id = auth.uid()
    )
  );

-- Add comment to table
COMMENT ON TABLE menu_photos IS 'Top 3 menu photos for restaurants to display in Photos section';
