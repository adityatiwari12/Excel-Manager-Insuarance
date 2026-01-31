# Supabase Setup Guide

## Overview

This project uses Supabase as the database backend for storing insurance case data entries. This guide will help you set up the database schema and configure the connection.

## Prerequisites

- Supabase account (free tier works fine)
- Project created in Supabase dashboard
- Environment variables configured in `backend/.env`

## Database Schema

### Table: `entries`

This table stores all form entries with their associated dataset names.

#### SQL Schema

Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/vqxmjgrwfpykrftrshtx/sql):

```sql
-- Create entries table
CREATE TABLE entries (
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
CREATE INDEX idx_entries_dataset_name ON entries(dataset_name);
CREATE INDEX idx_entries_created_at ON entries(created_at);

-- Optional: Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Field Descriptions

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | UUID | Yes (auto) | Primary key, auto-generated |
| `dataset_name` | TEXT | Yes | Name of the dataset/Excel sheet |
| `serial_number` | TEXT | Yes | Serial number of the case |
| `case_number` | TEXT | No | Court case number |
| `policy_number` | TEXT | Yes | Insurance policy number |
| `claim_number` | TEXT | Yes | Insurance claim number |
| `vehicle_number` | TEXT | Yes | Vehicle registration number |
| `court` | TEXT | No | Court name |
| `title` | TEXT | Yes | Case title |
| `fir_number` | TEXT | No | FIR (First Information Report) number |
| `date` | TEXT | Yes | Date of FIR |
| `date_of_accident` | TEXT | No | Date when accident occurred |
| `created_at` | TIMESTAMPTZ | Yes (auto) | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Yes (auto) | Record last update timestamp |

## Row Level Security (RLS)

For this application, we're using the service role key which bypasses RLS. If you want to add RLS policies for additional security:

```sql
-- Enable RLS
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Allow all operations with service role (already bypasses RLS)
-- Or create specific policies for authenticated users:

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to all users" ON entries
  FOR SELECT
  USING (true);

-- Allow insert for authenticated users
CREATE POLICY "Allow insert for authenticated users" ON entries
  FOR INSERT
  WITH CHECK (true);

-- Allow update for authenticated users
CREATE POLICY "Allow update for authenticated users" ON entries
  FOR UPDATE
  USING (true);

-- Allow delete for authenticated users
CREATE POLICY "Allow delete for authenticated users" ON entries
  FOR DELETE
  USING (true);
```

## Environment Configuration

Your `backend/.env` file should contain:

```env
SUPABASE_URL=https://vqxmjgrwfpykrftrshtx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=3001
```

**Note:** The backend uses the `SUPABASE_SERVICE_ROLE_KEY` for database operations, which has full access and bypasses RLS policies.

## Testing the Connection

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. You should see:
   ```
   Server running on http://localhost:3001
   Connected to Supabase
   ```

3. Test the API:
   ```bash
   # Get datasets (should return empty array initially)
   curl http://localhost:3001/api/datasets
   ```

## Data Model

### Field Name Conversion

The backend automatically converts between camelCase (used by frontend) and snake_case (used by database):

- Frontend: `serialNumber`, `caseNumber`, `policyNumber`, etc.
- Database: `serial_number`, `case_number`, `policy_number`, etc.

### Required Fields

The following fields are required for form submission:
- Serial Number
- Policy Number
- Claim Number
- Vehicle Number
- Title
- Date of FIR

## Common Operations

### View Data in Supabase

1. Go to Table Editor: https://supabase.com/dashboard/project/vqxmjgrwfpykrftrshtx/editor
2. Select the `entries` table
3. View, edit, or delete records directly

### Backup Data

You can export data from Supabase:
1. Go to SQL Editor
2. Run: `SELECT * FROM entries;`
3. Download results as CSV

Or use the Excel export feature in the application.

### Clear All Data

To delete all entries (use with caution):
```sql
TRUNCATE TABLE entries;
```

## Troubleshooting

### Connection Errors

If you see "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY":
- Check that `.env` file exists in `backend/` directory
- Verify the environment variables are set correctly
- Restart the server after updating `.env`

### Database Errors

If you see "Database error" in API responses:
- Check that the `entries` table exists in Supabase
- Verify the table schema matches the expected structure
- Check Supabase logs in the dashboard

### Field Name Mismatches

If data isn't saving correctly:
- Ensure database columns use snake_case
- Frontend should use camelCase
- The server handles conversion automatically
