-- Add restaurant profile fields to restaurants table for signup data
-- Run this migration in Supabase SQL Editor

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS name_khmer VARCHAR(255);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cuisine VARCHAR(100);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS city_province VARCHAR(100);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS maps_link TEXT;

-- Add comments for documentation
COMMENT ON COLUMN restaurants.name_khmer IS 'Restaurant name in Khmer script';
COMMENT ON COLUMN restaurants.category IS 'Restaurant category (e.g., Khmer restaurant, Café, Bar & Grill)';
COMMENT ON COLUMN restaurants.cuisine IS 'Primary cuisine type (e.g., Asian fusion, Khmer, Chinese)';
COMMENT ON COLUMN restaurants.phone IS 'Restaurant phone number';
COMMENT ON COLUMN restaurants.city_province IS 'Restaurant city or province';
COMMENT ON COLUMN restaurants.maps_link IS 'Google Maps link for the restaurant location';
