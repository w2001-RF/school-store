-- POS payment contract update.
-- Allows partial or overpayments for normal clients; full payment remains enforced for the Passager client.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS chk_paid_amount;

ALTER TABLE public.invoices
  ADD CONSTRAINT chk_paid_amount CHECK (paid_amount >= 0);

ALTER TABLE public.invoices
  ADD CONSTRAINT chk_discount_amount CHECK (discount_amount >= 0);

CREATE INDEX IF NOT EXISTS invoices_payment_method_idx ON public.invoices(payment_method);

NOTIFY pgrst, 'reload schema';