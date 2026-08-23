-- Run this migration in Supabase SQL Editor for an existing project.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.client_product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  UNIQUE(client_id, product_id)
);

ALTER TABLE public.client_product_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read client prices" ON public.client_product_prices;
CREATE POLICY "Authenticated can read client prices" ON public.client_product_prices
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Managers manage client prices" ON public.client_product_prices;
CREATE POLICY "Managers manage client prices" ON public.client_product_prices
  FOR ALL USING (public.current_user_role() = 'manager');

INSERT INTO public.clients (name, discount_percent)
SELECT 'Passager', 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.clients WHERE LOWER(name) = 'passager'
);

NOTIFY pgrst, 'reload schema';
