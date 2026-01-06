# Complete Email Tracking & Automation Workflow

## Overview

This document describes the complete email tracking and automation system that manages the entire email outreach lifecycle from CSV upload to reply detection.

---

## Complete Workflow

### 1. **Upload CSV/Excel** → Extract & Save Contacts

**Location:** `/upload-contacts` page

**Process:**
- User uploads CSV/Excel file
- System extracts contacts and maps columns (name, email, company)
- **Duplicate Detection:** Checks if email already exists in database
- **Saves only new contacts** (skips duplicates)
- Creates `upload_batch` record for tracking

**Database Tables:**
- `upload_batches` - Tracks file uploads
- `contacts` - Stores contact information

---

### 2. **Choose Template** → Generate Emails

**Location:** `/drafts` page

**Process:**
- User selects an email template
- User selects contacts (or generates for all contacts without drafts)
- System calls `generate-drafts` edge function
- AI generates **3 personalized emails** for each contact:
  1. **First Outreach** - Initial email
  2. **First Follow-up** - To be sent 4 days after first outreach
  3. **Final Follow-up** - To be sent 7 days after first outreach

**Database Tables:**
- `email_drafts` - Stores generated drafts with status `draft`

**Edge Function:** `generate-drafts`
- Uses Claude AI (Anthropic API)
- Generates personalized content based on template and contact data
- Creates 3 drafts per contact

---

### 3. **Edit/Approval** → Review Generated Mails

**Location:** `/drafts` page

**Process:**
- User reviews AI-generated drafts
- Can **edit** subject and body
- **Approve** drafts individually or in bulk
- Approved drafts get status `approved` and `approved_at` timestamp

**Features:**
- Edit draft content before approval
- Approve individual drafts
- View drafts grouped by contact
- Filter by status (draft, approved, sent)

**Database Updates:**
- `email_drafts.status` → `approved`
- `email_drafts.approved_at` → timestamp
- `email_drafts.edited_subject` / `edited_body` → saved if edited

---

### 4. **Send Approved Emails** → Bulk Send

**Location:** `/drafts` page

**Two Options:**

#### Option A: Send Individual Contact
- Click "Send" button for a contact with all 3 drafts approved
- Sends first outreach email immediately
- Automatically schedules follow-ups

#### Option B: Send All Approved (Bulk)
- Click "Send All Approved" button
- Sends all approved first outreach emails
- Processes in batches with rate limiting (2 second delay)
- Automatically schedules follow-ups for each

**Edge Function:** `send-all-approved`
- Sends all approved first outreach emails
- Checks for replies before sending (skips replied contacts)
- Records each sent email
- Schedules follow-ups automatically

**Database Updates:**
- `sent_emails` - Records each sent email
- `email_drafts.status` → `sent`
- `scheduled_emails` - Creates follow-up schedule entries

---

### 5. **Track Every Mail Sent**

**Location:** `/sent-emails` page

**Features:**
- View all sent emails with full details
- Filter by email type (1st outreach, 2nd follow-up, final follow-up)
- Search by contact name, email, company, or subject
- See sender account, timestamp, and recipient

**Database Table:** `sent_emails`
- Complete record of every email sent
- Links to draft, contact, sender account
- Includes subject, body, sent timestamp

**Statistics:**
- Total emails sent
- Breakdown by type (1st outreach, 2nd follow-up, final follow-up)

---

### 6. **Automatic Follow-up Scheduling**

**Timing:**
- **1st Follow-up:** Sent **4 days** after first outreach
- **Final Follow-up:** Sent **7 days** after first outreach

**Process:**
- When first outreach is sent, system automatically:
  1. Creates `scheduled_emails` entries for follow-ups
  2. Sets `scheduled_for` timestamp (4 days and 7 days from now)
  3. Status set to `pending`

**Database Table:** `scheduled_emails`
- Tracks scheduled follow-up emails
- Links to draft, contact, sender account
- Includes scheduled timestamp

---

### 7. **Automatic Follow-up Processing**

**Edge Function:** `process-scheduled-emails`

**Process:**
- Should be called periodically (via cron job or scheduled task)
- Checks for scheduled emails where `scheduled_for <= now()`
- For each scheduled email:
  1. **Checks if contact has replied** (stops automation if replied)
  2. Sends email via Microsoft Graph API
  3. Records in `sent_emails` table
  4. Updates draft status to `sent`
  5. Updates scheduled email status to `sent`

**Reply Detection:**
- Before sending any follow-up, checks `email_replies` table
- If contact has replied, cancels scheduled email
- Updates scheduled email status to `cancelled`

**To Run Manually:**
```bash
curl -X POST \
  'https://tmzljbqiigltcspwsehj.supabase.co/functions/v1/process-scheduled-emails' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

**To Schedule Automatically:**
- Set up a cron job or scheduled task
- Call the function every hour or as needed
- Supabase Cron Jobs (if available) or external scheduler

---

### 8. **Reply Detection** → Stop Automation

**Process:**
- When a contact replies to any email:
  1. Reply is recorded in `email_replies` table
  2. System checks for pending scheduled emails for that contact
  3. Cancels all pending scheduled emails
  4. Updates status to `cancelled`

**Database Table:** `email_replies`
- Tracks all replies received
- Links to sent email, contact, campaign (if applicable)
- Includes reply content, timestamp, message ID

**Automatic Stop:**
- Before sending any follow-up, system checks for replies
- If reply exists, follow-up is skipped
- Contact status updated (if using campaign tracking)

**Manual Reply Entry:**
- Can manually add replies via database or admin interface
- System will respect manual entries

---

## Complete Email Lifecycle

```
1. Upload CSV
   ↓
