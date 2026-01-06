# API Reference

> Last Updated: 2026-01-06
> Project: Email Campaign Management System

## Overview

This document provides a complete API reference for all database operations and edge function calls used in the application.

---

## Database Operations

### Contacts

#### List Contacts
```typescript
const { data, error } = await supabase
  .from('contacts')
  .select('*')
  .order('created_at', { ascending: false });
```

#### Get Contact by ID
```typescript
const { data, error } = await supabase
  .from('contacts')
  .select('*')
  .eq('id', contactId)
  .single();
```

#### Get Contact with Related Data
```typescript
const { data, error } = await supabase
  .from('contacts')
  .select(`
    *,
    upload_batch:upload_batches(file_name, created_at)
  `)
  .eq('id', contactId)
  .single();
```

#### Check for Duplicate Email
```typescript
const { data, error } = await supabase
  .from('contacts')
  .select('id, email')
  .eq('email', email.toLowerCase().trim())
  .limit(1);
```

#### Insert Contacts (Batch)
```typescript
const { data, error } = await supabase
  .from('contacts')
  .insert(contacts.map(c => ({
    upload_batch_id: batchId,
    raw_data: c.raw_data,
    name: c.name,
    email: c.email.toLowerCase().trim(),
    company: c.company
  })))
  .select();
```

#### Delete Contact
```typescript
const { error } = await supabase
  .from('contacts')
  .delete()
  .eq('id', contactId);
```

---

### Email Drafts

#### List Drafts with Contact Info
```typescript
const { data, error } = await supabase
  .from('email_drafts')
  .select(`
    *,
    contact:contacts(id, name, email, company)
  `)
  .order('created_at', { ascending: false });
```

#### Filter by Status
```typescript
const { data, error } = await supabase
  .from('email_drafts')
  .select('*, contact:contacts(*)')
  .eq('status', 'draft') // or 'approved', 'sent'
  .order('created_at', { ascending: false });
```

#### Filter by Draft Type
```typescript
const { data, error } = await supabase
  .from('email_drafts')
  .select('*, contact:contacts(*)')
  .eq('draft_type', 'first_outreach')
  .order('created_at', { ascending: false });
```

#### Get Drafts for Contact
```typescript
const { data, error } = await supabase
  .from('email_drafts')
  .select('*')
  .eq('contact_id', contactId)
  .order('draft_type');
```

#### Update Draft (Edit)
```typescript
const { error } = await supabase
  .from('email_drafts')
  .update({
    edited_subject: newSubject,
    edited_body: newBody,
    updated_at: new Date().toISOString()
  })
  .eq('id', draftId);
```

#### Approve Draft
```typescript
const { error } = await supabase
  .from('email_drafts')
  .update({
    status: 'approved',
    approved_at: new Date().toISOString()
  })
  .eq('id', draftId);
```

#### Delete Draft
```typescript
const { error } = await supabase
  .from('email_drafts')
  .delete()
  .eq('id', draftId);
```

---

### Sent Emails

#### List Sent Emails with Relations
```typescript
const { data, error } = await supabase
  .from('sent_emails')
  .select(`
    *,
    contact:contacts(id, name, email, company),
    sender_account:sender_accounts(email, display_name)
  `)
  .order('sent_at', { ascending: false });
```

#### Get Sent Emails for Contact
```typescript
const { data, error } = await supabase
  .from('sent_emails')
  .select('*')
  .eq('contact_id', contactId)
  .order('sent_at', { ascending: false });
```

#### Get Sent Emails for Campaign
```typescript
const { data, error } = await supabase
  .from('sent_emails')
  .select('*, contact:contacts(*)')
  .eq('campaign_id', campaignId)
  .order('sent_at', { ascending: false });
```

---

### Sender Accounts

#### List Active Sender Accounts
```typescript
const { data, error } = await supabase
  .from('sender_accounts')
  .select('*')
  .eq('is_active', true)
  .order('email');
```

#### Create Sender Account
```typescript
const { data, error } = await supabase
  .from('sender_accounts')
  .insert({
    email: senderEmail,
    display_name: displayName,
    is_active: true
  })
  .select()
  .single();
```

#### Update Sender Account
```typescript
const { error } = await supabase
  .from('sender_accounts')
  .update({
    display_name: newDisplayName,
    is_active: isActive
  })
  .eq('id', accountId);
```

#### Delete Sender Account
```typescript
const { error } = await supabase
  .from('sender_accounts')
  .delete()
  .eq('id', accountId);
```

---

### Email Templates

#### List Templates
```typescript
const { data, error } = await supabase
  .from('email_templates')
  .select('*')
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

#### Get Template by ID
```typescript
const { data, error } = await supabase
  .from('email_templates')
  .select('*')
  .eq('id', templateId)
  .single();
```

#### Create Template
```typescript
const { data, error } = await supabase
  .from('email_templates')
  .insert({
    name: templateName,
    template_content: content,
    is_active: true
  })
  .select()
  .single();
```

#### Update Template
```typescript
const { error } = await supabase
  .from('email_templates')
  .update({
    name: newName,
    template_content: newContent,
    updated_at: new Date().toISOString()
  })
  .eq('id', templateId);
```

#### Delete Template
```typescript
const { error } = await supabase
  .from('email_templates')
  .delete()
  .eq('id', templateId);
