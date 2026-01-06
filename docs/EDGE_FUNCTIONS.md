# Edge Functions Documentation

> Last Updated: 2026-01-06
> Project: Email Campaign Management System

## Overview

This document describes all Supabase Edge Functions in the project, including their purpose, inputs, outputs, dependencies, and configuration.

---

## Configuration

Edge functions are configured in `supabase/config.toml`:

```toml
project_id = "vieypvgulnwvkxayewgn"

[functions.generate-drafts]
verify_jwt = false

[functions.send-email]
verify_jwt = false
```

**Note:** JWT verification is disabled for both functions. For production, consider enabling JWT verification or implementing custom authentication.

---

## 1. `generate-drafts`

### Purpose
Generates personalized email drafts using Claude AI (Anthropic) for a batch of contacts based on a template.

### Location
`supabase/functions/generate-drafts/index.ts`

### Endpoint
```
POST https://vieypvgulnwvkxayewgn.supabase.co/functions/v1/generate-drafts
```

### Request Body
```typescript
{
  contacts: Array<{
    id: string;
    name: string | null;
    email: string;
    company: string | null;
    raw_data: Record<string, any>;
  }>;
  template: string;  // Email template for AI to follow
}
```

### Response
```typescript
// Success (200)
{
  success: true;
  drafts_created: number;
}

// Error (500)
{
  error: string;
}
```

### Environment Variables Required
| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for Claude AI |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for DB access |

### Logic Flow
1. Receives contacts array and template
2. For each contact:
   - Constructs detailed prompt with contact info
   - Calls Claude API (claude-sonnet-4-20250514)
   - Parses JSON response with 3 email drafts
   - Inserts drafts into `email_drafts` table
   - Waits 1 second between contacts (rate limiting)
3. Returns count of created drafts

### Database Operations
- **INSERT** into `email_drafts`: Creates 3 drafts per contact
  - `first_outreach`
  - `second_followup`
  - `final_followup`

### AI Prompt Structure
```
You are an expert investor relations email writer...

Contact Information:
- Name: {contact.name}
- Email: {contact.email}
- Company: {contact.company}
- Additional Data: {JSON.stringify(contact.raw_data)}

Template to follow:
{template}

Return JSON format:
{
  "first_outreach": {"subject": "...", "body": "..."},
  "second_followup": {"subject": "...", "body": "..."},
  "final_followup": {"subject": "...", "body": "..."}
}
```

### Error Handling
- Skips contacts if Claude API fails
- Returns 500 with error message for critical failures

### Rate Limiting
- 1 second delay between contacts
- Claude API has its own rate limits

---

## 2. `send-email`

### Purpose
Sends emails via Microsoft Graph API (Outlook/Microsoft 365) and manages follow-up scheduling.

### Location
`supabase/functions/send-email/index.ts`

### Endpoint
```
POST https://vieypvgulnwvkxayewgn.supabase.co/functions/v1/send-email
```

### Request Body
```typescript
{
  draftId: string;        // UUID of the email draft
  senderAccountId: string; // UUID of the sender account
}
```

### Response
```typescript
// Success (200)
{
  success: true;
}

// Error (500)
{
  error: string;
}
```

### Environment Variables Required
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for DB access |
| `OUTLOOK_CLIENT_ID` | Azure AD application client ID |
| `OUTLOOK_CLIENT_SECRET` | Azure AD application client secret |
| `OUTLOOK_TENANT_ID` | Azure AD tenant ID |

### Logic Flow
1. Fetches draft with contact info from `email_drafts`
2. Fetches sender account from `sender_accounts`
3. Gets OAuth 2.0 access token from Microsoft Identity Platform
4. Sends email via Microsoft Graph API
5. Records sent email in `sent_emails` table
6. Updates draft status to 'sent'
7. If first outreach, schedules follow-up emails

### Database Operations
- **SELECT** from `email_drafts`: Get draft with contact
- **SELECT** from `sender_accounts`: Get sender email
- **INSERT** into `sent_emails`: Record sent email
- **PATCH** on `email_drafts`: Update status to 'sent'
- **SELECT** from `email_drafts`: Get other approved drafts for contact
- **INSERT** into `scheduled_emails`: Schedule follow-ups

### Microsoft Graph API Integration
```typescript
// Token endpoint
POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token

// Send email endpoint
POST https://graph.microsoft.com/v1.0/users/{senderEmail}/sendMail
```

### Follow-up Scheduling
When a `first_outreach` email is sent:
- `second_followup`: Scheduled for 2 days later
- `final_followup`: Scheduled for 7 days later

Only schedules drafts with `status = 'approved'`.

### Error Handling
- Returns specific error messages for missing credentials
- Logs detailed errors for debugging
- Returns 500 for any failures

---

## Secrets Configuration

All secrets are stored in Supabase and accessed via `Deno.env.get()`:

| Secret Name | Used By | Description |
|-------------|---------|-------------|
| `ANTHROPIC_API_KEY` | generate-drafts | Claude AI API key |
| `SUPABASE_URL` | Both | Supabase project URL (auto-provided) |
| `SUPABASE_SERVICE_ROLE_KEY` | Both | Full DB access key (auto-provided) |
| `SUPABASE_ANON_KEY` | - | Anonymous access key (auto-provided) |
| `OUTLOOK_CLIENT_ID` | send-email | Azure AD app client ID |
| `OUTLOOK_CLIENT_SECRET` | send-email | Azure AD app client secret |
| `OUTLOOK_TENANT_ID` | send-email | Azure AD tenant ID |

---

## CORS Configuration

Both functions use standard CORS headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

OPTIONS requests return null body with CORS headers.

---

## Calling Edge Functions from Frontend

```typescript
import { supabase } from "@/integrations/supabase/client";

// Generate drafts
const { data, error } = await supabase.functions.invoke('generate-drafts', {
  body: {
    contacts: selectedContacts,
    template: templateContent
  }
});

// Send email
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    draftId: draft.id,
    senderAccountId: selectedSender.id
  }
});
```

---

## Testing Edge Functions

### Using curl

```bash
# Generate drafts
curl -X POST \
  'https://vieypvgulnwvkxayewgn.supabase.co/functions/v1/generate-drafts' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "contacts": [{"id": "uuid", "name": "John", "email": "john@example.com", "company": "Acme", "raw_data": {}}],
    "template": "Your template here..."
  }'

# Send email
curl -X POST \
  'https://vieypvgulnwvkxayewgn.supabase.co/functions/v1/send-email' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "draftId": "draft-uuid",
    "senderAccountId": "sender-uuid"
  }'
```

---

## Deployment

Edge functions are automatically deployed when code is pushed. No manual deployment required.

To check deployment status, view edge function logs in the Lovable Cloud interface.

---

## Planned Edge Functions

Consider adding these edge functions for scaling:

1. **`process-scheduled-emails`**: Cron job to send scheduled follow-ups
2. **`check-email-replies`**: Webhook for incoming reply detection
3. **`enrich-contacts`**: Contact data enrichment via third-party APIs
4. **`campaign-processor`**: Batch process campaign emails with rate limiting
