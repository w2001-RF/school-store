<template>
  <div class="team-view">
    <h2>👥 {{ $t('team.title') }}</h2>

    <div v-if="!isSupabase" class="empty banner">{{ $t('team.unavailable') }}</div>
    <template v-else>
      <div v-if="tenant.loading" class="empty">{{ $t('common.loading') }}</div>
      <template v-else>
        <section class="org-card">
          <div class="section-head">
            <h3>{{ tenant.organization?.name || '—' }}</h3>
            <button v-if="canManageOrganization" type="button" class="btn-primary" @click="openOrganizationEdit">{{ $t('team.updateOrganization') }}</button>
          </div>
          <p>{{ $t('team.status') }} : <span class="status" :class="tenant.organization?.status">{{ tenant.organization?.status }}</span></p>
          <p v-if="tenant.organization?.currency">{{ $t('team.currency') }} : {{ tenant.organization.currency }}</p>
        </section>

        <section class="report-table">
          <div class="section-head">
            <h3>{{ $t('team.members') }}</h3>
            <div class="section-actions">
              <button type="button" class="btn-secondary" :disabled="tenant.loading" :title="$t('actions.refresh')" @click="refresh">↻ {{ $t('actions.refresh') }}</button>
              <button v-if="canManageOrganization" type="button" class="btn-primary" @click="openInvite">+ {{ $t('team.inviteUser') }}</button>
            </div>
          </div>
          <p v-if="!tenant.members.length" class="empty">{{ $t('team.noMembers') }}</p>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>{{ $t('team.member') }}</th>
                <th>{{ $t('team.role') }}</th>
                <th>{{ $t('team.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in tenant.members" :key="member.id">
                <td>
                  <strong>{{ member.full_name || member.email || member.user_id }}</strong>
                  <div class="member-email" v-if="member.full_name && member.email">{{ member.email }}</div>
                </td>
                <td>
                  <select
                    :value="member.role"
                    :disabled="!canManageOrganization"
                    @change="changeMember(member, { role: $event.target.value })"
                  >
                    <option value="owner">{{ $t('team.roles.owner') }}</option>
                    <option value="manager">{{ $t('team.roles.manager') }}</option>
                    <option value="cashier">{{ $t('team.roles.cashier') }}</option>
                    <option value="stock_manager">{{ $t('team.roles.stockManager') }}</option>
                    <option value="accountant">{{ $t('team.roles.accountant') }}</option>
                    <option value="viewer">{{ $t('team.roles.viewer') }}</option>
                  </select>
                </td>
                <td>
                  <select
                    :value="member.status"
                    :disabled="!canManageOrganization"
                    @change="changeMember(member, { status: $event.target.value })"
                  >
                    <option value="active">{{ $t('team.statuses.active') }}</option>
                    <option value="invited">{{ $t('team.statuses.invited') }}</option>
                    <option value="suspended">{{ $t('team.statuses.suspended') }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </template>

    <Modal v-if="showOrganizationForm" :title="$t('team.updateOrganization')" @close="showOrganizationForm = false">
      <form @submit.prevent="updateOrganization">
        <div class="form-group">
          <label>{{ $t('team.organizationName') }} *</label>
          <input v-model="organizationForm.name" required maxlength="120" />
        </div>
        <div class="form-group">
          <label>{{ $t('team.organizationSlug') }}</label>
          <input v-model="organizationForm.slug" maxlength="80" pattern="[a-zA-Z0-9\\-]+" />
        </div>
        <div class="form-group"><label>{{ $t('organizations.email') }}</label><input v-model="organizationForm.email" type="email" maxlength="254" /></div>
        <div class="form-group"><label>{{ $t('organizations.phone') }}</label><input v-model="organizationForm.phone" maxlength="30" /></div>
        <div class="form-group"><label>{{ $t('organizations.address') }}</label><input v-model="organizationForm.address" maxlength="200" /></div>
        <div v-if="formError" class="error" role="alert">{{ formError }}</div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="showOrganizationForm = false">{{ $t('common.cancel') }}</button>
          <button type="submit" class="btn-primary" :disabled="tenant.loading">{{ $t('common.save') }}</button>
        </div>
      </form>
    </Modal>

    <Modal v-if="showInviteForm" :title="$t('team.inviteUser')" @close="showInviteForm = false">
      <form @submit.prevent="inviteUser">
        <div class="form-group">
          <label>{{ $t('common.name') }} *</label>
          <input v-model="inviteForm.fullName" required maxlength="120" />
        </div>
        <div class="form-group">
          <label>{{ $t('common.email') }} *</label>
          <input v-model="inviteForm.email" type="email" required maxlength="254" />
        </div>
        <div class="form-group">
          <label>{{ $t('team.role') }} *</label>
          <select v-model="inviteForm.role" required>
            <option value="cashier">{{ $t('team.roles.cashier') }}</option>
            <option value="manager">{{ $t('team.roles.manager') }}</option>
            <option value="stock_manager">{{ $t('team.roles.stockManager') }}</option>
            <option value="accountant">{{ $t('team.roles.accountant') }}</option>
            <option value="viewer">{{ $t('team.roles.viewer') }}</option>
          </select>
        </div>
        <p class="hint">{{ $t('team.inviteHint') }}</p>
        <div v-if="formError" class="error" role="alert">{{ formError }}</div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="showInviteForm = false">{{ $t('common.cancel') }}</button>
          <button type="submit" class="btn-primary" :disabled="tenant.loading">{{ $t('team.sendInvite') }}</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useTenantStore } from '../stores/tenant.js'
import { useAuthStore } from '../stores/auth.js'
import { useToast } from '../composables/useToast.js'
import { db } from '../services/database/index.js'
import Modal from '../components/common/Modal.vue'
import { useI18n } from 'vue-i18n'

const tenant = useTenantStore()
const auth = useAuthStore()
const toast = useToast()
const { t } = useI18n()
const showOrganizationForm = ref(false)
const showInviteForm = ref(false)
const organizationForm = ref({ name: '', slug: '' })
const inviteForm = ref({ fullName: '', email: '', role: 'cashier' })
const formError = ref('')

const isSupabase = computed(() => db.constructor.name === 'SupabaseAdapter' || db.constructor.name === 'Ac')
const canManageOrganization = computed(() => auth.isSuperAdmin || tenant.isOwnerOrManager)

onMounted(refresh)

async function refresh() {
  if (!isSupabase.value) return
  await tenant.fetchCurrentOrganization(auth.user?.id)
  await tenant.fetchMembers()
}

async function changeMember(member, changes) {
  try {
    await tenant.updateMember(member.id, changes)
  } catch (error) {
    toast.error(error.message)
  }
}

function openOrganizationEdit() {
  organizationForm.value = { name: tenant.organization?.name || '', slug: tenant.organization?.slug || '', email: tenant.organization?.email || '', phone: tenant.organization?.phone || '', address: tenant.organization?.address || '' }
  formError.value = ''
  showOrganizationForm.value = true
}

async function updateOrganization() {
  formError.value = ''
  try {
    await tenant.updateOrganization(tenant.organizationId, { name: organizationForm.value.name, slug: organizationForm.value.slug || null, email: organizationForm.value.email || null, phone: organizationForm.value.phone || null, address: organizationForm.value.address || null })
    showOrganizationForm.value = false
    toast.success(t('team.organizationUpdated'))
  } catch (error) { formError.value = error.message }
}

function openInvite() {
  inviteForm.value = { fullName: '', email: '', role: 'cashier' }
  formError.value = ''
  showInviteForm.value = true
}

async function inviteUser() {
  formError.value = ''
  try {
    await tenant.inviteUser(inviteForm.value)
    showInviteForm.value = false
    toast.success(t('team.invitationSent'))
  } catch (error) {
    formError.value = error.message
  }
}
</script>

<style scoped>
.banner { background: white; border: 1px solid var(--line); border-radius: 12px; }
.org-card { background: white; padding: 20px; border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); margin-bottom: 20px; }
.org-card h3 { margin: 0 0 8px; }
.org-card p { margin: 4px 0; color: #4b5563; }
.report-table { background: white; padding: 20px; border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-head h3 { margin: 0; }
.section-actions { display: flex; gap: 8px; align-items: center; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 9px 14px; border-radius: 8px; cursor: pointer; }
.btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 9px 14px; border-radius: 8px; cursor: pointer; }
.btn-primary:disabled, .btn-secondary:disabled { opacity: .5; cursor: not-allowed; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
.data-table select { padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.member-email { color: #6b7280; font-size: .82rem; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-size: .9rem; }
.form-group input, .form-group select { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.hint { color: #6b7280; font-size: .9rem; }
.error { color: #b91c1c; background: #fef2f2; padding: 8px; border-radius: 6px; }
.empty { text-align: center; padding: 24px; color: #6b7280; }
.status { text-transform: capitalize; font-weight: 600; }
</style>
