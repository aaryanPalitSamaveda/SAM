-- Dedupe email replies by message_id and enforce uniqueness
WITH ranked AS (
  SELECT
    id,
    message_id,
    ROW_NUMBER() OVER (
      PARTITION BY message_id
      ORDER BY received_at DESC, created_at DESC
    ) AS rn
  FROM public.email_replies
  WHERE message_id IS NOT NULL
)
DELETE FROM public.email_replies
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS email_replies_message_id_key
  ON public.email_replies (message_id)
  WHERE message_id IS NOT NULL;
