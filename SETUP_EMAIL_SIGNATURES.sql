-- ============================================
-- Email Signatures Table Setup
-- ============================================
-- Run this SQL script in your Supabase SQL Editor
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run

-- Create email_signatures table
CREATE TABLE IF NOT EXISTS public.email_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL, -- HTML content of the signature
  image_url TEXT, -- URL to signature image/logo (base64 or URL)
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (single-user internal tool)
DROP POLICY IF EXISTS "Allow all on email_signatures" ON public.email_signatures;
CREATE POLICY "Allow all on email_signatures" ON public.email_signatures FOR ALL USING (true) WITH CHECK (true);

-- Add signature columns to email_drafts table (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_drafts' AND column_name = 'include_signature'
  ) THEN
    ALTER TABLE public.email_drafts 
    ADD COLUMN include_signature BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_drafts' AND column_name = 'signature_id'
  ) THEN
    ALTER TABLE public.email_drafts 
    ADD COLUMN signature_id UUID REFERENCES public.email_signatures(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add signature_id to sent_emails table (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sent_emails' AND column_name = 'signature_id'
  ) THEN
    ALTER TABLE public.sent_emails 
    ADD COLUMN signature_id UUID REFERENCES public.email_signatures(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Verify the table was created
SELECT 'email_signatures table created successfully!' as status;
