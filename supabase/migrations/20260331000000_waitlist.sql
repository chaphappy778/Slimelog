CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'landing_page',
  marketing_consent BOOLEAN DEFAULT FALSE,
  invited_at TIMESTAMPTZ,
  notes TEXT
);

-- RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public signup)
CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only service role can read (admin only)
CREATE POLICY "Service role only"
  ON waitlist FOR SELECT
  TO service_role
  USING (true);