-- Add missing columns to restaurants table if they don't exist

-- Add is_published if not already there
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- Add updatedAt if not already there  
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_merchant_id ON restaurants(merchant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_published ON restaurants(is_published);

-- Add RLS if not already enabled
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for restaurants (drop if exist and recreate)
DROP POLICY IF EXISTS "Anyone can view published restaurants" ON restaurants;
DROP POLICY IF EXISTS "Merchants can view/manage their own restaurants" ON restaurants;

CREATE POLICY "Anyone can view published restaurants" ON restaurants
  FOR SELECT USING (is_published = true);

CREATE POLICY "Merchants can view/manage their own restaurants" ON restaurants
  FOR ALL USING (auth.uid() = merchant_id);
