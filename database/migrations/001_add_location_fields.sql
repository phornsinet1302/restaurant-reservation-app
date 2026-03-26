-- Restaurant Location Fields Migration
-- Run this migration in Supabase SQL Editor

-- Add location columns to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS address VARCHAR(500);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS place_id VARCHAR(255);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for faster location queries
CREATE INDEX IF NOT EXISTS idx_restaurants_location 
ON restaurants(latitude, longitude);

-- Add constraint to ensure valid coordinates
ALTER TABLE restaurants 
ADD CONSTRAINT check_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE restaurants 
ADD CONSTRAINT check_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
DROP TRIGGER IF EXISTS update_restaurants_updated_at_trigger ON restaurants;
CREATE TRIGGER update_restaurants_updated_at_trigger
BEFORE UPDATE ON restaurants
FOR EACH ROW
EXECUTE FUNCTION update_restaurants_updated_at();

-- Optional: Add a geography column for PostGIS-based distance queries (advanced)
-- ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS geom GEOGRAPHY(POINT, 4326);

-- Update existing restaurants with a default location (San Francisco as example)
-- UPDATE restaurants SET latitude = 37.7749, longitude = -122.4194 WHERE latitude IS NULL;
