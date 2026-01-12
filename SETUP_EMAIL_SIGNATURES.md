# Setup Email Signatures Feature

## Problem
You're seeing this error: "Failed to save signature" with 404 errors because the `email_signatures` table doesn't exist in your database yet.

## Solution

### Step 1: Run the SQL Migration

1. **Go to Supabase Dashboard**
   - Open your Supabase project dashboard
   - Navigate to **SQL Editor** (in the left sidebar)

2. **Create New Query**
   - Click **"New Query"** button

3. **Copy and Paste the SQL**
   - Open the file `SETUP_EMAIL_SIGNATURES.sql` in this project
   - Copy all the SQL code
   - Paste it into the SQL Editor

4. **Run the Query**
   - Click **"Run"** button (or press Ctrl+Enter)
   - You should see: "email_signatures table created successfully!"

### Step 2: Verify It Worked

1. Go back to your app
2. Navigate to **Settings** → **Manage Signatures** (or go to `/signatures`)
3. Try creating a signature again
4. It should work now!

## What This SQL Does

- Creates the `email_signatures` table
- Sets up Row Level Security (RLS) policies
- Adds `include_signature` and `signature_id` columns to `email_drafts` table
- Adds `signature_id` column to `sent_emails` table
- All changes are safe (uses `IF NOT EXISTS` to avoid errors if already exists)

## Alternative: Run via Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

This will run all migration files in the `supabase/migrations/` folder.

## Troubleshooting

**Still getting 404 errors?**
- Make sure you ran the SQL in the correct Supabase project
- Check that the table exists: Go to Supabase Dashboard → Table Editor → Look for `email_signatures`

**Getting permission errors?**
- Make sure you're running the SQL as a database admin/superuser
- Check that RLS policies were created correctly

**Columns already exist errors?**
- That's okay! The SQL uses `IF NOT EXISTS` so it won't break if columns already exist
