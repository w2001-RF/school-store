import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../services/database/index.js'

const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Phase 1 SaaS scaffold: exposes the current user's organization and
 * membership. Not yet consumed by other stores/queries — existing
 * single-tenant behaviour is unaffected until callers opt in.
 */
export const useTenantStore = defineStore('tenant', () => {
  const organization = ref(null)
  const membership = ref(null)
  const members = ref([])
  const loading = ref(false)
  const error = ref(null)

  const organizationId = computed(() => organization.value?.id || DEFAULT_ORGANIZATION_ID)
  const role = computed(() => membership.value?.role || null)
  const isOwnerOrManager = computed(() => ['owner', 'manager'].includes(role.value))

  async function fetchCurrentOrganization(userId) {
    if (!userId) return
    loading.value = true
    error.value = null
    try {
      const selectedMember = selectedOrganizationId.value
        ? await db.findOne('organization_members', { user_id: userId, organization_id: selectedOrganizationId.value, status: 'active' })
        : null
      const memberRow = selectedMember || await db.findOne('organization_members', { user_id: userId, status: 'active' })
      membership.value = memberRow || null

      const orgId = selectedOrganizationId.value || memberRow?.organization_id || DEFAULT_ORGANIZATION_ID
      organization.value = await db.findById('organizations', orgId)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const selectedOrganizationId = ref(null)

  async function selectOrganization(id) {
    selectedOrganizationId.value = id || null
    organization.value = id ? await db.findById('organizations', id) : null
    membership.value = id ? await db.findOne('organization_members', { organization_id: id, status: 'active' }) : null
    return organization.value
  }

  async function fetchMembers() {
    loading.value = true
    error.value = null
    try {
      const rows = await db.find('organization_members', { where: { organization_id: organizationId.value } })
      members.value = await Promise.all(rows.map(async row => {
        const profile = await db.findById('profiles', row.user_id)
        return { ...row, full_name: profile?.full_name || profile?.fullName || null, email: profile?.email || null }
      }))
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchOrganizations() {
    loading.value = true
    error.value = null
    try {
      return await db.find('organizations', { orderBy: { field: 'name', ascending: true } })
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateOrganization(id, changes) {
    const updated = await db.update('organizations', id, changes)
    if (organization.value?.id === id) organization.value = updated
    return updated
  }

  async function removeOrganization(id) {
    await db.delete('organizations', id)
    if (organization.value?.id === id) reset()
  }

  async function createOrganization(name, slug = null) {
    const created = await db.rpc('create_organization', {
      organization_name: name,
      organization_slug: slug
    })
    organization.value = created
    membership.value = { organization_id: created.id, role: 'owner', status: 'active' }
    members.value = []
    await fetchMembers()
    return created
  }

  async function inviteUser({ email, fullName, role }) {
    if (typeof db.invoke !== 'function') throw new Error('Les invitations nécessitent l’adaptateur Supabase')
    const invited = await db.invoke('manage-organization-user', {
      email,
      fullName,
      role,
      organizationId: organizationId.value
    })
    await fetchMembers()
    return invited
  }

  async function updateMember(id, changes) {
    const updated = await db.update('organization_members', id, changes)
    const index = members.value.findIndex(member => member.id === id)
    if (index !== -1) members.value[index] = { ...members.value[index], ...updated }
    return updated
  }

  function reset() {
    organization.value = null
    membership.value = null
    members.value = []
    selectedOrganizationId.value = null
    error.value = null
  }

  return {
    organization,
    membership,
    members,
    loading,
    error,
    organizationId,
    selectedOrganizationId,
    role,
    isOwnerOrManager,
    fetchCurrentOrganization,
    selectOrganization,
    fetchMembers,
    fetchOrganizations,
    updateOrganization,
    removeOrganization,
    createOrganization,
    inviteUser,
    updateMember,
    reset
  }
})
