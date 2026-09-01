-- ============================================
-- SCHOOL STORE - Schéma Supabase
-- ============================================

-- Profils utilisateurs (lié à auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('manager', 'agent')) DEFAULT 'agent',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catégories de produits
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100);
INSERT INTO clients (name, discount_percent)
SELECT 'Passager', 0
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE LOWER(name) = 'passager');

-- Produits
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  barcode TEXT UNIQUE,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Factures
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  agent_id UUID REFERENCES profiles(id),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  customer_name TEXT,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL CHECK (status IN ('pending','paid','cancelled')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';

CREATE TABLE IF NOT EXISTS client_product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  UNIQUE(client_id, product_id)
);

-- Lignes de facture
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_barcode TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_invoices_agent ON invoices(agent_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Trigger: auto-création du profil après inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: mise à jour de updated_at sur products
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Helper: récupérer le rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE;

-- Profils
CREATE POLICY "Users can read all profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers can manage profiles" ON profiles
  FOR ALL USING (public.current_user_role() = 'manager');

-- Catégories
CREATE POLICY "Authenticated can read categories" ON categories
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers manage categories" ON categories
  FOR ALL USING (public.current_user_role() = 'manager');

-- Clients
CREATE POLICY "Authenticated can read clients" ON clients
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers manage clients" ON clients
  FOR ALL USING (public.current_user_role() = 'manager');
CREATE POLICY "Authenticated can read client prices" ON client_product_prices
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers manage client prices" ON client_product_prices
  FOR ALL USING (public.current_user_role() = 'manager');

-- Produits
CREATE POLICY "Authenticated can read products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers manage products" ON products
  FOR ALL USING (public.current_user_role() = 'manager');

-- Factures
CREATE POLICY "Agents see own invoices, managers all" ON invoices
  FOR SELECT USING (
    public.current_user_role() = 'manager' OR
    agent_id = auth.uid()
  );
CREATE POLICY "Agents create invoices" ON invoices
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    agent_id = auth.uid()
  );
CREATE POLICY "Agents update own invoices" ON invoices
  FOR UPDATE USING (
    agent_id = auth.uid()
  );
CREATE POLICY "Managers can update any invoice" ON invoices
  FOR UPDATE USING (public.current_user_role() = 'manager');
CREATE POLICY "Managers can delete invoices" ON invoices
  FOR DELETE USING (public.current_user_role() = 'manager');

CREATE INDEX IF NOT EXISTS invoices_client_id_idx ON invoices(client_id);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices(created_at);

-- Lignes de facture
CREATE POLICY "Access invoice items via parent" ON invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (
        public.current_user_role() = 'manager' OR
        invoices.agent_id = auth.uid()
      )
    )
  );

ALTER TABLE invoices ADD CONSTRAINT chk_paid_amount CHECK (paid_amount >= 0);

-- Audit trail : historique des mouvements de stock
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  quantity_delta INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'sale',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_adjustments_product_id_idx ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS stock_adjustments_created_at_idx ON stock_adjustments(created_at);

ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read stock adjustments" ON stock_adjustments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can create stock adjustments" ON stock_adjustments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Managers manage stock adjustments" ON stock_adjustments
  FOR ALL USING (public.current_user_role() = 'manager');

-- Audit trail : historique des paiements par facture
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  method TEXT NOT NULL DEFAULT 'cash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments(created_at);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access payments via parent invoice" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND (
        public.current_user_role() = 'manager' OR
        invoices.agent_id = auth.uid()
      )
    )
  );
CREATE POLICY "Agents create payments on own invoices" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.agent_id = auth.uid()
    )
  );
CREATE POLICY "Managers manage payments" ON payments
  FOR ALL USING (public.current_user_role() = 'manager');
