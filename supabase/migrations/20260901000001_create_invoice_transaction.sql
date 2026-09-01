-- Atomically creates an invoice, payment, and stock movements for a POS sale.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS chk_payment_method;

ALTER TABLE public.invoices
  ADD CONSTRAINT chk_payment_method CHECK (payment_method IN ('cash', 'card', 'transfer', 'other'));

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'return', 'adjustment', 'damage', 'loss', 'correction')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_product_id_idx ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS stock_movements_created_at_idx ON public.stock_movements(created_at);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read stock movements" ON public.stock_movements;
CREATE POLICY "Authenticated can read stock movements" ON public.stock_movements
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Managers manage stock movements" ON public.stock_movements;
CREATE POLICY "Managers manage stock movements" ON public.stock_movements
  FOR ALL USING (public.current_user_role() = 'manager');

CREATE OR REPLACE FUNCTION public.create_invoice_transaction(
  p_invoice_number TEXT,
  p_client_id UUID,
  p_customer_name TEXT,
  p_lines JSONB,
  p_discount_amount NUMERIC,
  p_payment_amount NUMERIC,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id UUID := auth.uid();
  v_client clients%ROWTYPE;
  v_line RECORD;
  v_product products%ROWTYPE;
  v_client_price NUMERIC(10,2);
  v_unit_price NUMERIC(10,2);
  v_line_total NUMERIC(10,2);
  v_subtotal NUMERIC(10,2) := 0;
  v_total NUMERIC(10,2);
  v_remaining NUMERIC(10,2);
  v_status TEXT;
  v_invoice invoices%ROWTYPE;
BEGIN
  IF v_agent_id IS NULL OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_agent_id) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  IF p_invoice_number IS NULL OR btrim(p_invoice_number) = '' THEN
    RAISE EXCEPTION 'INVALID_INVOICE_NUMBER';
  END IF;

  IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'INVOICE_EMPTY';
  END IF;

  IF p_payment_method NOT IN ('cash', 'card', 'transfer', 'other') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;

  IF p_payment_amount IS NULL OR p_payment_amount < 0 THEN
    RAISE EXCEPTION 'INVALID_PAYMENT';
  END IF;

  SELECT * INTO v_client
  FROM clients
  WHERE id = COALESCE(p_client_id, (SELECT id FROM clients WHERE lower(name) = 'passager' LIMIT 1));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_CLIENT';
  END IF;

  FOR v_line IN
    SELECT (line->>'product_id')::UUID AS product_id, SUM((line->>'quantity')::INTEGER) AS quantity
    FROM jsonb_array_elements(p_lines) AS line
    GROUP BY (line->>'product_id')::UUID
  LOOP
    IF v_line.quantity IS NULL OR v_line.quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;

    SELECT * INTO v_product FROM products WHERE id = v_line.product_id FOR UPDATE;
    IF NOT FOUND OR NOT v_product.active THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;
    IF v_product.stock < v_line.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: %', v_product.name;
    END IF;

    SELECT price INTO v_client_price
    FROM client_product_prices
    WHERE client_id = v_client.id AND product_id = v_product.id;

    v_unit_price := COALESCE(
      v_client_price,
      round(v_product.price * (1 - COALESCE(v_client.discount_percent, 0) / 100), 2)
    );
    v_subtotal := v_subtotal + v_unit_price * v_line.quantity;
  END LOOP;

  IF p_discount_amount IS NULL OR p_discount_amount < 0 OR p_discount_amount > v_subtotal THEN
    RAISE EXCEPTION 'INVALID_DISCOUNT';
  END IF;

  v_total := v_subtotal - p_discount_amount;
  IF lower(v_client.name) = 'passager' AND p_payment_amount < v_total THEN
    RAISE EXCEPTION 'FULL_PAYMENT_REQUIRED';
  END IF;

  v_remaining := greatest(0, v_total - p_payment_amount);
  v_status := CASE WHEN p_payment_amount >= v_total THEN 'paid' ELSE 'pending' END;

  INSERT INTO invoices (
    invoice_number, agent_id, client_id, customer_name, subtotal_amount,
    discount_amount, total_amount, paid_amount, remaining_amount, payment_method, status
  ) VALUES (
    p_invoice_number, v_agent_id, v_client.id, COALESCE(NULLIF(btrim(p_customer_name), ''), v_client.name), v_subtotal,
    p_discount_amount, v_total, p_payment_amount, v_remaining, p_payment_method, v_status
  ) RETURNING * INTO v_invoice;

  FOR v_line IN
    SELECT (line->>'product_id')::UUID AS product_id, SUM((line->>'quantity')::INTEGER) AS quantity
    FROM jsonb_array_elements(p_lines) AS line
    GROUP BY (line->>'product_id')::UUID
  LOOP
    SELECT * INTO v_product FROM products WHERE id = v_line.product_id FOR UPDATE;
    SELECT price INTO v_client_price FROM client_product_prices WHERE client_id = v_client.id AND product_id = v_product.id;
    v_unit_price := COALESCE(v_client_price, round(v_product.price * (1 - COALESCE(v_client.discount_percent, 0) / 100), 2));
    v_line_total := v_unit_price * v_line.quantity;

    INSERT INTO invoice_items (invoice_id, product_id, product_name, product_barcode, quantity, unit_price, total_price)
    VALUES (v_invoice.id, v_product.id, v_product.name, v_product.barcode, v_line.quantity, v_unit_price, v_line_total);

    UPDATE products SET stock = stock - v_line.quantity WHERE id = v_product.id;
    INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference_type, reference_id, reason, created_by)
    VALUES (v_product.id, 'sale', -v_line.quantity, v_product.stock, v_product.stock - v_line.quantity, 'invoice', v_invoice.id, 'POS sale', v_agent_id);
  END LOOP;

  IF p_payment_amount > 0 THEN
    INSERT INTO payments (invoice_id, recorded_by, amount, method, payment_reference, paid_at)
    VALUES (v_invoice.id, v_agent_id, p_payment_amount, p_payment_method, NULLIF(btrim(p_payment_reference), ''), now());
  END IF;

  RETURN jsonb_build_object(
    'id', v_invoice.id,
    'invoice_number', v_invoice.invoice_number,
    'subtotal_amount', v_invoice.subtotal_amount,
    'discount_amount', v_invoice.discount_amount,
    'total_amount', v_invoice.total_amount,
    'paid_amount', v_invoice.paid_amount,
    'remaining_amount', v_invoice.remaining_amount,
    'status', v_invoice.status
  );
END;
$$;

NOTIFY pgrst, 'reload schema';