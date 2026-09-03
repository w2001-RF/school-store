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
      const memberRow = await db.findOne('organization_members', { user_id: userId, status: 'active' })
      membership.value = memberRow || null

      const orgId = memberRow?.organization_id || DEFAULT_ORGANIZATION_ID
      organization.value = await db.findById('organizations', orgId)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
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
    error.value = null
  }

  return {
    organization,
    membership,
    members,
    loading,
    error,
    organizationId,
    role,
    isOwnerOrManager,
    fetchCurrentOrganization,
    fetchMembers,
    updateMember,
    reset
  }
})
