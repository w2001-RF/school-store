<template>
  <div class="organizations-view">
    <div class="page-head">
      <h2>🏢 {{ $t('organizations.title') }}</h2>
      <button class="btn-primary" type="button" @click="openCreate">+ {{ $t('organizations.create') }}</button>
    </div>

    <div v-if="loading" class="empty">{{ $t('common.loading') }}</div>
    <div v-else-if="!organizations.length" class="empty">{{ $t('organizations.empty') }}</div>
    <div v-else class="organization-grid">
      <article v-for="organization in organizations" :key="organization.id" class="organization-card">
        <div class="card-head">
          <h3>{{ organization.name }}</h3>
          <span class="status" :class="organization.status">{{ organization.status }}</span>
        </div>
        <p v-if="organization.slug">/{{ organization.slug }}</p>
        <p v-if="organization.email">{{ organization.email }}</p>
        <p v-if="organization.country">{{ organization.country }}</p>
        <div class="actions">
          <button class="icon-button" type="button" :title="$t('organizations.manageTeam')" :aria-label="$t('organizations.manageTeam')" @click="manageTeam(organization)">👥</button>
          <button class="icon-button" type="button" :title="$t('common.edit')" :aria-label="$t('common.edit')" @click="openEdit(organization)">✏️</button>
          <button class="icon-button danger" type="button" :title="$t('common.delete')" :aria-label="$t('common.delete')" @click="remove(organization)">🗑️</button>
        </div>
      </article>
    </div>

    <Modal v-if="formVisible" :title="form.id ? $t('organizations.edit') : $t('organizations.create')" @close="formVisible = false">
      <form @submit.prevent="save">
        <div class="form-group"><label>{{ $t('organizations.name') }} *</label><input v-model="form.name" required maxlength="120" /></div>
        <div class="form-group"><label>{{ $t('organizations.slug') }}</label><input v-model="form.slug" maxlength="80" pattern="[a-zA-Z0-9\-]+" /></div>
        <div class="form-group"><label>{{ $t('organizations.status') }}</label><select v-model="form.status"><option value="active">{{ $t('organizations.active') }}</option><option value="suspended">{{ $t('organizations.suspended') }}</option><option value="pending">{{ $t('organizations.pending') }}</option><option value="cancelled">{{ $t('organizations.cancelled') }}</option></select></div>
        <div class="form-group"><label>{{ $t('organizations.email') }}</label><input v-model="form.email" type="email" maxlength="254" /></div>
        <div class="form-group"><label>{{ $t('organizations.phone') }}</label><input v-model="form.phone" type="tel" maxlength="30" /></div>
        <div class="form-group"><label>{{ $t('organizations.address') }}</label><input v-model="form.address" maxlength="200" /></div>
        <div v-if="error" class="error" role="alert">{{ error }}</div>
        <div class="form-actions"><button type="button" class="btn-secondary" @click="formVisible = false">{{ $t('common.cancel') }}</button><button type="submit" class="btn-primary" :disabled="saving">{{ $t('common.save') }}</button></div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import Modal from '../components/common/Modal.vue'
import { useTenantStore } from '../stores/tenant.js'
import { useToast } from '../composables/useToast.js'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const tenant = useTenantStore()
const toast = useToast()
const { t } = useI18n()
const router = useRouter()
const organizations = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const formVisible = ref(false)
const form = ref({})

onMounted(refresh)

async function refresh() {
  loading.value = true
  try { organizations.value = await tenant.fetchOrganizations() }
  catch (e) { error.value = e.message }
  finally { loading.value = false }
}

function openCreate() {
  form.value = { name: '', slug: '', status: 'active', email: '', phone: '', address: '' }
  error.value = ''
  formVisible.value = true
}

function openEdit(organization) {
  form.value = { ...organization }
  error.value = ''
  formVisible.value = true
}

async function manageTeam(organization) {
  await tenant.selectOrganization(organization.id)
  router.push({ name: 'team' })
}

async function save() {
  error.value = ''
  saving.value = true
  try {
    if (form.value.id) await tenant.updateOrganization(form.value.id, { name: form.value.name, slug: form.value.slug || null, status: form.value.status, email: form.value.email || null, phone: form.value.phone || null, address: form.value.address || null })
    else await tenant.createOrganization(form.value.name, form.value.slug || null)
    formVisible.value = false
    await refresh()
    toast.success(t('organizations.saved'))
  } catch (e) { error.value = e.message }
  finally { saving.value = false }
}

async function remove(organization) {
  if (!window.confirm(t('organizations.confirmDelete', { name: organization.name }))) return
  try {
    await tenant.removeOrganization(organization.id)
    await refresh()
    toast.success(t('organizations.deleted'))
  } catch (e) { toast.error(e.message) }
}
</script>

<style scoped>
.page-head, .card-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.page-head { margin-bottom: 20px; }
.page-head h2, .card-head h3 { margin: 0; }
.organization-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.organization-card { background: white; padding: 18px; border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); }
.organization-card p { color: #6b7280; overflow-wrap: anywhere; }
.status { text-transform: capitalize; font-weight: 600; }
.actions { display: flex; gap: 8px; margin-top: 14px; }
.icon-button { border: none; background: #f3f4f6; padding: 7px 10px; border-radius: 6px; cursor: pointer; }
.icon-button.danger:hover { background: #fee2e2; }
.btn-primary, .btn-secondary { border: none; padding: 10px 14px; border-radius: 8px; cursor: pointer; }
.btn-primary { background: #3b82f6; color: white; }
.btn-secondary { background: #e5e7eb; color: #374151; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-size: .9rem; }
.form-group input, .form-group select { width: 100%; box-sizing: border-box; padding: 9px 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.error { color: #b91c1c; background: #fef2f2; padding: 8px; border-radius: 6px; }
.empty { padding: 40px; text-align: center; color: #6b7280; }
</style>