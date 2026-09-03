-- ============================================
-- SCHOOL STORE - Schéma Supabase
-- ============================================

-- Organisations (multi-tenant : chaque business est isolé par organization_id)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  legal_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  tax_number TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL CHECK (status IN ('active','suspended','pending','cancelled')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UUID fixe de l'organisation par défaut (absorbe les données mono-tenant existantes)
INSERT INTO organizations (id, name, slug, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', 'active')
ON CONFLICT (id) DO NOTHING;

-- Profils utilisateurs (lié à auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('manager', 'agent')) DEFAULT 'agent',
  active BOOLEAN DEFAULT true,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rattachement utilisateur <-> organisation (rôles SaaS granulaires)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','cashier','stock_manager','accountant','viewer')) DEFAULT 'cashier',
  status TEXT NOT NULL CHECK (status IN ('active','invited','suspended')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Catégories de produits
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
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
  organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
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
  low_stock_threshold INTEGER,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
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
  organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE TABLE IF NOT EXISTS client_product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
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
  total_price DECIMAL(10,2) NOT NULL,
  returned_quantity INTEGER NOT NULL DEFAULT 0,
  organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001'
);

-- Index
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_invoices_agent ON invoices(agent_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Trigger: auto-création du profil après inscription (+ adhésion à l'organisation par défaut)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  new_role TEXT;
BEGIN
  new_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');

  INSERT INTO public.profiles (id, email, full_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    new_role,
    default_org_id
  );

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (default_org_id, NEW.id, CASE WHEN new_role = 'manager' THEN 'manager' ELSE 'cashier' END)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

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
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Helper: récupérer le rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE;

-- Helper (Phase 1 SaaS, pas encore utilisé par les policies existantes) :
-- organisation de l'utilisateur courant, pour le futur resserrement des RLS.
CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_organization(target_organization_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = target_organization_id
      AND role IN ('owner', 'manager')
      AND status = 'active'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_is_owner(target_organization_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = target_organization_id
      AND role = 'owner'
      AND status = 'active'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true AND active = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_organization(
  organization_name TEXT,
  organization_slug TEXT DEFAULT NULL
)
RETURNS organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  created_organization organizations;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = actor_id AND role = 'manager' AND active = true
  ) THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  IF organization_name IS NULL OR btrim(organization_name) = '' THEN
    RAISE EXCEPTION 'INVALID_ORGANIZATION_NAME';
  END IF;
  INSERT INTO organizations (name, slug)
  VALUES (btrim(organization_name), NULLIF(lower(regexp_replace(COALESCE(organization_slug, organization_name), '[^a-zA-Z0-9]+', '-', 'g')), ''))
  RETURNING * INTO created_organization;
  INSERT INTO organization_members (organization_id, user_id, role, status)
  VALUES (created_organization.id, actor_id, 'owner', 'active');
  RETURN created_organization;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'ORGANIZATION_SLUG_ALREADY_EXISTS';
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(TEXT, TEXT) TO authenticated;

-- Organisations : un membre ne voit que son organisation
CREATE POLICY "Members can read their organization" ON organizations
  FOR SELECT USING (id = public.current_user_organization_id() OR public.current_user_is_super_admin());

CREATE POLICY "Super admins manage organizations" ON organizations
  FOR ALL USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

-- Rattachements : un membre voit sa propre ligne ; owner/manager voient toute l'organisation
CREATE POLICY "Members can read their membership rows" ON organization_members
  FOR SELECT USING (
    organization_id = public.current_user_organization_id()
    OR public.current_user_is_super_admin()
  );

CREATE POLICY "Owners and managers can update members in their org" ON organization_members
  FOR UPDATE USING (
    public.current_user_can_manage_organization(organization_id)
  )
  WITH CHECK (
    role <> 'owner'
    OR public.current_user_is_owner(organization_id)
  );

CREATE POLICY "Super admins manage organization members" ON organization_members
  FOR ALL USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

CREATE POLICY "Managers update their organization" ON organizations
  FOR UPDATE USING (public.current_user_can_manage_organization(id))
  WITH CHECK (public.current_user_can_manage_organization(id));

CREATE OR REPLACE FUNCTION public.update_my_profile(profile_full_name TEXT)
RETURNS profiles AS $$
DECLARE updated_profile profiles;
BEGIN
  IF auth.uid() IS NULL OR profile_full_name IS NULL OR btrim(profile_full_name) = '' THEN
    RAISE EXCEPTION 'INVALID_PROFILE_NAME';
  END IF;
  UPDATE profiles SET full_name = btrim(profile_full_name)
  WHERE id = auth.uid() RETURNING * INTO updated_profile;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
  RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE UPDATE ON profiles FROM authenticated;
REVOKE ALL ON FUNCTION public.update_my_profile(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT) TO authenticated;

-- Rattachements : owner/manager peuvent modifier le rôle/statut des membres de leur organisation
-- (garde-fou : seul un 'owner' existant peut promouvoir un membre au rôle 'owner')
CREATE POLICY "Owners and managers can update members in their org" ON organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members actor
      WHERE actor.user_id = auth.uid()
        AND actor.organization_id = organization_members.organization_id
        AND actor.role IN ('owner', 'manager')
        AND actor.status = 'active'
    )
  )
  WITH CHECK (
    role <> 'owner'
    OR EXISTS (
      SELECT 1 FROM organization_members actor
      WHERE actor.user_id = auth.uid()
        AND actor.organization_id = organization_members.organization_id
        AND actor.role = 'owner'
        AND actor.status = 'active'
    )
  );

-- Profils
CREATE POLICY "Users can read all profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
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
  organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
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
  organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
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
