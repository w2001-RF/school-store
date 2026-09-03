-- Run this migration in Supabase SQL Editor for an existing project.
-- Adds an UPDATE policy so an org's owner/manager can change a member's role or status
-- (frontend team-management screen). Read-only policies from the Phase 1 migration are untouched.
-- Privilege escalation guard: only an existing 'owner' can grant the 'owner' role to someone else.

DROP POLICY IF EXISTS "Owners and managers can update members in their org" ON public.organization_members;
CREATE POLICY "Owners and managers can update members in their org" ON public.organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members actor
      WHERE actor.user_id = auth.uid()
        AND actor.organization_id = organization_members.organization_id
        AND actor.role IN ('owner', 'manager')
        AND actor.status = 'active'
    )
  )
  WITH CHECK (
    role <> 'owner'
    OR EXISTS (
      SELECT 1 FROM public.organization_members actor
      WHERE actor.user_id = auth.uid()
        AND actor.organization_id = organization_members.organization_id
        AND actor.role = 'owner'
        AND actor.status = 'active'
    )
  );

NOTIFY pgrst, 'reload schema';
