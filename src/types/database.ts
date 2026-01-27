export type EmailStatus = 'draft' | 'approved' | 'sent' | 'failed' | 'scheduled';
export type DraftType = 'first_outreach' | 'second_followup' | 'final_followup';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type CampaignContactStatus = 'pending' | 'in_progress' | 'completed' | 'replied' | 'bounced' | 'unsubscribed';

export interface SenderAccount {
  id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  template_content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  upload_batch_id: string;
  raw_data: Record<string, any>;
  name: string | null;
  email: string;
  company: string | null;
  enriched_data: Record<string, any> | null;
  created_at: string;
}

export interface UploadBatch {
  id: string;
  file_name: string;
  column_mapping: Record<string, string> | null;
  total_contacts: number;
  processed_contacts: number;
  status: string;
  created_at: string;
}

export interface EmailDraft {
  id: string;
  contact_id: string;
  draft_type: DraftType;
  subject: string;
  body: string;
  status: EmailStatus;
  edited_subject: string | null;
  edited_body: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  contact?: Contact;
}

export interface SentEmail {
  id: string;
  draft_id: string | null;
  contact_id: string;
  sender_account_id: string;
  draft_type: DraftType;
  subject: string;
  body: string;
  recipient_email: string;
  sent_at: string;
  message_id: string | null;
  status: string;
  signature_id?: string | null;
  campaign_id?: string | null;
  sequence_step?: number | null;
  contact?: Contact;
  sender_account?: SenderAccount;
}

export interface EmailOpen {
  id: string;
  sent_email_id: string;
  contact_id: string;
  opened_at: string;
  user_agent: string | null;
  ip_address: string | null;
}

export interface EmailReply {
  id: string;
  sent_email_id: string | null;
  contact_id: string;
  received_at: string;
  subject: string | null;
  snippet: string | null;
  created_at: string;
  contact?: Contact;
}

export interface ScheduledEmail {
  id: string;
  draft_id: string;
  contact_id: string;
  sender_account_id: string;
  scheduled_for: string;
  status: string;
  created_at: string;
  draft?: EmailDraft;
  contact?: Contact;
}

export interface EmailAnalytics {
  id: string;
  date: string;
  total_drafts_created: number;
  total_drafts_approved: number;
  total_emails_sent: number;
  total_followups_sent: number;
  total_emails_opened?: number;
  total_replies_received?: number;
  created_at: string;
}

// New types for Lists and Campaigns

export interface ContactList {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  contact_count?: number;
}

export interface ContactListMember {
  id: string;
  contact_id: string;
  list_id: string;
  added_at: string;
  contact?: Contact;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  list_id: string | null;
  sender_account_id: string | null;
  created_at: string;
  updated_at: string;
  list?: ContactList;
  sender_account?: SenderAccount;
  settings?: CampaignSettings;
  sequences?: CampaignSequence[];
}

export interface CampaignSequence {
  id: string;
  campaign_id: string;
  sequence_order: number;
  name: string;
  subject_template: string;
  body_template: string;
  delay_days: number;
  delay_hours: number;
  created_at: string;
}

export interface CampaignSettings {
  id: string;
  campaign_id: string;
  send_window_start: string;
  send_window_end: string;
  send_days: string[];
  timezone: string;
  daily_limit: number;
  delay_between_emails_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignContact {
  id: string;
  campaign_id: string;
  contact_id: string;
  status: CampaignContactStatus;
  current_sequence_step: number;
  enrolled_at: string;
  completed_at: string | null;
  replied_at: string | null;
  last_email_sent_at: string | null;
  contact?: Contact;
  campaign?: Campaign;
}

export interface EmailReply {
  id: string;
  sent_email_id: string | null;
  campaign_id: string | null;
  contact_id: string;
  message_id: string | null;
  received_at: string;
  subject: string | null;
  snippet: string | null;
  created_at: string;
  contact?: Contact;
  campaign?: Campaign;
}
