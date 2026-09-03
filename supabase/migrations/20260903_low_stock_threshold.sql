-- Run this migration in Supabase SQL Editor for an existing project.
-- Adds a per-product override for the low-stock alert threshold (falls back to app config when NULL).

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER;

NOTIFY pgrst, 'reload schema';
