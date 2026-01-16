-- ============================================
-- Email Analytics Tracking Setup
-- ============================================
-- Run this SQL script in Supabase SQL Editor

-- Create email_opens table
CREATE TABLE IF NOT EXISTS public.email_opens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_email_id UUID REFERENCES public.sent_emails(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT
);

-- Enable RLS
ALTER TABLE public.email_opens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on email_opens" ON public.email_opens;
CREATE POLICY "Allow all on email_opens" ON public.email_opens FOR ALL USING (true) WITH CHECK (true);

-- Add analytics columns (safe to re-run)
ALTER TABLE public.email_analytics
ADD COLUMN IF NOT EXISTS total_emails_opened INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_replies_received INTEGER DEFAULT 0;

-- Update analytics on open
CREATE OR REPLACE FUNCTION public.update_open_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.email_analytics (date, total_emails_opened)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date) 
  DO UPDATE SET total_emails_opened = email_analytics.total_emails_opened + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS on_email_opened ON public.email_opens;
CREATE TRIGGER on_email_opened
  AFTER INSERT ON public.email_opens
  FOR EACH ROW EXECUTE FUNCTION public.update_open_analytics();

-- Update analytics on reply
CREATE OR REPLACE FUNCTION public.update_reply_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.email_analytics (date, total_replies_received)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date) 
  DO UPDATE SET total_replies_received = email_analytics.total_replies_received + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS on_email_reply_analytics ON public.email_replies;
CREATE TRIGGER on_email_reply_analytics
  AFTER INSERT ON public.email_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_reply_analytics();
