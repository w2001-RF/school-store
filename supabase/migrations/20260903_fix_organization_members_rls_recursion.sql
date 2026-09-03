-- Fixes recursive RLS policies on organization_members.
-- Helper functions read membership as the database owner, avoiding policy recursion.

CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_organization(target_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = target_organization_id
      AND role IN ('owner', 'manager')
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_owner(target_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = target_organization_id
      AND role = 'owner'
      AND status = 'active'
  );
$$;

DROP POLICY IF EXISTS "Members can read their organization" ON public.organizations;
CREATE POLICY "Members can read their organization" ON public.organizations
  FOR SELECT USING (id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Members can read their membership rows" ON public.organization_members;
CREATE POLICY "Members can read their membership rows" ON public.organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.current_user_can_manage_organization(organization_id)
  );

DROP POLICY IF EXISTS "Owners and managers can update members in their org" ON public.organization_members;
CREATE POLICY "Owners and managers can update members in their org" ON public.organization_members
  FOR UPDATE USING (
    public.current_user_can_manage_organization(organization_id)
  )
  WITH CHECK (
    role <> 'owner'
    OR public.current_user_is_owner(organization_id)
  );

NOTIFY pgrst, 'reload schema';