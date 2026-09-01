<template>
  <div class="clients-view">
    <div class="toolbar">
      <input v-model="search" @input="resetPage" :placeholder="`🔍 ${$t('common.search')}...`" class="search" />
      <button class="btn-secondary refresh-button" type="button" :disabled="store.loading" :title="$t('actions.refresh')" @click="refreshClients">↻ {{ $t('actions.refresh') }}</button>
      <button class="btn-secondary" @click="showBulk = true">📥 {{ $t('common.import') }}</button>
      <button class="btn-primary" @click="openForm()">➕ {{ $t('clientsView.new') }}</button>
    </div>

    <div v-if="store.loading" class="empty">{{ $t('common.loading') }}</div>
    <div v-else-if="filtered.length === 0" class="empty">{{ $t('clientsView.noClients') }}</div>
    <div v-else class="clients-grid">
      <article v-for="client in paginated" :key="client.id" class="client-card">
        <h3>{{ client.name }}</h3>
        <p v-if="client.discount_percent">🏷️ Remise générale : {{ client.discount_percent }}%</p>
        <p v-if="client.email">✉️ {{ client.email }}</p>
        <p v-if="client.phone">📞 {{ client.phone }}</p>
        <p v-if="client.address">📍 {{ client.address }}</p>
        <p v-if="client.notes" class="notes">📝 {{ client.notes }}</p>
        <div class="actions">
          <button class="icon-button" title="Modifier le client" :aria-label="`Modifier ${client.name}`" @click="openForm(client)">✏️</button>
          <button class="icon-button" title="Gérer les tarifs produits" :aria-label="`Gérer les tarifs de ${client.name}`" @click="openPricing(client)">💶</button>
          <button class="icon-button danger" title="Supprimer le client" :aria-label="`Supprimer ${client.name}`" @click="requestRemove(client)">🗑️</button>
        </div>
      </article>
    </div>
    <Pagination :page="page" :total-pages="totalPages" :total-items="filtered.length" :page-size="pageSize" @change="goToPage" @update:page-size="changePageSize" />

    <Modal v-if="showForm" @close="showForm = false" :title="form.id ? $t('clientsView.edit') : $t('clientsView.new')">
      <form @submit.prevent="save">
        <div class="form-group"><label>{{ $t('common.name') }} *</label><input v-model="form.name" required /></div>
        <div class="form-row">
          <div class="form-group"><label>{{ $t('common.email') }}</label><input v-model="form.email" type="email" /></div>
          <div class="form-group"><label>{{ $t('common.phone') }}</label><input v-model="form.phone" type="tel" pattern="[0-9+ .()-]{6,20}" title="Numéro de téléphone valide (6 à 20 chiffres, espaces ou +()-)" /></div>
        </div>
        <div class="form-group"><label>{{ $t('common.address') }}</label><input v-model="form.address" /></div>
        <div class="form-group"><label>{{ $t('clientsView.discount') }}</label><input v-model.number="form.discount_percent" type="number" min="0" max="100" step="0.01" /></div>
        <div class="form-group"><label>{{ $t('common.notes') }}</label><textarea v-model="form.notes" rows="2"></textarea></div>
        <div v-if="formError" class="error" aria-live="polite" role="alert">{{ formError }}</div>
        <div class="form-actions"><button type="button" class="btn-secondary" @click="showForm = false">{{ $t('common.cancel') }}</button><button class="btn-primary">{{ $t('common.save') }}</button></div>
      </form>
    </Modal>

    <Modal v-if="showPricing" :title="$t('clientsView.pricing')" @close="showPricing = false">
      <form @submit.prevent="savePricing">
        <p class="hint">Client : {{ pricing.clientName }}. Ce prix remplace la remise générale pour le produit choisi.</p>
        <div class="form-group"><label>Produit *</label><select v-model="pricing.productId" required><option value="" disabled>Choisir un produit</option><option v-for="product in products.items" :key="product.id" :value="product.id">{{ product.name }} ({{ product.price }})</option></select></div>
        <div class="form-group"><label>Prix client *</label><input v-model.number="pricing.price" type="number" min="0" step="0.01" required /></div>
        <div class="form-actions"><button type="button" class="btn-secondary" @click="showPricing = false">Annuler</button><button class="btn-primary">Enregistrer</button></div>
      </form>
    </Modal>

    <BulkImportModal v-if="showBulk" :title="$t('clientsView.importing')" :field-map="clientFields" :create-rows="createRows" @close="showBulk = false" />

    <Modal v-if="deleteTarget" title="Supprimer le client" @close="deleteTarget = null">
      <p>Supprimer « {{ deleteTarget.name }} » ? Cette action est définitive.</p>
      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="deleteTarget = null">Annuler</button>
        <button type="button" class="btn-danger" @click="confirmRemove">Supprimer</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useClientsStore } from '../stores/clients.js'
