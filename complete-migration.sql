-- ============================================
-- Complete Database Migration for New Supabase Project
-- Project: tmzljbqiigltcspwsehj
-- ============================================
-- This file contains all migrations combined.
-- Run this in the Supabase SQL Editor for your new project.
-- ============================================

-- ============================================
-- MIGRATION 1: Initial Schema
-- ============================================

-- Create enum for email status
CREATE TYPE email_status AS ENUM ('draft', 'approved', 'sent', 'failed', 'scheduled');

-- Create enum for draft type
CREATE TYPE draft_type AS ENUM ('first_outreach', 'second_followup', 'final_followup');

-- Create sender accounts table
CREATE TABLE public.sender_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contacts table (from CSV uploads)
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_batch_id UUID NOT NULL,
  raw_data JSONB NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  company TEXT,
  enriched_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create upload batches table
CREATE TABLE public.upload_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  column_mapping JSONB,
  total_contacts INTEGER DEFAULT 0,
  processed_contacts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email drafts table
CREATE TABLE public.email_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  draft_type draft_type NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status email_status DEFAULT 'draft',
  edited_subject TEXT,
  edited_body TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sent emails table
CREATE TABLE public.sent_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID REFERENCES public.email_drafts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  sender_account_id UUID REFERENCES public.sender_accounts(id) NOT NULL,
  draft_type draft_type NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_id TEXT,
  status TEXT DEFAULT 'sent'
);

-- Create scheduled emails table
CREATE TABLE public.scheduled_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID REFERENCES public.email_drafts(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  sender_account_id UUID REFERENCES public.sender_accounts(id) NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics table
CREATE TABLE public.email_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_drafts_created INTEGER DEFAULT 0,
  total_drafts_approved INTEGER DEFAULT 0,
  total_emails_sent INTEGER DEFAULT 0,
  total_followups_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- Add foreign key for contacts to batches
ALTER TABLE public.contacts 
ADD CONSTRAINT fk_contacts_batch 
FOREIGN KEY (upload_batch_id) REFERENCES public.upload_batches(id) ON DELETE CASCADE;

-- Enable Row Level Security (public access for this single-user app)
ALTER TABLE public.sender_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (single-user internal tool)
CREATE POLICY "Allow all on sender_accounts" ON public.sender_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on email_templates" ON public.email_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on upload_batches" ON public.upload_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on email_drafts" ON public.email_drafts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sent_emails" ON public.sent_emails FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on scheduled_emails" ON public.scheduled_emails FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on email_analytics" ON public.email_analytics FOR ALL USING (true) WITH CHECK (true);

-- Insert default sender accounts
INSERT INTO public.sender_accounts (email, display_name) VALUES
  ('aaryan@samavedacapital.com', 'Aaryan'),
  ('vineeth@samavedacapital.com', 'Vineeth'),
  ('ops@samavedacapital.com', 'Operations');

-- Create function to update analytics
CREATE OR REPLACE FUNCTION public.update_email_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.email_analytics (date, total_emails_sent)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date) 
  DO UPDATE SET total_emails_sent = email_analytics.total_emails_sent + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for analytics
CREATE TRIGGER on_email_sent
  AFTER INSERT ON public.sent_emails
  FOR EACH ROW EXECUTE FUNCTION public.update_email_analytics();

-- Create function to update draft analytics
CREATE OR REPLACE FUNCTION public.update_draft_analytics()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for draft analytics
CREATE TRIGGER on_draft_created
  AFTER INSERT ON public.email_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_draft_analytics();

CREATE TRIGGER on_draft_approved
  AFTER UPDATE ON public.email_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_draft_analytics();

-- ============================================
-- MIGRATION 2: Campaigns and Contact Lists
-- ============================================

-- Create contact_lists table for organizing contacts
CREATE TABLE public.contact_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for contacts in lists
CREATE TABLE public.contact_list_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id, list_id)
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  list_id UUID REFERENCES public.contact_lists(id) ON DELETE SET NULL,
  sender_account_id UUID REFERENCES public.sender_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_sequences table for email steps in a campaign
CREATE TABLE public.campaign_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, sequence_order)
);

-- Create campaign_settings table for scheduling configuration
CREATE TABLE public.campaign_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE UNIQUE,
  send_window_start TIME NOT NULL DEFAULT '09:00:00',
  send_window_end TIME NOT NULL DEFAULT '18:00:00',
  send_days TEXT[] NOT NULL DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  timezone TEXT NOT NULL DEFAULT 'UTC',
  daily_limit INTEGER NOT NULL DEFAULT 50,
  delay_between_emails_seconds INTEGER NOT NULL DEFAULT 120,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_contacts table to track contacts enrolled in campaigns
CREATE TABLE public.campaign_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'replied', 'bounced', 'unsubscribed')),
  current_sequence_step INTEGER NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(campaign_id, contact_id)
);

-- Add campaign tracking columns to sent_emails
ALTER TABLE public.sent_emails 
ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
ADD COLUMN sequence_step INTEGER;

-- Create email_replies table for tracking replies
CREATE TABLE public.email_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_email_id UUID REFERENCES public.sent_emails(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  message_id TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subject TEXT,
  snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_replies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all for now - single user app)
CREATE POLICY "Allow all on contact_lists" ON public.contact_lists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contact_list_members" ON public.contact_list_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on campaign_sequences" ON public.campaign_sequences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on campaign_settings" ON public.campaign_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on campaign_contacts" ON public.campaign_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on email_replies" ON public.email_replies FOR ALL USING (true) WITH CHECK (true);

-- Create function to auto-create campaign settings when campaign is created
CREATE OR REPLACE FUNCTION public.create_campaign_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.campaign_settings (campaign_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-creating campaign settings
CREATE TRIGGER on_campaign_created
  AFTER INSERT ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.create_campaign_settings();

-- Create function to stop sequence on reply
CREATE OR REPLACE FUNCTION public.handle_email_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign_contacts status to 'replied' when a reply is received
  UPDATE public.campaign_contacts
  SET status = 'replied', replied_at = NEW.received_at
  WHERE contact_id = NEW.contact_id 
    AND campaign_id = NEW.campaign_id
    AND status IN ('pending', 'in_progress');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for handling replies
CREATE TRIGGER on_email_reply_received
  AFTER INSERT ON public.email_replies
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_reply();

-- ============================================
-- Migration Complete!
-- ============================================

