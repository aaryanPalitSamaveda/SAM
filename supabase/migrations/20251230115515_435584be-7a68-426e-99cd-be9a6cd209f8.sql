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