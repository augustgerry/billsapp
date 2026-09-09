-- Proof analysis fields from the OCR pass (read-proof edge function):
-- whether the image reads as a transfer receipt at all, a guess at the
-- source platform, and a note if the image looks visually off.

alter table public.payments
  add column if not exists is_receipt      boolean,
  add column if not exists platform        text,
  add column if not exists suspicious_note text;
