-- Convert opening_hours from JSONB to VARCHAR
-- This allows strings like '10:00AM' instead of requiring JSON format

ALTER TABLE restaurants
ALTER COLUMN opening_hours TYPE VARCHAR(20) USING (opening_hours::text);

-- Also ensure closing_hours is VARCHAR (in case of prior issues)
ALTER TABLE restaurants
ALTER COLUMN closing_hours TYPE VARCHAR(20);
