import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
}

const allowedRoles = new Set(['manager', 'cashier', 'stock_manager', 'accountant', 'viewer'])

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    })
  }

  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) throw new Error('UNAUTHORIZED')

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const adminClient = createClient(url, serviceRoleKey)
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) throw new Error('UNAUTHORIZED')

    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const fullName = String(body.fullName || '').trim()
    const role = String(body.role || 'cashier')
    const organizationId = String(body.organizationId || '')
    const redirectTo = String(body.redirectTo || '').trim()
    if (!email || !fullName || !organizationId || !redirectTo || !allowedRoles.has(role)) throw new Error('INVALID_INPUT')

    const allowedRedirectOrigin = Deno.env.get('INVITE_REDIRECT_ORIGIN')
    if (!allowedRedirectOrigin || new URL(redirectTo).origin !== new URL(allowedRedirectOrigin).origin) {
      throw new Error('INVALID_REDIRECT_URL')
    }

    const { data: actorProfile } = await adminClient
      .from('profiles')
      .select('is_super_admin, active')
      .eq('id', user.id)
      .maybeSingle()
    const isSuperAdmin = actorProfile?.is_super_admin === true && actorProfile.active === true

    const { data: actor } = await adminClient
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!isSuperAdmin && (!actor || actor.status !== 'active' || !['owner', 'manager'].includes(actor.role))) throw new Error('PERMISSION_DENIED')

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role: role === 'manager' ? 'manager' : 'agent' },
      redirectTo
    })
    if (inviteError) throw inviteError

    await adminClient
      .from('organization_members')
      .delete()
      .eq('user_id', invited.user.id)
      .neq('organization_id', organizationId)

    await adminClient
      .from('profiles')
      .update({ organization_id: organizationId })
      .eq('id', invited.user.id)

    const { error: membershipError } = await adminClient
      .from('organization_members')
      .upsert({ organization_id: organizationId, user_id: invited.user.id, role, status: 'invited' }, { onConflict: 'organization_id,user_id' })
    if (membershipError) throw membershipError

    return new Response(JSON.stringify({ id: invited.user.id, email, fullName, role, status: 'invited' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INTERNAL_ERROR'
    const status = ['UNAUTHORIZED', 'PERMISSION_DENIED'].includes(message) ? 403 : 400
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status
    })
  }
})