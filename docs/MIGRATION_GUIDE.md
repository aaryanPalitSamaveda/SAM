# Database Migration Guide

> Last Updated: 2026-01-06
> Project: Email Campaign Management System

## Overview

This guide provides comprehensive instructions for migrating the database to a new environment, scaling considerations, and backup procedures.

---

## Quick Export

### Export All Data (SQL)

```sql
-- Run these queries to export data in order of dependencies

-- 1. Export sender_accounts (no dependencies)
SELECT * FROM sender_accounts;

-- 2. Export email_templates (no dependencies)
SELECT * FROM email_templates;

-- 3. Export contact_lists (no dependencies)
SELECT * FROM contact_lists;

-- 4. Export upload_batches (no dependencies)
SELECT * FROM upload_batches;

-- 5. Export contacts (depends on upload_batches)
SELECT * FROM contacts;

-- 6. Export contact_list_members (depends on contacts, contact_lists)
SELECT * FROM contact_list_members;

-- 7. Export campaigns (depends on contact_lists, sender_accounts)
SELECT * FROM campaigns;

-- 8. Export campaign_settings (depends on campaigns)
SELECT * FROM campaign_settings;

-- 9. Export campaign_sequences (depends on campaigns)
SELECT * FROM campaign_sequences;

-- 10. Export campaign_contacts (depends on campaigns, contacts)
SELECT * FROM campaign_contacts;

-- 11. Export email_drafts (depends on contacts)
SELECT * FROM email_drafts;

-- 12. Export sent_emails (depends on contacts, email_drafts, sender_accounts, campaigns)
SELECT * FROM sent_emails;

-- 13. Export scheduled_emails (depends on email_drafts, contacts, sender_accounts)
SELECT * FROM scheduled_emails;

-- 14. Export email_replies (depends on sent_emails, campaigns, contacts)
SELECT * FROM email_replies;

-- 15. Export email_analytics (no dependencies)
SELECT * FROM email_analytics;
```

---

## Complete Schema Recreation

### Step 1: Create Enums

```sql
-- Create custom types
CREATE TYPE draft_type AS ENUM ('first_outreach', 'second_followup', 'final_followup');
CREATE TYPE email_status AS ENUM ('draft', 'approved', 'sent', 'failed', 'scheduled');
```

### Step 2: Create Tables (in dependency order)

```sql
-- 1. sender_accounts
CREATE TABLE public.sender_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. email_templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. contact_lists
CREATE TABLE public.contact_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. upload_batches
CREATE TABLE public.upload_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  column_mapping JSONB,
  total_contacts INTEGER DEFAULT 0,
  processed_contacts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. contacts
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_batch_id UUID NOT NULL REFERENCES upload_batches(id),
  raw_data JSONB NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  company TEXT,
  enriched_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. contact_list_members
CREATE TABLE public.contact_list_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, list_id)
);

-- 7. campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  list_id UUID REFERENCES contact_lists(id),
  sender_account_id UUID REFERENCES sender_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. campaign_settings
CREATE TABLE public.campaign_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  send_window_start TIME NOT NULL DEFAULT '09:00:00',
  send_window_end TIME NOT NULL DEFAULT '18:00:00',
  send_days TEXT[] NOT NULL DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  timezone TEXT NOT NULL DEFAULT 'UTC',
  daily_limit INTEGER NOT NULL DEFAULT 50,
  delay_between_emails_seconds INTEGER NOT NULL DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id)
);

-- 9. campaign_sequences
CREATE TABLE public.campaign_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. campaign_contacts
CREATE TABLE public.campaign_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  current_sequence_step INTEGER NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  last_email_sent_at TIMESTAMPTZ,
  UNIQUE(campaign_id, contact_id)
);

-- 11. email_drafts
CREATE TABLE public.email_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  draft_type draft_type NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  edited_subject TEXT,
  edited_body TEXT,
  status email_status DEFAULT 'draft',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. sent_emails
CREATE TABLE public.sent_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID REFERENCES email_drafts(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  sender_account_id UUID NOT NULL REFERENCES sender_accounts(id),
  campaign_id UUID REFERENCES campaigns(id),
  draft_type draft_type NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_id TEXT,
  status TEXT DEFAULT 'sent',
  sequence_step INTEGER
);

-- 13. scheduled_emails
CREATE TABLE public.scheduled_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES email_drafts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  sender_account_id UUID NOT NULL REFERENCES sender_accounts(id),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. email_replies
CREATE TABLE public.email_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_email_id UUID REFERENCES sent_emails(id),
  campaign_id UUID REFERENCES campaigns(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  message_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subject TEXT,
  snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. email_analytics
CREATE TABLE public.email_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_drafts_created INTEGER DEFAULT 0,
  total_drafts_approved INTEGER DEFAULT 0,
  total_emails_sent INTEGER DEFAULT 0,
  total_followups_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Step 3: Create Database Functions

```sql
-- Function: Auto-create campaign settings
CREATE OR REPLACE FUNCTION public.create_campaign_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.campaign_settings (campaign_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

-- Function: Handle email replies
CREATE OR REPLACE FUNCTION public.handle_email_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.campaign_contacts
  SET status = 'replied', replied_at = NEW.received_at
  WHERE contact_id = NEW.contact_id 
    AND campaign_id = NEW.campaign_id
    AND status IN ('pending', 'in_progress');
  RETURN NEW;
END;
$function$;

-- Function: Update email analytics on send
CREATE OR REPLACE FUNCTION public.update_email_analytics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.email_analytics (date, total_emails_sent)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date) 
  DO UPDATE SET total_emails_sent = email_analytics.total_emails_sent + 1;
  RETURN NEW;
