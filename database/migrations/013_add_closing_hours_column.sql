-- Add closing_hours column to restaurants table if it doesn't exist
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS closing_hours VARCHAR(20) DEFAULT '11:00PM';
