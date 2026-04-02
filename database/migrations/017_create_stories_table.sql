-- Create stories table with 24h expiration
-- Stories are auto-deleted after 24 hours using PostgreSQL row-level security and cleanup

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
  UNIQUE(restaurant_id, created_at)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_stories_restaurant_id ON stories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view active stories (not expired)
CREATE POLICY "Anyone can view active restaurant stories" ON stories
  FOR SELECT USING (expires_at > CURRENT_TIMESTAMP);

-- RLS Policy: Merchants can create stories for their restaurants
CREATE POLICY "Merchants can create stories for their restaurants" ON stories
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE merchant_id = auth.uid()
    )
  );

-- RLS Policy: Merchants can delete their own stories
CREATE POLICY "Merchants can delete their own stories" ON stories
  FOR DELETE USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE merchant_id = auth.uid()
    )
  );

COMMENT ON TABLE stories IS 'Restaurant stories - auto-expire after 24 hours like Facebook stories';
