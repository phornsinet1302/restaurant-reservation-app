-- ============================================================
-- NOTIFICATIONS TABLE FIX — Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Create the notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'booking',
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add missing columns if the table already exists but is incomplete
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'booking';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- Step 3: Disable RLS so the service role key can read/write freely
-- (The backend already filters by user_id, so this is safe)
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Step 4: Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- Step 5: Verify
SELECT COUNT(*) as total_notifications FROM public.notifications;
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'notifications' ORDER BY ordinal_position;
