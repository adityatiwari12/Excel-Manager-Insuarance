-- Excel Data Manager - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Create entries table
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_name TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  case_number TEXT,
  policy_number TEXT NOT NULL,
  claim_number TEXT NOT NULL,
  vehicle_number TEXT NOT NULL,
  court TEXT,
  title TEXT NOT NULL,
  fir_number TEXT,
  date TEXT NOT NULL,
  date_of_accident TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_entries_dataset_name ON entries(dataset_name);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);

-- Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_entries_updated_at ON entries;
CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Enable Row Level Security (RLS)
-- Note: Service role key bypasses RLS, so this is optional
-- ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Optional: Create RLS policies for authenticated users
-- CREATE POLICY "Allow read access to all users" ON entries
--   FOR SELECT USING (true);

-- CREATE POLICY "Allow insert for authenticated users" ON entries
--   FOR INSERT WITH CHECK (true);

-- CREATE POLICY "Allow update for authenticated users" ON entries
--   FOR UPDATE USING (true);

-- CREATE POLICY "Allow delete for authenticated users" ON entries
--   FOR DELETE USING (true);
