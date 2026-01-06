# Complete Guide: Building Your Supabase Database

> Based on all 6 documentation files: DATABASE_SCHEMA.md, EDGE_FUNCTIONS.md, MIGRATION_GUIDE.md, ARCHITECTURE.md, SECRETS_AND_CONFIG.md, API_REFERENCE.md

## Overview

This guide provides step-by-step instructions to build your complete Supabase database from scratch. Follow these steps in order to ensure all dependencies are created correctly.

---

## Prerequisites

1. **New Supabase Project Created**
   - Project URL: `https://tmzljbqiigltcspwsehj.supabase.co`
   - Project ID: `tmzljbqiigltcspwsehj`
   - Anon Key: (from your project settings)

2. **Access to Supabase Dashboard**
   - SQL Editor access
   - Project Settings access

---

## Step-by-Step Database Build Process

### Step 1: Run the Safe Migration Script

Since you encountered existing objects, use the safe migration script:

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/tmzljbqiigltcspwsehj/sql/new
   - Or navigate: Dashboard → SQL Editor → New Query

2. **Run `safe-migration.sql`**
   - Open `safe-migration.sql` from your project root
   - Copy the entire file contents
   - Paste into SQL Editor
   - Click **Run** (or press Ctrl+Enter)

   **What this does:**
   - Drops all existing objects (if any)
   - Creates 2 custom ENUM types
   - Creates 15 tables in correct dependency order
   - Sets up all foreign keys
   - Enables Row Level Security (RLS)
   - Creates 4 database functions
   - Creates 5 triggers
   - Creates RLS policies for all tables
   - Inserts default sender accounts

3. **Verify Success**
   - Check for any errors in the SQL Editor output
   - Navigate to **Table Editor** to see all 15 tables created

---

### Step 2: Verify Database Structure

#### Check Tables Created (15 total)

Navigate to **Table Editor** and verify these tables exist:

**Core Tables:**
1. ✅ `sender_accounts` - Email sender accounts
2. ✅ `email_templates` - Reusable email templates
3. ✅ `upload_batches` - CSV upload tracking
4. ✅ `contacts` - Contact information
5. ✅ `email_drafts` - AI-generated drafts
6. ✅ `sent_emails` - Sent email records
7. ✅ `scheduled_emails` - Scheduled email queue
8. ✅ `email_analytics` - Daily analytics

**Campaign Tables:**
9. ✅ `contact_lists` - Contact list organization
10. ✅ `contact_list_members` - Contact-to-list mapping
11. ✅ `campaigns` - Campaign configurations
12. ✅ `campaign_sequences` - Email sequence steps
13. ✅ `campaign_settings` - Campaign sending settings
14. ✅ `campaign_contacts` - Contact campaign progress
15. ✅ `email_replies` - Reply tracking

#### Check Enums Created (2 total)

Run this query in SQL Editor:
```sql
SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;
```

Should show:
- `draft_type` (first_outreach, second_followup, final_followup)
- `email_status` (draft, approved, sent, failed, scheduled)

#### Check Functions Created (4 total)

Run this query:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
```

Should show:
- `create_campaign_settings()`
- `handle_email_reply()`
- `update_email_analytics()`
- `update_draft_analytics()`

#### Check Triggers Created (5 total)

Run this query:
```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

Should show:
- `on_campaign_created` → `campaigns`
- `on_email_reply_received` → `email_replies`
- `on_email_sent` → `sent_emails`
- `on_draft_created` → `email_drafts`
- `on_draft_approved` → `email_drafts`

---

### Step 3: Add Performance Indexes (Optional but Recommended)

For better query performance, add these indexes:

```sql
-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_upload_batch ON contacts(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_contact ON email_drafts(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON email_drafts(status);
CREATE INDEX IF NOT EXISTS idx_sent_emails_contact ON sent_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_campaign ON sent_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign ON campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON campaign_contacts(status);
```

Run this in SQL Editor.

---

### Step 4: Verify Default Data

Check that default sender accounts were inserted:

```sql
SELECT * FROM sender_accounts;
```

Should show 3 accounts:
- `aaryan@samavedacapital.com` - Aaryan
- `vineeth@samavedacapital.com` - Vineeth
- `ops@samavedacapital.com` - Operations

---

### Step 5: Configure Environment Variables

Create `.env` file in project root (if not already created):

```env
VITE_SUPABASE_URL=https://tmzljbqiigltcspwsehj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key-here
VITE_SUPABASE_PROJECT_ID=tmzljbqiigltcspwsehj
```

**Note:** Restart your dev server after creating/updating `.env` file.

---

### Step 6: Configure Edge Function Secrets (If Using Edge Functions)

If you plan to use the `generate-drafts` and `send-email` edge functions:

1. **Go to Project Settings → Edge Functions → Secrets**

