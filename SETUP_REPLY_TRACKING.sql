-- ============================================
-- Reply Tracking Setup (Graph Subscriptions)
-- ============================================
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.graph_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_account_id UUID REFERENCES public.sender_accounts(id) ON DELETE CASCADE NOT NULL,
  subscription_id TEXT NOT NULL,
  resource TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.graph_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on graph_subscriptions" ON public.graph_subscriptions;
CREATE POLICY "Allow all on graph_subscriptions" ON public.graph_subscriptions FOR ALL USING (true) WITH CHECK (true);
