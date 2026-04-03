-- Add image_url column to restaurants table for cover images
ALTER TABLE restaurants
ADD COLUMN image_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN restaurants.image_url IS 'Cover image URL for restaurant listing (uploaded to Supabase Storage)';
