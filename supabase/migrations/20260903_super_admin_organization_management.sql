-- Adds an explicit SaaS administrator flag.
-- The seeded/default manager account becomes the initial SaaS owner.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET is_super_admin = true
WHERE lower(email) = 'manager@demo.com';

CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true AND active = true
  );
$$;

DROP POLICY IF EXISTS "Super admins manage organizations" ON public.organizations;
CREATE POLICY "Super admins manage organizations" ON public.organizations
  FOR ALL USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

DROP POLICY IF EXISTS "Super admins manage organization members" ON public.organization_members;
CREATE POLICY "Super admins manage organization members" ON public.organization_members
  FOR ALL USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

DROP POLICY IF EXISTS "Managers update their organization" ON public.organizations;
CREATE POLICY "Managers update their organization" ON public.organizations
  FOR UPDATE USING (public.current_user_can_manage_organization(id))
  WITH CHECK (public.current_user_can_manage_organization(id));

NOTIFY pgrst, 'reload schema';