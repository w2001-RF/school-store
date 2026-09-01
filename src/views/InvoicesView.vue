<template>
  <div>
    <h2>📋 {{ $t('invoicesView.title') }}</h2>
    <div class="filters">
      <input v-model="search" @input="resetPage" :placeholder="`🔍 ${$t('invoicesView.search')}`" />
      <button class="refresh-button" type="button" :disabled="store.loading" :title="$t('actions.refresh')" @click="refreshInvoices">↻ {{ $t('actions.refresh') }}</button>
      <select v-model="statusFilter" @change="resetPage">
        <option value="">{{ $t('common.allStatuses') }}</option>
        <option value="paid">{{ $t('status.paid') }}</option>
        <option value="pending">{{ $t('status.pending') }}</option>
        <option value="cancelled">{{ $t('status.cancelled') }}</option>
      </select>
      <button v-if="auth.isManager && selectedIds.size" class="bulk-delete" title="Supprimer les factures sélectionnées" @click="deleteSelected">
        🗑️ Supprimer ({{ selectedIds.size }})
      </button>
    </div>
    <div v-if="store.loading" class="empty">{{ $t('common.loading') }}</div>
    <div v-else-if="filtered.length === 0" class="empty">{{ $t('invoicesView.noInvoices') }}</div>
    <div v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th v-if="auth.isManager"><input type="checkbox" :checked="allSelected" :title="$t('invoicesView.selectAll')" :aria-label="$t('invoicesView.selectAll')" @change="toggleAll" /></th>
            <th>{{ $t('invoicesView.invoiceNumber') }}</th>
            <th v-if="auth.isManager">{{ $t('invoicesView.createdBy') }}</th>
            <th>{{ $t('invoicesView.client') }}</th>
            <th>{{ $t('invoicesView.date') }}</th>
            <th>{{ $t('invoicesView.total') }}</th>
            <th>{{ $t('invoicesView.status') }}</th>
            <th>{{ $t('invoicesView.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in paginated" :key="inv.id">
            <td v-if="auth.isManager"><input type="checkbox" :checked="selectedIds.has(inv.id)" :aria-label="`Sélectionner ${inv.invoice_number}`" @change="toggleSelection(inv.id)" /></td>
            <td><strong>{{ inv.invoice_number }}</strong></td>
            <td v-if="auth.isManager">{{ inv.agent_name || '—' }}</td>
            <td>{{ inv.customer_name || '—' }}</td>
            <td>{{ formatDate(inv.created_at) }}</td>
            <td>{{ formatMoney(inv.total_amount) }}</td>
            <td>
              <span class="status" :class="inv.status">
                {{ statusLabel(inv.status) }}
              </span>
            </td>
            <td>
              <router-link :to="`/invoices/${inv.id}`" class="icon-action" :title="$t('invoicesView.view')" :aria-label="$t('invoicesView.view')">👁️</router-link>
              <select v-if="auth.isManager" :value="inv.status" class="status-select" @change="changeStatus(inv, $event.target.value)">
                <option value="pending">{{ $t('status.pending') }}</option>
                <option value="paid">{{ $t('status.paid') }}</option>
                <option value="cancelled">{{ $t('status.cancelled') }}</option>
              </select>
              <button v-if="auth.isManager" class="icon-action danger" :title="$t('invoicesView.delete')" :aria-label="$t('invoicesView.delete')" @click="deleteInvoice(inv)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="invoices-mobile">
        <article v-for="inv in paginated" :key="inv.id" class="invoice-card">
          <div class="card-header">
            <div class="checkbox-col">
              <input v-if="auth.isManager" type="checkbox" :checked="selectedIds.has(inv.id)" :aria-label="`Sélectionner ${inv.invoice_number}`" @change="toggleSelection(inv.id)" />
            </div>
            <div class="info-col">
              <h3>{{ inv.invoice_number }}</h3>
              <p class="date">{{ formatDate(inv.created_at) }}</p>
            </div>
            <span class="status" :class="inv.status">{{ statusLabel(inv.status) }}</span>
          </div>
          <div class="card-body">
            <div v-if="auth.isManager" class="detail-row">
              <span class="label">{{ $t('invoicesView.createdBy') }}</span>
              <span class="value">{{ inv.agent_name || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">{{ $t('invoicesView.client') }}</span>
              <span class="value">{{ inv.customer_name || '—' }}</span>
            </div>
            <div class="detail-row highlight">
              <span class="label">{{ $t('invoicesView.total') }}</span>
              <span class="value">{{ formatMoney(inv.total_amount) }}</span>
            </div>
          </div>
          <div class="card-actions">
            <router-link :to="`/invoices/${inv.id}`" class="action-btn view" :title="$t('invoicesView.view')">👁️ {{ $t('invoicesView.view') }}</router-link>
            <select v-if="auth.isManager" :value="inv.status" class="action-status" @change="changeStatus(inv, $event.target.value)">
              <option value="pending">{{ $t('status.pending') }}</option>
              <option value="paid">{{ $t('status.paid') }}</option>
              <option value="cancelled">{{ $t('status.cancelled') }}</option>
            </select>
            <button v-if="auth.isManager" class="action-btn delete" :title="$t('invoicesView.delete')" @click="deleteInvoice(inv)">🗑️</button>
          </div>
        </article>
      </div>
    </div>
    <Pagination :page="page" :total-pages="totalPages" :total-items="filtered.length" :page-size="pageSize" @change="goToPage" @update:page-size="changePageSize" />
  </div>
  <div v-if="deleteConfirmation" class="confirmation-backdrop" @click.self="deleteConfirmation = null">
    <div class="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
      <h3 id="delete-title">Supprimer {{ deleteConfirmation.type === 'bulk' ? 'les factures sélectionnées' : 'la facture' }} ?</h3>
      <p>Cette action est définitive.</p>
      <div class="confirmation-actions">
        <button type="button" class="btn-cancel" @click="deleteConfirmation = null">Annuler</button>
        <button type="button" class="btn-confirm-delete" @click="confirmDeletion">Supprimer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useInvoicesStore } from '../stores/invoices.js'
import { useAuthStore } from '../stores/auth.js'
import { formatMoney, formatDate } from '../utils/format.js'
import { useI18n } from 'vue-i18n'
import Pagination from '../components/common/Pagination.vue'
import { usePagination } from '../composables/usePagination.js'

const store = useInvoicesStore()
const auth = useAuthStore()
const { t } = useI18n()
const search = ref('')
const statusFilter = ref('')
const selectedIds = ref(new Set())
const deleteConfirmation = ref(null)

onMounted(() => store.fetchAll())

async function refreshInvoices() {
  await store.fetchAll()
}

const filtered = computed(() => store.items.filter(inv => {
  const matchSearch = !search.value ||
    inv.invoice_number.toLowerCase().includes(search.value.toLowerCase()) ||
    (inv.customer_name || '').toLowerCase().includes(search.value.toLowerCase())
  const matchStatus = !statusFilter.value || inv.status === statusFilter.value
  return matchSearch && matchStatus
}))

const allSelected = computed(() => filtered.value.length > 0 && filtered.value.every(invoice => selectedIds.value.has(invoice.id)))
const { page, pageSize, totalPages, paginated, goToPage, resetPage } = usePagination(filtered, 10)

function changePageSize(size) {
  pageSize.value = size
  resetPage()
}

function statusLabel(s) {
  const key = { paid: 'status.paid', pending: 'status.pending', cancelled: 'status.cancelled' }[s]
  return key ? t(key) : s
}

async function changeStatus(invoice, status) {
  try { await store.updateStatus(invoice.id, status) }
  catch (error) { alert(error.message) }
}

function deleteInvoice(invoice) {
  deleteConfirmation.value = { type: 'single', id: invoice.id }
}

function toggleSelection(id) {
  const next = new Set(selectedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedIds.value = next
}

function toggleAll() {
  const next = new Set(selectedIds.value)
  if (allSelected.value) filtered.value.forEach(invoice => next.delete(invoice.id))
  else filtered.value.forEach(invoice => next.add(invoice.id))
  selectedIds.value = next
}

async function deleteSelected() {
  const ids = [...selectedIds.value]
  deleteConfirmation.value = { type: 'bulk', ids }
}

async function confirmDeletion() {
  const confirmation = deleteConfirmation.value
  deleteConfirmation.value = null
  try {
    if (confirmation.type === 'bulk') {
      await store.removeMany(confirmation.ids)
      selectedIds.value = new Set()
    } else {
      await store.remove(confirmation.id)
    }
  } catch (error) { alert(error.message) }
}
</script>

<style scoped>
.filters { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.filters input, .filters select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; }
.filters input { flex: 1; min-width: 200px; }
.data-table { width: 100%; min-width: 760px; background: white; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; box-shadow: var(--shadow); border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
.data-table th { background: #f9fafb; font-weight: 600; font-size: 0.85rem; color: #6b7280; text-transform: uppercase; }
.status { padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.status.paid { background: #d1fae5; color: #065f46; }
.status.pending { background: #fef3c7; color: #92400e; }
.status.cancelled { background: #fee2e2; color: #991b1b; }
.icon-action { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; color: #3b82f6; text-decoration: none; border: none; background: transparent; cursor: pointer; border-radius: 6px; font-size: 1rem; }
.icon-action:hover { background: #eff6ff; }
.icon-action.danger:hover { background: #fef2f2; }
.status-select { margin-left: 8px; padding: 5px 7px; border: 1px solid #d1d5db; border-radius: 6px; }
.bulk-delete { padding: 8px 12px; border: 1px solid #fecaca; border-radius: 6px; background: #fef2f2; color: #b91c1c; cursor: pointer; }
.refresh-button { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white; color: #374151; cursor: pointer; white-space: nowrap; }
.refresh-button:disabled { cursor: wait; opacity: .55; }
.empty { text-align: center; padding: 40px; color: #6b7280; background: white; border-radius: 8px; }
.data-table { display: table; }
@media (max-width: 800px) { .data-table { display: block; overflow-x: auto; } }

.invoices-mobile { display: none; }

@media (max-width: 450px) {
  h2 { font-size: 1.15rem; }
  .filters { flex-direction: column; align-items: stretch; }
  .filters input, .filters select { font-size: 16px; width: 100%; box-sizing: border-box; }
  .refresh-button, .bulk-delete { width: 100%; text-align: center; }
  .data-table { display: none; }
  .invoices-mobile { display: block; }
  .invoice-card { background: white; border: 1px solid var(--line); border-radius: 10px; padding: 0; margin-bottom: 12px; overflow: hidden; box-shadow: var(--shadow); }
  .card-header { display: flex; align-items: center; gap: 10px; padding: 12px; border-bottom: 1px solid var(--line); background: #f9fafb; }
  .checkbox-col { display: flex; align-items: center; }
  .checkbox-col input { width: 18px; height: 18px; cursor: pointer; }
  .info-col { flex: 1; min-width: 0; }
  .info-col h3 { margin: 0 0 4px; font-size: 1rem; word-break: break-word; }
  .info-col .date { margin: 0; font-size: 0.85rem; color: #6b7280; }
  .card-header .status { padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
  .card-body { padding: 12px; }
  .detail-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.9rem; }
  .detail-row:last-child { margin-bottom: 0; }
  .detail-row.highlight { border-top: 1px solid var(--line); padding-top: 8px; margin-top: 8px; font-weight: 600; }
  .detail-row .label { color: #6b7280; font-weight: 500; }
  .detail-row .value { text-align: right; color: #1f2937; word-break: break-word; }
  .card-actions { display: flex; gap: 6px; padding: 8px 12px; background: #f9fafb; border-top: 1px solid var(--line); }
  .action-btn { display: flex; align-items: center; justify-content: center; flex: 1; padding: 8px 6px; border: 1px solid #d1d5db; background: white; border-radius: 6px; color: #3b82f6; text-decoration: none; font-size: 0.85rem; cursor: pointer; min-height: 36px; white-space: nowrap; }
  .action-btn:hover { background: #eff6ff; }
  .action-btn.delete:hover { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
  .action-status { flex: 1; padding: 6px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; background: white; cursor: pointer; }
}

:root[data-theme='dark'] .invoice-card {
  background: #1f2937;
  border-color: #374151;
}

:root[data-theme='dark'] .card-header {
  background: #111827;
  border-color: #374151;
}

:root[data-theme='dark'] .info-col h3 {
  color: #f3f4f6;
}

:root[data-theme='dark'] .info-col .date,
:root[data-theme='dark'] .detail-row .label {
  color: #9ca3af;
}

:root[data-theme='dark'] .detail-row .value {
  color: #e5e7eb;
}

:root[data-theme='dark'] .card-body {
  border-color: #374151;
}

:root[data-theme='dark'] .detail-row.highlight {
  border-top-color: #374151;
  color: #e5e7eb;
}

:root[data-theme='dark'] .card-actions {
  background: #111827;
  border-top-color: #374151;
}

:root[data-theme='dark'] .action-btn {
  background: #1f2937;
  border-color: #374151;
  color: #60a5fa;
}

:root[data-theme='dark'] .action-btn:hover {
  background: #111827;
  border-color: #4b5563;
}

:root[data-theme='dark'] .action-btn.delete {
  color: #ef4444;
}

:root[data-theme='dark'] .action-btn.delete:hover {
  background: #7f1d1d;
  border-color: #b91c1c;
  color: #fecaca;
}

:root[data-theme='dark'] .action-status {
  background: #1f2937;
  border-color: #374151;
  color: #e5e7eb;
}

.confirmation-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 20px; background: rgba(17, 24, 39, 0.45); }
.confirmation-dialog { width: min(100%, 420px); padding: 24px; border-radius: 10px; background: white; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18); }
.confirmation-dialog h3 { margin: 0 0 8px; color: #1f2937; }
.confirmation-dialog p { margin: 0 0 20px; color: #6b7280; }
.confirmation-actions { display: flex; justify-content: flex-end; gap: 10px; }
.confirmation-actions button { padding: 9px 14px; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; }
.btn-cancel { background: white; color: #374151; }
.btn-confirm-delete { background: #dc2626; color: white; border-color: #dc2626 !important; }
</style>
