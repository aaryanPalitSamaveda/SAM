# Database Schema Documentation

> Last Updated: 2026-01-06
> Project: Email Campaign Management System

## Overview

This document provides a complete reference of the database schema for the email campaign management system. Use this for understanding data relationships, planning migrations, and scaling decisions.

---

## Tables

### 1. `contacts`
Stores all contact information imported from CSV uploads.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `upload_batch_id` | uuid | No | - | Reference to the upload batch |
| `raw_data` | jsonb | No | - | Original CSV row data |
| `name` | text | Yes | - | Contact's name |
| `email` | text | No | - | Contact's email address |
| `company` | text | Yes | - | Company name |
| `enriched_data` | jsonb | Yes | - | Additional enriched data |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**Indexes:** Consider adding unique index on `email` for deduplication.

**RLS Policy:** `Allow all on contacts` - Currently allows all operations.

---

### 2. `upload_batches`
Tracks CSV file uploads and their processing status.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `file_name` | text | No | - | Original filename |
| `column_mapping` | jsonb | Yes | - | CSV column to field mapping |
| `total_contacts` | integer | Yes | 0 | Total contacts in batch |
| `processed_contacts` | integer | Yes | 0 | Processed count |
| `status` | text | Yes | `'pending'` | Status: pending, processing, completed, failed |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

---

### 3. `email_drafts`
AI-generated email drafts pending review and approval.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `contact_id` | uuid | No | - | Reference to contact |
| `draft_type` | draft_type (enum) | No | - | first_outreach, second_followup, final_followup |
| `subject` | text | No | - | Email subject line |
| `body` | text | No | - | Email body content |
| `edited_subject` | text | Yes | - | User-edited subject |
| `edited_body` | text | Yes | - | User-edited body |
| `status` | email_status (enum) | Yes | `'draft'` | draft, approved, sent, failed, scheduled |
| `approved_at` | timestamptz | Yes | - | When approved |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |

**Enums:**
- `draft_type`: `first_outreach`, `second_followup`, `final_followup`
- `email_status`: `draft`, `approved`, `sent`, `failed`, `scheduled`

---

### 4. `sent_emails`
Records of all sent emails with tracking information.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `draft_id` | uuid | Yes | - | Reference to original draft |
| `contact_id` | uuid | No | - | Reference to contact |
| `sender_account_id` | uuid | No | - | Reference to sender account |
| `campaign_id` | uuid | Yes | - | Reference to campaign (if from campaign) |
| `draft_type` | draft_type (enum) | No | - | Type of email sent |
| `subject` | text | No | - | Email subject |
| `body` | text | No | - | Email body |
| `recipient_email` | text | No | - | Recipient's email |
| `sent_at` | timestamptz | No | `now()` | When sent |
| `message_id` | text | Yes | - | Email provider message ID |
| `status` | text | Yes | `'sent'` | Delivery status |
| `sequence_step` | integer | Yes | - | Campaign sequence step number |

---

### 5. `scheduled_emails`
Queue for emails scheduled to be sent in the future.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `draft_id` | uuid | No | - | Reference to draft |
| `contact_id` | uuid | No | - | Reference to contact |
| `sender_account_id` | uuid | No | - | Reference to sender |
| `scheduled_for` | timestamptz | No | - | When to send |
| `status` | text | Yes | `'pending'` | pending, sent, cancelled |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

---

### 6. `sender_accounts`
Email sender accounts (Outlook/Microsoft 365).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `email` | text | No | - | Sender email address |
| `display_name` | text | Yes | - | Display name |
| `is_active` | boolean | Yes | `true` | Whether account is active |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

---

### 7. `email_templates`
Reusable email templates for AI generation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | - | Template name |
| `template_content` | text | No | - | Template content |
| `is_active` | boolean | Yes | `true` | Whether active |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update |

---

### 8. `email_analytics`
Daily aggregated email statistics.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `date` | date | No | `CURRENT_DATE` | Date of stats (unique) |
| `total_drafts_created` | integer | Yes | 0 | Drafts created that day |
| `total_drafts_approved` | integer | Yes | 0 | Drafts approved |
| `total_emails_sent` | integer | Yes | 0 | Emails sent |
| `total_followups_sent` | integer | Yes | 0 | Follow-up emails sent |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

---

### 9. `contact_lists`
Reusable contact lists for campaigns.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | - | List name |
| `description` | text | Yes | - | List description |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update |

---

### 10. `contact_list_members`
Junction table linking contacts to lists.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `contact_id` | uuid | No | - | Reference to contact |
| `list_id` | uuid | No | - | Reference to list |
| `added_at` | timestamptz | No | `now()` | When added to list |

---

### 11. `campaigns`
Email campaign configurations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | - | Campaign name |
| `description` | text | Yes | - | Campaign description |
| `status` | text | No | `'draft'` | draft, active, paused, completed |
| `list_id` | uuid | Yes | - | Reference to contact list |
| `sender_account_id` | uuid | Yes | - | Reference to sender |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update |

---

### 12. `campaign_sequences`
Email sequence steps within a campaign.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `campaign_id` | uuid | No | - | Reference to campaign |
| `sequence_order` | integer | No | - | Order in sequence (1, 2, 3...) |
| `name` | text | No | - | Step name |
| `subject_template` | text | No | - | Subject line template |
| `body_template` | text | No | - | Body template |
| `delay_days` | integer | No | 0 | Days to wait after previous |
| `delay_hours` | integer | No | 0 | Hours to wait after previous |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