```

---

### Contact Lists

#### List All Contact Lists with Count
```typescript
const { data, error } = await supabase
  .from('contact_lists')
  .select(`
    *,
    members:contact_list_members(count)
  `)
  .order('created_at', { ascending: false });
```

#### Get List with Members
```typescript
const { data, error } = await supabase
  .from('contact_lists')
  .select(`
    *,
    members:contact_list_members(
      contact:contacts(*)
    )
  `)
  .eq('id', listId)
  .single();
```

#### Create Contact List
```typescript
const { data, error } = await supabase
  .from('contact_lists')
  .insert({
    name: listName,
    description: description
  })
  .select()
  .single();
```

#### Add Contacts to List
```typescript
const { error } = await supabase
  .from('contact_list_members')
  .insert(
    contactIds.map(contactId => ({
      list_id: listId,
      contact_id: contactId
    }))
  );
```

#### Remove Contact from List
```typescript
const { error } = await supabase
  .from('contact_list_members')
  .delete()
  .eq('list_id', listId)
  .eq('contact_id', contactId);
```

---

### Campaigns

#### List Campaigns with Relations
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .select(`
    *,
    list:contact_lists(id, name),
    sender_account:sender_accounts(id, email, display_name),
    settings:campaign_settings(*),
    sequences:campaign_sequences(*)
  `)
  .order('created_at', { ascending: false });
```

#### Get Campaign Detail
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .select(`
    *,
    list:contact_lists(*, members:contact_list_members(contact:contacts(*))),
    sender_account:sender_accounts(*),
    settings:campaign_settings(*),
    sequences:campaign_sequences(*),
    contacts:campaign_contacts(*, contact:contacts(*))
  `)
  .eq('id', campaignId)
  .single();
```

#### Create Campaign
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .insert({
    name: campaignName,
    description: description,
    list_id: listId,
    sender_account_id: senderId,
    status: 'draft'
  })
  .select()
  .single();
// Note: campaign_settings created automatically via trigger
```

#### Update Campaign Status
```typescript
const { error } = await supabase
  .from('campaigns')
  .update({
    status: 'active', // or 'paused', 'completed'
    updated_at: new Date().toISOString()
  })
  .eq('id', campaignId);
```

#### Add Campaign Sequence
```typescript
const { data, error } = await supabase
  .from('campaign_sequences')
  .insert({
    campaign_id: campaignId,
    sequence_order: order,
    name: stepName,
    subject_template: subjectTemplate,
    body_template: bodyTemplate,
    delay_days: delayDays,
    delay_hours: delayHours
  })
  .select()
  .single();
```

#### Update Campaign Settings
```typescript
const { error } = await supabase
  .from('campaign_settings')
  .update({
    send_window_start: '09:00:00',
    send_window_end: '18:00:00',
    send_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    timezone: 'America/New_York',
    daily_limit: 100,
    delay_between_emails_seconds: 60
  })
  .eq('campaign_id', campaignId);
```

#### Enroll Contacts in Campaign
```typescript
const { error } = await supabase
  .from('campaign_contacts')
  .insert(
    contactIds.map(contactId => ({
      campaign_id: campaignId,
      contact_id: contactId,
      status: 'pending',
      current_sequence_step: 0
    }))
  );
```

---

### Analytics

#### Get Analytics for Date Range
```typescript
const { data, error } = await supabase
  .from('email_analytics')
  .select('*')
  .gte('date', startDate)
  .lte('date', endDate)
  .order('date', { ascending: true });
```

#### Get Today's Stats
```typescript
const { data, error } = await supabase
  .from('email_analytics')
  .select('*')
  .eq('date', new Date().toISOString().split('T')[0])
  .single();
```

---

## Edge Function Calls

### Generate Drafts

```typescript
const { data, error } = await supabase.functions.invoke('generate-drafts', {
  body: {
    contacts: [
      {
        id: 'uuid',
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        raw_data: { title: 'CEO', industry: 'Tech' }
      }
    ],
    template: `
      Write a professional email requesting a meeting to discuss
      investment opportunities in our startup...
    `
  }
});

// Response
// { success: true, drafts_created: 3 }
```

### Send Email

```typescript
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    draftId: 'draft-uuid',
    senderAccountId: 'sender-uuid'
  }
});

// Response
// { success: true }
```

---

## Error Handling Pattern

```typescript
try {
  const { data, error } = await supabase
    .from('table')
    .select('*');
  
  if (error) {
    console.error('Database error:', error.message);
    toast.error(`Failed to load data: ${error.message}`);
    return;
  }
  
  // Use data
} catch (err) {
  console.error('Unexpected error:', err);
  toast.error('An unexpected error occurred');
}
```

---

## Pagination Pattern

```typescript
const PAGE_SIZE = 20;

const { data, error, count } = await supabase
  .from('contacts')
  .select('*', { count: 'exact' })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('created_at', { ascending: false });

const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
```

---

## Real-time Subscriptions

```typescript
// Subscribe to new sent emails
const channel = supabase
  .channel('sent-emails-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'sent_emails'
    },
    (payload) => {
      console.log('New email sent:', payload.new);
      // Update UI
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

---

## Type Definitions

All database types are auto-generated in `src/integrations/supabase/types.ts`.

Application-level types are defined in `src/types/database.ts`:

```typescript
// Example usage
import type { Contact, EmailDraft, Campaign } from '@/types/database';

const contact: Contact = {
  id: 'uuid',
  email: 'test@example.com',
  // ...
};
```
