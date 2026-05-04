-- Remove price_range column from restaurants table
-- This column is no longer used in the application

ALTER TABLE restaurants DROP COLUMN IF EXISTS price_range;

-- Add comment to document the change
COMMENT ON TABLE restaurants IS 'Restaurant information and details. Price_range column removed.';