---

### 13. `campaign_settings`
Campaign-specific sending settings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `campaign_id` | uuid | No | - | Reference to campaign |
| `send_window_start` | time | No | `'09:00:00'` | Daily start time |
| `send_window_end` | time | No | `'18:00:00'` | Daily end time |
| `send_days` | text[] | No | `['monday', 'tuesday', ...]` | Days to send |
| `timezone` | text | No | `'UTC'` | Timezone for scheduling |
| `daily_limit` | integer | No | 50 | Max emails per day |
| `delay_between_emails_seconds` | integer | No | 120 | Delay between sends |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update |

---

### 14. `campaign_contacts`
Tracks individual contact progress in campaigns.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `campaign_id` | uuid | No | - | Reference to campaign |
| `contact_id` | uuid | No | - | Reference to contact |
| `status` | text | No | `'pending'` | pending, in_progress, completed, replied, bounced, unsubscribed |
| `current_sequence_step` | integer | No | 0 | Current step in sequence |
| `enrolled_at` | timestamptz | No | `now()` | When enrolled |
| `completed_at` | timestamptz | Yes | - | When completed |
| `replied_at` | timestamptz | Yes | - | When replied |
| `last_email_sent_at` | timestamptz | Yes | - | Last email timestamp |

---

### 15. `email_replies`
Tracks replies received from contacts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `sent_email_id` | uuid | Yes | - | Reference to sent email |
| `campaign_id` | uuid | Yes | - | Reference to campaign |
| `contact_id` | uuid | No | - | Reference to contact |
| `message_id` | text | Yes | - | Email message ID |
| `received_at` | timestamptz | No | `now()` | When received |
| `subject` | text | Yes | - | Reply subject |
| `snippet` | text | Yes | - | Reply preview |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

---

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  upload_batches │     │    contacts     │     │ contact_lists   │
│─────────────────│     │─────────────────│     │─────────────────│
│ id (PK)         │◄────│ upload_batch_id │     │ id (PK)         │
│ file_name       │     │ id (PK)         │     │ name            │
│ column_mapping  │     │ name            │     │ description     │
│ total_contacts  │     │ email           │     └────────┬────────┘
│ status          │     │ company         │              │
└─────────────────┘     │ raw_data        │              │
                        └────────┬────────┘              │
                                 │                       │
                    ┌────────────┼───────────────────────┤
                    │            │                       │
                    ▼            ▼                       ▼
        ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
        │  email_drafts   │  │ campaign_contacts│  │contact_list_members│
        │─────────────────│  │─────────────────│  │─────────────────│
        │ id (PK)         │  │ id (PK)         │  │ id (PK)         │
        │ contact_id (FK) │  │ contact_id (FK) │  │ contact_id (FK) │
        │ draft_type      │  │ campaign_id (FK)│  │ list_id (FK)    │
        │ subject         │  │ status          │  └─────────────────┘
        │ body            │  │ current_step    │
        │ status          │  └────────┬────────┘
        └────────┬────────┘           │
                 │                    │
                 ▼                    ▼
        ┌─────────────────┐  ┌─────────────────┐
        │   sent_emails   │  │    campaigns    │
        │─────────────────│  │─────────────────│
        │ id (PK)         │  │ id (PK)         │
        │ draft_id (FK)   │  │ name            │
        │ contact_id (FK) │  │ status          │
        │ sender_id (FK)  │  │ list_id (FK)    │
        │ campaign_id(FK) │  │ sender_id (FK)  │
        └─────────────────┘  └────────┬────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
        ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
        │campaign_sequences│  │campaign_settings│  │ sender_accounts │
        │─────────────────│  │─────────────────│  │─────────────────│
        │ id (PK)         │  │ id (PK)         │  │ id (PK)         │
        │ campaign_id(FK) │  │ campaign_id(FK) │  │ email           │
        │ sequence_order  │  │ daily_limit     │  │ display_name    │
        │ subject_template│  │ send_window_*   │  │ is_active       │
        │ body_template   │  │ timezone        │  └─────────────────┘
        └─────────────────┘  └─────────────────┘
```

---

## Database Functions (Triggers)

### 1. `create_campaign_settings()`
**Trigger:** After INSERT on `campaigns`
**Purpose:** Automatically creates default settings when a new campaign is created.

```sql
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
$function$
```

### 2. `handle_email_reply()`
**Trigger:** After INSERT on `email_replies`
**Purpose:** Updates campaign contact status to 'replied' when a reply is received.

```sql
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
$function$
```

### 3. `update_email_analytics()`
**Trigger:** After INSERT on `sent_emails`
**Purpose:** Increments daily email sent counter.

```sql
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
$function$
```

### 4. `update_draft_analytics()`
**Trigger:** After INSERT/UPDATE on `email_drafts`
**Purpose:** Updates draft creation and approval counts.

```sql
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
$function$
```

---

## Row Level Security (RLS)

Currently, all tables have RLS enabled with permissive policies allowing all operations:

```sql
Policy Name: Allow all on [table_name]
Command: ALL
Using Expression: true
With Check Expression: true
```

**⚠️ Security Note:** These are placeholder policies. For production, implement proper user-based access control.

---

## Migration Notes

See `docs/MIGRATION_GUIDE.md` for detailed migration procedures.
