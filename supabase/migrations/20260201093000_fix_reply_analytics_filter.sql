-- Ensure analytics only count replies linked to sent_emails
CREATE OR REPLACE FUNCTION public.update_reply_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sent_email_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.email_analytics (date, total_replies_received)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date)
  DO UPDATE SET total_replies_received = email_analytics.total_replies_received + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Backfill reply counts from actual linked replies
INSERT INTO public.email_analytics (date, total_replies_received, total_emails_opened)
SELECT DATE(COALESCE(received_at, created_at)) AS date, COUNT(*) AS replies, 0
FROM public.email_replies
WHERE sent_email_id IS NOT NULL
GROUP BY DATE(COALESCE(received_at, created_at))
ON CONFLICT (date) DO NOTHING;

UPDATE public.email_analytics ea
SET total_replies_received = COALESCE(src.cnt, 0)
FROM (
  SELECT DATE(COALESCE(received_at, created_at)) AS date, COUNT(*) AS cnt
  FROM public.email_replies
  WHERE sent_email_id IS NOT NULL
  GROUP BY DATE(COALESCE(received_at, created_at))
) src
WHERE ea.date = src.date;

UPDATE public.email_analytics ea
SET total_replies_received = 0
WHERE ea.date NOT IN (
  SELECT DATE(received_at)
  FROM public.email_replies
  WHERE sent_email_id IS NOT NULL
);

-- Backfill opens from actual opens table
INSERT INTO public.email_analytics (date, total_emails_opened, total_replies_received)
SELECT DATE(opened_at) AS date, COUNT(*) AS opens, 0
FROM public.email_opens
GROUP BY DATE(opened_at)
ON CONFLICT (date) DO NOTHING;

UPDATE public.email_analytics ea
SET total_emails_opened = COALESCE(src.cnt, 0)
FROM (
  SELECT DATE(opened_at) AS date, COUNT(*) AS cnt
  FROM public.email_opens
  GROUP BY DATE(opened_at)
) src
WHERE ea.date = src.date;

UPDATE public.email_analytics ea
SET total_emails_opened = 0
WHERE ea.date NOT IN (
  SELECT DATE(opened_at)
  FROM public.email_opens
);
