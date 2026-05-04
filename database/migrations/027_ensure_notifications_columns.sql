-- Migration: Ensure notifications table has all required columns
-- Purpose: Verify and add missing columns for notification functionality

-- Check if type column exists, if not add it
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';

-- Ensure message column is TEXT (handles long messages)
ALTER TABLE notifications
ALTER COLUMN message SET DATA TYPE TEXT;

-- Ensure is_read is BOOLEAN
ALTER TABLE notifications
ALTER COLUMN is_read SET DATA TYPE BOOLEAN;

-- Add comment
COMMENT ON COLUMN notifications.type IS 'Type of notification: booking_created, booking_confirmed, booking_rejected, booking_modified, booking_cancelled, booking_received, etc';
