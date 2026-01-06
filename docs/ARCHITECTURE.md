# System Architecture Documentation

> Last Updated: 2026-01-06
> Project: Email Campaign Management System

## Overview

This document provides a comprehensive overview of the system architecture, including frontend components, backend services, data flow, and integration points.

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | - | Type safety |
| Vite | - | Build tool |
| Tailwind CSS | - | Styling |
| React Router | 6.30.1 | Routing |
| TanStack Query | 5.83.0 | Data fetching |
| Recharts | 2.15.4 | Charts |
| Shadcn/ui | - | UI components |
| Sonner | 1.7.4 | Toast notifications |

### Backend (Lovable Cloud / Supabase)
| Service | Purpose |
|---------|---------|
| PostgreSQL | Database |
| Edge Functions (Deno) | Serverless functions |
| Row Level Security | Data access control |
| Triggers | Automated workflows |

### External APIs
| Service | Purpose |
|---------|---------|
| Anthropic Claude | AI email generation |
| Microsoft Graph | Email sending (Outlook) |

---

## Application Structure

```
src/
├── App.tsx                 # Main app with routing
├── main.tsx                # Entry point
├── index.css               # Global styles & design tokens
│
├── components/
│   ├── ui/                 # Shadcn UI components
│   ├── layout/
│   │   ├── MainLayout.tsx  # App shell with sidebar
│   │   └── Sidebar.tsx     # Navigation sidebar
│   ├── dashboard/
│   │   ├── AnalyticsChart.tsx
│   │   ├── RecentActivity.tsx
│   │   └── StatsCard.tsx
│   ├── NavLink.tsx
│   └── ThemeToggle.tsx
│
├── pages/
│   ├── Index.tsx           # Landing/redirect
│   ├── Dashboard.tsx       # Analytics dashboard
│   ├── UploadContacts.tsx  # CSV upload & mapping
│   ├── Drafts.tsx          # Draft management
│   ├── Templates.tsx       # Email templates
│   ├── Campaigns.tsx       # Campaign list
│   ├── CampaignDetail.tsx  # Single campaign
│   ├── ContactLists.tsx    # Contact list management
│   ├── SenderAccounts.tsx  # Outlook account config
│   ├── SentEmails.tsx      # Sent email history
│   ├── Settings.tsx        # App settings
│   └── NotFound.tsx        # 404 page
│
├── hooks/
│   ├── use-mobile.tsx      # Responsive detection
│   └── use-toast.ts        # Toast notifications
│
├── integrations/
│   └── supabase/
│       ├── client.ts       # Supabase client (auto-generated)
│       └── types.ts        # Database types (auto-generated)
│
├── types/
│   └── database.ts         # Application type definitions
│
└── lib/
    └── utils.ts            # Utility functions

supabase/
├── config.toml             # Edge function config
└── functions/
    ├── generate-drafts/
    │   └── index.ts        # AI draft generation
    └── send-email/
        └── index.ts        # Email sending via MS Graph

docs/
├── ARCHITECTURE.md         # This file
├── DATABASE_SCHEMA.md      # Complete DB schema
├── EDGE_FUNCTIONS.md       # Edge function docs
└── MIGRATION_GUIDE.md      # Migration procedures
```

---

## Data Flow Diagrams

### Contact Import Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User       │     │  Frontend   │     │  Database   │
│  Uploads    │────▶│  Parses     │────▶│  Stores     │
│  CSV File   │     │  & Maps     │     │  Contacts   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Duplicate  │
                    │  Detection  │
                    │  (Email)    │
                    └─────────────┘
```

### Email Draft Generation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Select     │     │  Frontend   │     │  Edge Func  │
│  Contacts   │────▶│  Invokes    │────▶│  generate-  │
│  + Template │     │  Function   │     │  drafts     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
            ┌─────────────┐     ┌─────────────┐
            │  Claude AI  │     │  Database   │
            │  Generates  │────▶│  Stores     │
            │  3 Drafts   │     │  Drafts     │
            └─────────────┘     └─────────────┘
```

