-- =====================================================
-- Migration 025: Add Merchant Reservation Management
-- =====================================================
-- Purpose: Add fields to support merchant confirmation/rejection/cancellation workflow
-- Fields:
-- - merchant_confirmed_at: When merchant confirms the reservation
-- - merchant_rejected_at: When merchant rejects the reservation  
-- - rejection_reason: Reason for rejection
-- - cancellation_reason: Reason for cancellation (by merchant or customer)

ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS merchant_confirmed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS merchant_rejected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Create index for merchant lookups
CREATE INDEX IF NOT EXISTS idx_reservations_merchant_pending 
  ON reservations(restaurant_id, status) 
  WHERE status = 'pending';

-- Add RLS policy for merchants to view their own restaurant's reservations
CREATE POLICY "Merchants can view their restaurant reservations" ON reservations
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE merchant_id = auth.uid()
    )
  );

-- Add RLS policy for merchants to update reservation status
CREATE POLICY "Merchants can update their restaurant reservations" ON reservations
  FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE merchant_id = auth.uid()
    )
  );

-- Verify role-based access
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