2. Extract & Save Contacts (skip duplicates)
   ↓
3. Choose Template & Generate Drafts (3 per contact)
   ↓
4. Review & Approve Drafts
   ↓
5. Send All Approved First Outreach Emails
   ↓
6. System Automatically Schedules Follow-ups:
   - 1st Follow-up: 4 days later
   - Final Follow-up: 7 days later
   ↓
7. Process Scheduled Emails (automatic):
   - Check for replies (stop if replied)
   - Send follow-up emails
   - Record in sent_emails
   ↓
8. Track All Emails in Sent Emails Page
```

---

## Key Features

### ✅ Duplicate Prevention
- Checks email uniqueness before saving contacts
- Skips contacts already in database

### ✅ Reply Detection
- Checks for replies before sending follow-ups
- Automatically stops automation when contact replies
- Human takes over conversation

### ✅ Complete Tracking
- Every email tracked in `sent_emails` table
- Full audit trail of all communications
- Links to drafts, contacts, sender accounts

### ✅ Automatic Scheduling
- Follow-ups scheduled automatically
- No manual intervention needed
- Respects reply detection

### ✅ Bulk Operations
- Send all approved emails at once
- Rate limiting prevents API throttling
- Progress tracking

---

## Database Schema

### Key Tables:

**`contacts`**
- Stores all contact information
- Unique email constraint (implicit)

**`email_drafts`**
- Stores AI-generated drafts
- Status: `draft` → `approved` → `sent`
- Includes edited versions

**`sent_emails`**
- Complete record of every email sent
- Links to draft, contact, sender
- Includes timestamp and content

**`scheduled_emails`**
- Tracks scheduled follow-ups
- Status: `pending` → `sent` or `cancelled`
- Includes scheduled timestamp

**`email_replies`**
- Tracks all replies received
- Used to stop automation
- Links to contact and sent email

---

## Edge Functions

### 1. `generate-drafts`
- Generates 3 personalized emails per contact
- Uses Claude AI
- Saves drafts to database

### 2. `send-email`
- Sends single email
- Records in sent_emails
- Schedules follow-ups (if first outreach)
- Checks for replies before scheduling

### 3. `send-all-approved`
- Bulk sends all approved first outreach emails
- Checks for replies before sending
- Schedules follow-ups automatically
- Rate limiting included

### 4. `process-scheduled-emails`
- Processes scheduled follow-up emails
- Checks for replies (stops if replied)
- Sends emails and records them
- Should be called periodically

---

## Setup Instructions

### 1. Deploy Edge Functions

```bash
supabase functions deploy generate-drafts
supabase functions deploy send-email
supabase functions deploy send-all-approved
supabase functions deploy process-scheduled-emails
```

### 2. Set Up Scheduled Processing

**Option A: Supabase Cron (if available)**
- Create cron job to call `process-scheduled-emails` every hour

**Option B: External Scheduler**
- Use cron job, GitHub Actions, or cloud scheduler
- Call: `POST /functions/v1/process-scheduled-emails`

**Option C: Manual Trigger**
- Call function manually when needed
- Or set up webhook/API endpoint

### 3. Configure Reply Detection

**Option A: Manual Entry**
- Add replies manually via admin interface
- System will respect manual entries

**Option B: Email Webhook (Future)**
- Set up webhook to receive email replies
- Automatically populate `email_replies` table

---

## Usage Examples

### Send All Approved Emails

```typescript
const { data, error } = await supabase.functions.invoke('send-all-approved', {
  body: {
    senderAccountId: 'sender-uuid'
  }
});
```

### Process Scheduled Emails

```typescript
const { data, error } = await supabase.functions.invoke('process-scheduled-emails', {
  body: {}
});
```

### Check for Replies

```typescript
const { data } = await supabase
  .from('email_replies')
  .select('*')
  .eq('contact_id', contactId);
```

---

## Troubleshooting

### Follow-ups Not Sending
- Check if `process-scheduled-emails` is being called
- Verify scheduled emails exist in database
- Check for reply detection blocking sends

### Replies Not Detected
- Verify replies are in `email_replies` table
- Check contact_id matches correctly
- Ensure reply detection logic is running

### Bulk Send Failing
- Check Outlook credentials
- Verify rate limiting (2 second delay)
- Check for API errors in logs

---

## Future Enhancements

1. **Automatic Reply Detection**
   - Email webhook integration
   - Parse incoming emails
   - Auto-populate `email_replies` table

2. **Reply Notifications**
   - Alert when contact replies
   - Dashboard notification
   - Email notification

3. **Advanced Scheduling**
   - Time zone support
   - Business hours only
   - Custom delay periods

4. **Analytics Dashboard**
   - Reply rates
   - Open rates (if tracking available)
   - Engagement metrics

---

**System Status:** ✅ Fully Functional
**Last Updated:** 2026-01-06

