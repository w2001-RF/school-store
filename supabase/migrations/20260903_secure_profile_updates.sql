-- Prevent clients from changing privileged profile columns directly.
-- Profile name changes must go through update_my_profile().

CREATE OR REPLACE FUNCTION public.update_my_profile(profile_full_name TEXT)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_profile public.profiles;
BEGIN
  IF auth.uid() IS NULL OR profile_full_name IS NULL OR btrim(profile_full_name) = '' THEN
    RAISE EXCEPTION 'INVALID_PROFILE_NAME';
  END IF;

  UPDATE public.profiles
  SET full_name = btrim(profile_full_name)
  WHERE id = auth.uid()
  RETURNING * INTO updated_profile;

  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
  RETURN updated_profile;
END;
$$;

REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE ALL ON FUNCTION public.update_my_profile(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Members can read their organization" ON public.organizations;
CREATE POLICY "Members can read their organization" ON public.organizations
  FOR SELECT USING (id = public.current_user_organization_id() OR public.current_user_is_super_admin());

DROP POLICY IF EXISTS "Members can read their membership rows" ON public.organization_members;
CREATE POLICY "Members can read their membership rows" ON public.organization_members
  FOR SELECT USING (
    organization_id = public.current_user_organization_id()
    OR public.current_user_is_super_admin()
  );

NOTIFY pgrst, 'reload schema';