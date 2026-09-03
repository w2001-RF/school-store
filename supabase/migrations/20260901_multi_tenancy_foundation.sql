-- ============================================
-- PHASE 1 — MULTI-TENANCY FOUNDATION
-- Non-breaking migration: adds org scaffolding without touching
-- existing RLS policies or requiring frontend changes.
-- A fixed "default organization" absorbs all existing/new rows via
-- a column DEFAULT, so current single-tenant behaviour keeps working.
-- Run this migration in Supabase SQL Editor for an existing project.
-- ============================================

-- Fixed UUID for the default organization created by this migration.
-- Referenced below wherever a default is required.
DO $$
DECLARE
  default_org_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- ---------- organizations ----------
  CREATE TABLE IF NOT EXISTS public.organizations (
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

  INSERT INTO public.organizations (id, name, slug, status)
  VALUES (default_org_id, 'Default Organization', 'default', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- ---------- organization_members ----------
  CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner','manager','cashier','stock_manager','accountant','viewer')) DEFAULT 'cashier',
    status TEXT NOT NULL CHECK (status IN ('active','invited','suspended')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id)
  );

  -- Backfill: every existing profile becomes a member of the default org.
  -- manager -> manager, agent -> cashier (closest equivalent capability).
  INSERT INTO public.organization_members (organization_id, user_id, role)
  SELECT default_org_id, p.id, CASE WHEN p.role = 'manager' THEN 'manager' ELSE 'cashier' END
  FROM public.profiles p
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- ---------- organization_id columns (nullable, defaulted) ----------
  -- Using a column DEFAULT means existing INSERT statements that don't
  -- pass organization_id automatically fall into the default org.
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
  ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
  ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
  ALTER TABLE public.client_product_prices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
  ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
  ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
  ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

  ALTER TABLE public.profiles ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
  ALTER TABLE public.categories ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
  ALTER TABLE public.clients ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
  ALTER TABLE public.client_product_prices ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
  ALTER TABLE public.products ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
  ALTER TABLE public.invoices ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
  ALTER TABLE public.invoice_items ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
  ALTER TABLE public.stock_adjustments ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
  ALTER TABLE public.payments ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

  -- Backfill any pre-existing rows (created before this migration).
  UPDATE public.profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.categories SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.clients SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.client_product_prices SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.products SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.invoices SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.invoice_items SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.stock_adjustments SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.payments SET organization_id = default_org_id WHERE organization_id IS NULL;
END $$;

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_categories_organization_id ON public.categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_product_prices_organization_id ON public.client_product_prices(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_organization_id ON public.invoice_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_organization_id ON public.stock_adjustments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON public.payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);

-- ---------- helper for future RLS tightening (not yet used by existing policies) ----------
CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- ---------- signup trigger: also enrol new users in the default org ----------
-- Preserves the original profile-creation behaviour; only adds membership.
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

-- ---------- RLS on the two new tables only (existing policies untouched) ----------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read their organization" ON public.organizations;
CREATE POLICY "Members can read their organization" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can read their membership rows" ON public.organization_members;
CREATE POLICY "Members can read their membership rows" ON public.organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner','manager')
    )
  );

NOTIFY pgrst, 'reload schema';
