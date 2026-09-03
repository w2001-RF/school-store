-- Secure organization creation for authenticated managers.
-- User creation remains in the Supabase Edge Function because Auth admin APIs
-- must never be exposed to the browser.

CREATE OR REPLACE FUNCTION public.create_organization(
  organization_name TEXT,
  organization_slug TEXT DEFAULT NULL
)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  created_organization public.organizations;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = actor_id AND is_super_admin = true AND active = true
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  IF organization_name IS NULL OR btrim(organization_name) = '' THEN
    RAISE EXCEPTION 'INVALID_ORGANIZATION_NAME';
  END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES (
    btrim(organization_name),
    NULLIF(lower(regexp_replace(COALESCE(organization_slug, organization_name), '[^a-zA-Z0-9]+', '-', 'g')), '')
  )
  RETURNING * INTO created_organization;

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (created_organization.id, actor_id, 'owner', 'active');

  RETURN created_organization;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'ORGANIZATION_SLUG_ALREADY_EXISTS';
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';