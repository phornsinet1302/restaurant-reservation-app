-- =====================================================
-- Migration 026: Add Arrived Status to Reservations
-- =====================================================
-- Purpose: Add 'arrived' status to support complete booking lifecycle
-- The 'arrived' status indicates customer has confirmed their arrival at the restaurant

-- Drop the old CHECK constraint
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_status_check;

-- Add new CHECK constraint with 'arrived' status
ALTER TABLE reservations 
ADD CONSTRAINT reservations_status_check 
  CHECK (status IN ('pending', 'confirmed', 'arrived', 'rejected', 'cancelled', 'completed'));

-- Create index for arrived status lookups
CREATE INDEX IF NOT EXISTS idx_reservations_arrived 
  ON reservations(restaurant_id, status) 
  WHERE status = 'arrived';