END;
$function$;

-- Function: Update draft analytics
CREATE OR REPLACE FUNCTION public.update_draft_analytics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.email_analytics (date, total_drafts_created)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (date) 
    DO UPDATE SET total_drafts_created = email_analytics.total_drafts_created + 1;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO public.email_analytics (date, total_drafts_approved)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (date) 
    DO UPDATE SET total_drafts_approved = email_analytics.total_drafts_approved + 1;
  END IF;
  RETURN NEW;
END;
$function$;
```

### Step 4: Create Triggers

```sql
-- Trigger: Auto-create campaign settings
CREATE TRIGGER create_campaign_settings_trigger
  AFTER INSERT ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.create_campaign_settings();

-- Trigger: Handle email replies
CREATE TRIGGER handle_email_reply_trigger
  AFTER INSERT ON public.email_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_email_reply();

-- Trigger: Update email analytics
CREATE TRIGGER update_email_analytics_trigger
  AFTER INSERT ON public.sent_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_analytics();

-- Trigger: Update draft analytics (insert)
CREATE TRIGGER update_draft_analytics_insert_trigger
  AFTER INSERT ON public.email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_draft_analytics();

-- Trigger: Update draft analytics (update)
CREATE TRIGGER update_draft_analytics_update_trigger
  AFTER UPDATE ON public.email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_draft_analytics();
```

### Step 5: Enable Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE public.sender_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (adjust for production)
-- Example for contacts table:
CREATE POLICY "Allow all on contacts" ON public.contacts
  FOR ALL USING (true) WITH CHECK (true);

-- Repeat for all tables...
```

---

## Scaling Recommendations

### Indexes to Add

```sql
-- Performance indexes for common queries
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_upload_batch ON contacts(upload_batch_id);
CREATE INDEX idx_email_drafts_contact ON email_drafts(contact_id);
CREATE INDEX idx_email_drafts_status ON email_drafts(status);
CREATE INDEX idx_sent_emails_contact ON sent_emails(contact_id);
CREATE INDEX idx_sent_emails_campaign ON sent_emails(campaign_id);
CREATE INDEX idx_sent_emails_sent_at ON sent_emails(sent_at DESC);
CREATE INDEX idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX idx_campaign_contacts_campaign ON campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_status ON campaign_contacts(status);
```

### Unique Constraints

```sql
-- Prevent duplicate contacts by email
ALTER TABLE contacts ADD CONSTRAINT contacts_email_unique UNIQUE (email);

-- Prevent duplicate list memberships
ALTER TABLE contact_list_members 
  ADD CONSTRAINT unique_contact_list_member UNIQUE (contact_id, list_id);
```

### Partitioning (for high volume)

```sql
-- Example: Partition sent_emails by month
CREATE TABLE sent_emails_partitioned (
  LIKE sent_emails INCLUDING ALL
) PARTITION BY RANGE (sent_at);

-- Create monthly partitions
CREATE TABLE sent_emails_2026_01 PARTITION OF sent_emails_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

---

## Data Volume Estimates

| Table | Expected Rows (Year 1) | Growth Rate |
|-------|------------------------|-------------|
| contacts | 10,000 - 100,000 | Moderate |
| email_drafts | 30,000 - 300,000 | 3x contacts |
| sent_emails | 20,000 - 200,000 | High |
| email_analytics | 365 | Daily |
| campaigns | 50 - 500 | Low |

---

## Backup Strategy

### Daily Backup Query

```sql
-- Export critical data as JSON
SELECT json_agg(row_to_json(t)) 
FROM (SELECT * FROM contacts) t;

-- Repeat for each table
```

### Recommended Backup Schedule

| Data Type | Frequency | Retention |
|-----------|-----------|-----------|
| Full database | Daily | 30 days |
| contacts | Hourly | 7 days |
| sent_emails | Hourly | 30 days |
| email_drafts | Every 6 hours | 14 days |

---

## Environment Variables for New Instance

```env
VITE_SUPABASE_URL=https://[new-project-id].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[new-anon-key]
VITE_SUPABASE_PROJECT_ID=[new-project-id]

# Edge function secrets
ANTHROPIC_API_KEY=[your-api-key]
OUTLOOK_CLIENT_ID=[azure-app-client-id]
OUTLOOK_CLIENT_SECRET=[azure-app-client-secret]
OUTLOOK_TENANT_ID=[azure-tenant-id]
```

---

## Migration Checklist

- [ ] Export all data from source database
- [ ] Create new Supabase project
- [ ] Run schema creation scripts
- [ ] Create database functions
- [ ] Create triggers
- [ ] Enable RLS and create policies
- [ ] Import data in dependency order
- [ ] Create recommended indexes
- [ ] Configure edge function secrets
- [ ] Test edge functions
- [ ] Update frontend environment variables
- [ ] Verify all functionality
