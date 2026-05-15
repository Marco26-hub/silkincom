-- Create newsletters table
CREATE TABLE IF NOT EXISTS newsletters (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE
);

-- Create index on email
CREATE INDEX IF NOT EXISTS idx_newsletters_email ON newsletters(email);

-- Enable RLS
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert
CREATE POLICY "Allow public insert" ON newsletters
  FOR INSERT WITH CHECK (true);

-- Allow only authenticated users to update
CREATE POLICY "Allow auth update" ON newsletters
  FOR UPDATE USING (auth.role() = 'authenticated');
