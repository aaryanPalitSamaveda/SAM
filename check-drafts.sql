-- Quick SQL to check if drafts exist in database
-- Run this in Supabase SQL Editor

-- Check if drafts exist
SELECT COUNT(*) as total_drafts FROM email_drafts;

-- Check drafts with contact info
SELECT 
  ed.id,
  ed.contact_id,
  ed.draft_type,
  ed.status,
  ed.subject,
  c.name,
  c.email
FROM email_drafts ed
LEFT JOIN contacts c ON ed.contact_id = c.id
ORDER BY ed.created_at DESC
LIMIT 10;

-- Check if contacts exist
SELECT COUNT(*) as total_contacts FROM contacts;

-- Check recent drafts
SELECT * FROM email_drafts ORDER BY created_at DESC LIMIT 5;

