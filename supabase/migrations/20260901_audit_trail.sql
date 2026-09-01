-- Run this migration in Supabase SQL Editor for an existing project.
-- Adds audit trail tables: stock_adjustments (stock changes log) and payments (per-payment records).

CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  quantity_delta INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'sale',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_adjustments_product_id_idx ON public.stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS stock_adjustments_created_at_idx ON public.stock_adjustments(created_at);

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read stock adjustments" ON public.stock_adjustments;
CREATE POLICY "Authenticated can read stock adjustments" ON public.stock_adjustments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can create stock adjustments" ON public.stock_adjustments;
CREATE POLICY "Authenticated can create stock adjustments" ON public.stock_adjustments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Managers manage stock adjustments" ON public.stock_adjustments;
CREATE POLICY "Managers manage stock adjustments" ON public.stock_adjustments
  FOR ALL USING (public.current_user_role() = 'manager');

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  method TEXT NOT NULL DEFAULT 'cash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON public.payments(created_at);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Access payments via parent invoice" ON public.payments;
CREATE POLICY "Access payments via parent invoice" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = payments.invoice_id
      AND (
        public.current_user_role() = 'manager' OR
        invoices.agent_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Agents create payments on own invoices" ON public.payments;
CREATE POLICY "Agents create payments on own invoices" ON public.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.agent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers manage payments" ON public.payments;
CREATE POLICY "Managers manage payments" ON public.payments
  FOR ALL USING (public.current_user_role() = 'manager');

NOTIFY pgrst, 'reload schema';