2. **Add Required Secrets:**

   **For `generate-drafts` function:**
   - `ANTHROPIC_API_KEY` - Your Claude AI API key
     - Get from: https://console.anthropic.com
     - Used for AI email generation

   **For `send-email` function:**
   - `OUTLOOK_CLIENT_ID` - Azure AD application client ID
   - `OUTLOOK_CLIENT_SECRET` - Azure AD application client secret
   - `OUTLOOK_TENANT_ID` - Azure AD tenant ID
     - See `docs/SECRETS_AND_CONFIG.md` for Azure AD setup guide

3. **Auto-Provided Secrets** (already available):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`

---

### Step 7: Deploy Edge Functions (Optional)

If you want to deploy the edge functions:

```bash
# Link to your project (if CLI access works)
supabase link --project-ref tmzljbqiigltcspwsehj

# Deploy functions
supabase functions deploy generate-drafts
supabase functions deploy send-email
```

**Note:** If CLI linking fails (as you experienced), you can deploy via:
- Supabase Dashboard → Edge Functions → Deploy
- Or use the Supabase CLI with proper authentication

---

### Step 8: Test Database Connection

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Test basic queries:**
   - Open your app in browser
   - Navigate to different pages
   - Check browser console for any connection errors

3. **Test a simple query in SQL Editor:**
   ```sql
   SELECT COUNT(*) as total_tables 
   FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
   ```
   Should return: `15`

---

## Database Schema Summary

### Table Relationships (ER Diagram)

```
upload_batches → contacts → email_drafts → sent_emails
                              ↓
                         scheduled_emails

contact_lists → contact_list_members ← contacts
     ↓
campaigns → campaign_sequences
     ↓
campaign_settings
     ↓
campaign_contacts ← contacts

sent_emails → email_replies

sender_accounts → sent_emails
                → scheduled_emails
                → campaigns
```

### Key Relationships

- **contacts** belong to **upload_batches**
- **email_drafts** reference **contacts**
- **sent_emails** reference **drafts**, **contacts**, **sender_accounts**, and optionally **campaigns**
- **campaigns** reference **contact_lists** and **sender_accounts**
- **campaign_contacts** track contact progress in campaigns
- **email_replies** link back to **sent_emails** and **campaigns**

---

## Verification Checklist

Use this checklist to verify everything is set up correctly:

### Database Structure
- [ ] All 15 tables created
- [ ] 2 ENUM types created (draft_type, email_status)
- [ ] All foreign keys working
- [ ] RLS enabled on all tables
- [ ] RLS policies created for all tables

### Functions & Triggers
- [ ] 4 database functions created
- [ ] 5 triggers created and active
- [ ] Trigger `on_campaign_created` works (test by creating a campaign)
- [ ] Trigger `on_email_sent` works (test by inserting sent email)

### Default Data
- [ ] 3 sender accounts inserted
- [ ] Can query sender_accounts table

### Configuration
- [ ] `.env` file created with correct values
- [ ] `supabase/config.toml` updated with new project ID
- [ ] Edge function secrets configured (if using functions)

### Testing
- [ ] Can connect from frontend
- [ ] Can query contacts table
- [ ] Can insert test data
- [ ] Triggers fire correctly

---

## Common Issues & Solutions

### Issue: "type already exists" error
**Solution:** Use `safe-migration.sql` which drops existing objects first

### Issue: Foreign key constraint errors
**Solution:** Ensure tables are created in dependency order (safe-migration.sql handles this)

### Issue: RLS blocking queries
**Solution:** Verify RLS policies are created. Check with:
```sql
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Issue: Triggers not firing
**Solution:** Verify triggers exist:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE 'on_%';
```

### Issue: Frontend can't connect
**Solution:** 
- Verify `.env` file exists and has correct values
- Restart dev server after creating `.env`
- Check browser console for specific error

---

## Next Steps After Database Setup

1. **Import Contacts** (if you have existing data)
   - Use Upload Contacts page
   - Or import via SQL if you have exported data

2. **Create Email Templates**
   - Navigate to Templates page
   - Create templates for AI generation

3. **Test Edge Functions** (if configured)
   - Test `generate-drafts` with sample contacts
   - Test `send-email` with a test draft

4. **Create Your First Campaign**
   - Create a contact list
   - Create a campaign
   - Configure sequences
   - Activate campaign

---

## Reference Documentation

For detailed information, refer to:

- **DATABASE_SCHEMA.md** - Complete table structures, relationships, ER diagram
- **MIGRATION_GUIDE.md** - Migration procedures, data export, scaling recommendations
- **EDGE_FUNCTIONS.md** - Edge function details, API endpoints, configuration
- **API_REFERENCE.md** - All database query patterns, edge function calls
- **SECRETS_AND_CONFIG.md** - Environment variables, secrets setup, troubleshooting
- **ARCHITECTURE.md** - System overview, tech stack, data flow diagrams

---

## Support

If you encounter issues:

1. Check SQL Editor for error messages
2. Review the relevant documentation file
3. Verify all steps were completed in order
4. Check Supabase project logs in Dashboard

---

**Database Build Complete!** 🎉

Your Supabase database is now ready to use with all 15 tables, functions, triggers, and policies configured.

