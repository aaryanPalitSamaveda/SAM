-- Create email_signatures table
CREATE TABLE IF NOT EXISTS public.email_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL, -- HTML content of the signature
  image_url TEXT, -- URL to signature image/logo
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow all on email_signatures" ON public.email_signatures FOR ALL USING (true) WITH CHECK (true);

-- Add signature_id to email_drafts table
ALTER TABLE public.email_drafts 
ADD COLUMN IF NOT EXISTS include_signature BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS signature_id UUID REFERENCES public.email_signatures(id) ON DELETE SET NULL;

-- Add signature_id to sent_emails table for tracking
ALTER TABLE public.sent_emails 
ADD COLUMN IF NOT EXISTS signature_id UUID REFERENCES public.email_signatures(id) ON DELETE SET NULL;
