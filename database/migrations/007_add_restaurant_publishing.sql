-- Add publishing and additional fields to restaurants table
-- Run this migration in Supabase SQL Editor

-- Add is_published status field (default false - restaurants start as draft)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- Add opening hours field
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS opening_hours VARCHAR(255);

-- Add closing hours field  
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS closing_hours VARCHAR(255);

-- Add minimum order amount
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS min_order_amount DECIMAL(10, 2);

-- Add delivery fee
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2);

-- Add image URL for restaurant
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add rating
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 4.5;

-- Track when restaurant was published
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

COMMENT ON COLUMN restaurants.is_published IS 'Whether the restaurant is publicly visible to customers';
COMMENT ON COLUMN restaurants.opening_hours IS 'Opening hours (e.g., 10:00 AM)';
COMMENT ON COLUMN restaurants.closing_hours IS 'Closing hours (e.g., 10:00 PM)';
COMMENT ON COLUMN restaurants.min_order_amount IS 'Minimum order amount for delivery';
COMMENT ON COLUMN restaurants.delivery_fee IS 'Delivery fee amount';
COMMENT ON COLUMN restaurants.image_url IS 'URL to restaurant main image';
COMMENT ON COLUMN restaurants.published_at IS 'Timestamp when restaurant was first published';
