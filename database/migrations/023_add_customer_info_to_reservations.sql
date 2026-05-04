-- Add customer name and email to reservations table
-- This allows storing the specific name and email used for each booking

ALTER TABLE reservations 
ADD COLUMN customer_name VARCHAR(255),
ADD COLUMN customer_email VARCHAR(255);

-- Add index on customer_email for faster lookups
CREATE INDEX idx_reservations_customer_email ON reservations(customer_email);

COMMENT ON COLUMN reservations.customer_name IS 'Full name for the reservation as provided by the customer';
COMMENT ON COLUMN reservations.customer_email IS 'Email address for the reservation as provided by the customer';