### Email Sending Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Approve    │     │  Frontend   │     │  Edge Func  │
│  Draft      │────▶│  Invokes    │────▶│  send-email │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
            ┌─────────────┐     ┌─────────────┐
            │  Microsoft  │     │  Database   │
            │  Graph API  │────▶│  Records    │
            │  Sends      │     │  Sent Email │
            └─────────────┘     └──────┬──────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │  Schedule   │
                                │  Follow-ups │
                                └─────────────┘
```

### Campaign Workflow

```
┌─────────────────────────────────────────────────────────┐
│                      CAMPAIGN FLOW                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. CREATE CAMPAIGN                                      │
│     └── Auto-creates campaign_settings                  │
│                                                          │
│  2. CONFIGURE                                            │
│     ├── Select contact list                             │
│     ├── Select sender account                           │
│     ├── Define sequences (templates + delays)           │
│     └── Set send window & limits                        │
│                                                          │
│  3. ACTIVATE                                             │
│     └── Enrolls contacts from list                      │
│                                                          │
│  4. PROCESSING (per contact)                            │
│     ├── Generate personalized email                     │
│     ├── Send within window                              │
│     ├── Wait delay_days + delay_hours                   │
│     └── Next sequence step                              │
│                                                          │
│  5. COMPLETION                                           │
│     ├── All sequences sent → status: completed         │
│     ├── Reply received → status: replied               │
│     └── Bounce/unsub → status: bounced/unsubscribed    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## API Integration Details

### Supabase Client Usage

```typescript
import { supabase } from "@/integrations/supabase/client";

// Query data
const { data, error } = await supabase
  .from('contacts')
  .select('*')
  .eq('email', 'example@test.com');

// Insert data
const { data, error } = await supabase
  .from('email_drafts')
  .insert([{ contact_id, subject, body, draft_type: 'first_outreach' }]);

// Call edge function
const { data, error } = await supabase.functions.invoke('generate-drafts', {
  body: { contacts, template }
});
```

### Microsoft Graph API Flow

```
1. Get Access Token
   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
   
2. Send Email
   POST https://graph.microsoft.com/v1.0/users/{email}/sendMail
```

### Anthropic Claude API

```
POST https://api.anthropic.com/v1/messages
Headers:
  - x-api-key: ANTHROPIC_API_KEY
  - anthropic-version: 2023-06-01
Body:
  - model: claude-sonnet-4-20250514
  - max_tokens: 2000
  - messages: [{ role: 'user', content: prompt }]
```

---

## Security Considerations

### Current State
- RLS enabled on all tables with permissive policies
- JWT verification disabled on edge functions
- Service role key used in edge functions

### Production Recommendations

1. **Implement User Authentication**
   - Add auth flow with Supabase Auth
   - Create user-scoped RLS policies
   - Enable JWT verification on edge functions

2. **RLS Policy Example**
   ```sql
   CREATE POLICY "Users can only see their own contacts"
   ON contacts FOR SELECT
   USING (auth.uid() = user_id);
   ```

3. **Rate Limiting**
   - Add rate limits to edge functions
   - Implement queuing for bulk operations

4. **Secrets Management**
   - Rotate API keys periodically
   - Use separate keys for dev/prod

---

## Performance Considerations

### Database
- Add indexes for frequently queried columns
- Consider partitioning for high-volume tables
- Use connection pooling

### Frontend
- TanStack Query handles caching
- Paginate large lists
- Lazy load components

### Edge Functions
- 1-second delay between AI calls (rate limiting)
- Batch database operations where possible

---

## Monitoring & Logging

### Edge Function Logs
- Console.log statements in edge functions
- Viewable in Lovable Cloud interface

### Database Logs
- Connection logs available
- Query performance metrics

### Recommended Additions
- Error tracking (Sentry)
- Performance monitoring
- Email delivery webhooks

---

## Development Workflow

```
1. Make changes to frontend code
   └── Auto-deploys on save

2. Make database changes
   └── Use migration tool → User approves → Applied

3. Make edge function changes
   └── Auto-deploys with preview build

4. Test in preview
   └── Verify functionality

5. Publish to production
   └── Use Publish action
```

---

## Related Documentation

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Complete database schema
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) - Edge function reference
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration procedures
