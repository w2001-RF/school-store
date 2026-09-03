-- Run this migration in Supabase SQL Editor for an existing project.
-- Tracks per-line returned quantity so items can be restocked without altering the
-- original invoice financials (total_amount/paid_amount/status are left untouched).

ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS returned_quantity INTEGER NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
