-- Add unique constraint on table_number per restaurant
-- Ensures each restaurant cannot have duplicate table numbers (Table 1 can only exist once per restaurant)

-- First, remove any existing duplicates if they exist (keeping the first one)
DELETE FROM tables t1
WHERE EXISTS (
  SELECT 1 FROM tables t2
  WHERE t2.restaurant_id = t1.restaurant_id
    AND t2.table_number = t1.table_number
    AND t2.created_at < t1.created_at
);

-- Add the unique constraint
ALTER TABLE IF EXISTS tables
ADD CONSTRAINT unique_table_number_per_restaurant
UNIQUE (restaurant_id, table_number);

-- Create index for performance
CREATE INDEX IF NOT EXISTS tables_restaurant_table_number_idx 
ON tables(restaurant_id, table_number);

-- Log migration
SELECT 'Migration 022: Added unique constraint on (restaurant_id, table_number)' as status;