import { useProductsStore } from '../stores/products.js'
import { db } from '../services/database/index.js'
import Modal from '../components/common/Modal.vue'
import BulkImportModal from '../components/common/BulkImportModal.vue'
import Pagination from '../components/common/Pagination.vue'
import { usePagination } from '../composables/usePagination.js'

const store = useClientsStore()
const products = useProductsStore()
const search = ref('')
const showForm = ref(false)
const showBulk = ref(false)
const form = ref({})
const showPricing = ref(false)
const pricing = ref({ clientId: '', clientName: '', productId: '', price: 0 })
const formError = ref('')
const deleteTarget = ref(null)
const clientFields = { name: ['name', 'nom'], email: ['email', 'e_mail'], phone: ['phone', 'telephone', 'tel'], address: ['address', 'adresse'], notes: ['notes', 'note'], discount_percent: ['discount_percent', 'discount', 'remise'] }

onMounted(() => Promise.all([store.fetchAll(), products.fetchAll()]))

async function refreshClients() {
  await Promise.all([store.fetchAll(), products.fetchAll()])
}

const filtered = computed(() => {
  const value = search.value.trim().toLowerCase()
  if (!value) return store.items
  return store.items.filter(client => [client.name, client.email, client.phone].some(field => (field || '').toLowerCase().includes(value)))
})
const { page, pageSize, totalPages, paginated, goToPage, resetPage } = usePagination(filtered)

function changePageSize(size) {
  pageSize.value = size
  resetPage()
}

function openForm(client = null) {
  form.value = client ? { ...client } : { name: '', email: '', phone: '', address: '', notes: '', discount_percent: 0 }
  formError.value = ''
  showForm.value = true
}

async function save() {
  formError.value = ''
  try {
    if (form.value.id) await store.update(form.value.id, form.value)
    else await store.create(form.value)
    showForm.value = false
  } catch (error) { formError.value = error.message }
}

async function createRows(rows, onProgress = () => {}) {
  for (const [index, row] of rows.entries()) {
    if (!row.name) throw new Error('Chaque client doit avoir un nom')
    await store.create({ ...row, discount_percent: Number(row.discount_percent || 0) })
    onProgress(index + 1)
  }
  showBulk.value = false
}

function openPricing(client) {
  pricing.value = { clientId: client.id, clientName: client.name, productId: '', price: 0 }
  showPricing.value = true
}

async function savePricing() {
  try {
    const existing = await db.findOne('client_product_prices', { client_id: pricing.value.clientId, product_id: pricing.value.productId })
    const data = { client_id: pricing.value.clientId, product_id: pricing.value.productId, price: Number(pricing.value.price) }
    if (existing) await db.update('client_product_prices', existing.id, data)
    else await db.create('client_product_prices', data)
    showPricing.value = false
  } catch (error) { alert(error.message) }
}

function requestRemove(client) {
  deleteTarget.value = client
}

async function confirmRemove() {
  await store.remove(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>

<style scoped>
.toolbar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
.search { flex: 1; min-width: 200px; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; }
.btn-primary, .btn-secondary { border: none; padding: 10px 14px; border-radius: 8px; cursor: pointer; }
.btn-primary { background: #3b82f6; color: white; }
.btn-secondary { background: #e5e7eb; color: #374151; }
.clients-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
.client-card { background: white; padding: 18px; border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); }
.client-card:hover { transform: translateY(-3px); box-shadow: 0 16px 30px rgba(23,48,66,.12); }
.client-card h3 { margin: 0 0 10px; }
.client-card p { margin: 6px 0; color: #4b5563; font-size: .9rem; overflow-wrap: anywhere; }
.client-card .notes { color: #6b7280; }
.actions { display: flex; gap: 8px; margin-top: 14px; }
.icon-button { border: none; background: #f3f4f6; padding: 7px 10px; border-radius: 6px; cursor: pointer; }
.icon-button.danger:hover { background: #fee2e2; }
.empty { padding: 40px; background: white; border-radius: 8px; text-align: center; color: #6b7280; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-size: .9rem; }
.form-group input, .form-group textarea, form > textarea { width: 100%; box-sizing: border-box; padding: 9px 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.hint { color: #6b7280; font-size: .9rem; }
.error { margin: 0 0 12px; color: #b91c1c; background: #fef2f2; padding: 8px; border-radius: 6px; }
.btn-danger { background: #dc2626; color: white; border: none; padding: 10px 14px; border-radius: 6px; cursor: pointer; }
@media (max-width: 600px) { .form-row { grid-template-columns: 1fr; gap: 0; } }

@media (max-width: 450px) {
  .toolbar { flex-direction: column; align-items: stretch; }
  .search { font-size: 16px; }
  .toolbar > .btn-primary, .toolbar > .btn-secondary { width: 100%; text-align: center; }
  .clients-grid { grid-template-columns: 1fr; }
  .actions { flex-wrap: wrap; }
  .icon-button { flex: 1; min-height: 40px; }
}
</style>
