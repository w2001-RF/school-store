<template>
  <div v-if="invoice">
    <button @click="$router.back()" class="btn-back">← {{ $t('detail.back') }}</button>
    <div class="invoice-detail">
      <div class="head">
        <div>
          <h2>🧾 {{ invoice.invoice_number }}</h2>
          <p>{{ $t('detail.date') }} : {{ formatDate(invoice.created_at) }}</p>
          <p>{{ $t('detail.customer') }} : {{ invoice.customer_name || '—' }}</p>
          <p v-if="auth.isManager" class="invoice-agent">{{ $t('detail.createdBy') }} : {{ invoice.agent_name || '—' }}</p>
        </div>
        <span class="status" :class="invoice.status">{{ $t(`status.${invoice.status}`) }}</span>
      </div>
      <div v-if="auth.isManager" class="manager-actions">
        <label>
          {{ $t('detail.status') }}
          <select :value="invoice.status" @change="changeStatus($event.target.value)">
            <option value="pending">{{ $t('status.pending') }}</option>
            <option value="paid">{{ $t('status.paid') }}</option>
            <option value="cancelled">{{ $t('status.cancelled') }}</option>
          </select>
        </label>
        <button type="button" class="icon-action danger" :title="$t('detail.delete')" :aria-label="$t('detail.delete')" @click.prevent="deleteInvoice()">🗑️</button>
      </div>
      <button class="btn-refresh-detail" type="button" :disabled="refreshing" :title="$t('actions.refresh')" @click="refreshInvoice">↻ {{ $t('actions.refresh') }}</button>
      <table class="items">
        <thead>
          <tr><th>{{ $t('detail.product') }}</th><th>{{ $t('detail.quantity') }}</th><th>{{ $t('detail.unitPrice') }}</th><th>{{ $t('detail.total') }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in invoice.items" :key="item.id">
            <td>{{ item.product_name }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ formatMoney(item.unit_price) }}</td>
            <td>{{ formatMoney(item.total_price) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr><td colspan="3">{{ $t('detail.subtotal') }}</td><td>{{ formatMoney(subtotalAmount) }}</td></tr>
          <tr v-if="discountAmount > 0"><td colspan="3">{{ $t('detail.discount') }}</td><td>-{{ formatMoney(discountAmount) }}</td></tr>
          <tr><td colspan="3"><strong>{{ $t('detail.total') }}</strong></td><td><strong>{{ formatMoney(invoice.total_amount) }}</strong></td></tr>
          <tr><td colspan="3">{{ $t('detail.paid') }}</td><td>{{ formatMoney(invoice.paid_amount) }}</td></tr>
          <tr v-if="remainingAmount > 0"><td colspan="3">{{ $t('detail.remaining') }}</td><td>{{ formatMoney(remainingAmount) }}</td></tr>
        </tfoot>
      </table>
      <section class="payment-history">
        <h3>{{ $t('detail.paymentHistory') }}</h3>
        <p v-if="!invoice.payments?.length" class="empty-payments">{{ $t('detail.noPayments') }}</p>
        <ul v-else>
          <li v-for="payment in invoice.payments" :key="payment.id">
            <span>{{ paymentMethodLabel(payment.method) }} - {{ formatDate(payment.paid_at || payment.created_at) }}</span>
            <strong>{{ formatMoney(payment.amount) }}</strong>
          </li>
        </ul>
      </section>
      <button type="button" class="btn-print" @click="printInvoice">🖨️ {{ $t('detail.print') }}</button>
    </div>
  </div>
  <div v-if="showDeleteConfirmation" class="confirmation-backdrop" @click.self="showDeleteConfirmation = false">
    <div class="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
      <h3 id="delete-title">Supprimer la facture ?</h3>
      <p>Cette action est définitive.</p>
      <div class="confirmation-actions">
        <button type="button" class="btn-cancel" @click="showDeleteConfirmation = false">Annuler</button>
        <button type="button" class="btn-confirm-delete" @click="confirmDeleteInvoice">Supprimer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInvoicesStore } from '../stores/invoices.js'
import { useAuthStore } from '../stores/auth.js'
import { formatMoney, formatDate } from '../utils/format.js'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const invoices = useInvoicesStore()
const auth = useAuthStore()
const { t } = useI18n()
const invoice = ref(null)
const showDeleteConfirmation = ref(false)
const refreshing = ref(false)
const subtotalAmount = computed(() => Number(invoice.value?.subtotal_amount) || (invoice.value?.items || []).reduce((total, item) => total + Number(item.total_price || 0), 0))
const discountAmount = computed(() => Number(invoice.value?.discount_amount || 0))
const remainingAmount = computed(() => Number(invoice.value?.remaining_amount ?? Math.max(0, Number(invoice.value?.total_amount || 0) - Number(invoice.value?.paid_amount || 0))))
onMounted(async () => { invoice.value = await invoices.fetchWithItems(route.params.id) })

async function refreshInvoice() {
  refreshing.value = true
  try { invoice.value = await invoices.fetchWithItems(route.params.id) }
  finally { refreshing.value = false }
}

function printInvoice() {
  if (typeof window === 'undefined' || typeof window.print !== 'function') {
    alert('Impression indisponible dans ce navigateur')
    return
  }
  window.print()
}

async function changeStatus(status) {
  try {
    invoice.value = { ...invoice.value, ...(await invoices.updateStatus(invoice.value.id, status)) }
  } catch (error) { alert(error.message) }
}

function deleteInvoice() {
  showDeleteConfirmation.value = true
}

async function confirmDeleteInvoice() {
  showDeleteConfirmation.value = false
  try {
    await invoices.remove(invoice.value.id)
    await router.replace({ name: 'invoices' })
  } catch (error) { alert(error?.message || 'Impossible de supprimer la facture') }
}

function paymentMethodLabel(method) {
  const key = { cash: 'pos.cash', card: 'pos.card', transfer: 'pos.transfer', other: 'pos.other' }[method]
  return key ? t(key) : method
}
</script>

<style scoped>
.btn-back { background: none; border: none; color: #3b82f6; cursor: pointer; margin-bottom: 12px; font-size: 0.95rem; }
.invoice-detail { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.head { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.head h2 { margin: 0 0 8px; }
.head p { margin: 4px 0; color: #6b7280; }
.status { padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; }
.status.paid { background: #d1fae5; color: #065f46; }
.status.pending { background: #fef3c7; color: #92400e; }
.status.cancelled { background: #fee2e2; color: #991b1b; }
.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
.items th, .items td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
.items th { background: #f9fafb; font-size: 0.85rem; color: #6b7280; text-transform: uppercase; }
.items tfoot td { border-top: 2px solid #1f2937; border-bottom: none; padding-top: 12px; }
.payment-history { border-top: 1px solid #e5e7eb; margin: 20px 0; padding-top: 16px; }
.payment-history h3 { font-size: 1rem; margin: 0 0 8px; }
.payment-history ul { list-style: none; margin: 0; padding: 0; }
.payment-history li { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; border-bottom: 1px solid #e5e7eb; }
.empty-payments { color: #6b7280; margin: 0; }
.btn-print { background: #3b82f6; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; }
.btn-refresh-detail { margin-bottom: 10px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white; color: #374151; cursor: pointer; }
.btn-refresh-detail:disabled { cursor: wait; opacity: .55; }
.manager-actions { display: flex; align-items: end; gap: 12px; margin-bottom: 16px; }
.manager-actions label { display: flex; flex-direction: column; gap: 4px; color: #6b7280; font-size: 0.85rem; }
.manager-actions select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; color: #1f2937; }
.btn-delete { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; padding: 8px 12px; border-radius: 6px; cursor: pointer; }
.icon-action { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; min-height: 36px; border: none; border-radius: 6px; background: transparent; cursor: pointer; font-size: 1rem; }
.icon-action.danger:hover { background: #fef2f2; }
.confirmation-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 20px; background: rgba(17, 24, 39, 0.45); }
.confirmation-dialog { width: min(100%, 420px); padding: 24px; border-radius: 10px; background: white; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18); }
.confirmation-dialog h3 { margin: 0 0 8px; color: #1f2937; }
.confirmation-dialog p { margin: 0 0 20px; color: #6b7280; }
.confirmation-actions { display: flex; justify-content: flex-end; gap: 10px; }
.confirmation-actions button { padding: 9px 14px; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; }
.btn-cancel { background: white; color: #374151; }
.btn-confirm-delete { background: #dc2626; color: white; border-color: #dc2626 !important; }

@media print {
  @page { size: 80mm auto; margin: 0; }

  :global(html), :global(body) { width: 80mm; margin: 0; padding: 0; background: white; }
  :global(.topbar), :global(.sidebar), :global(.hamburger), :global(.content) { box-shadow: none !important; }
  :global(.topbar), :global(.sidebar), :global(.hamburger) { display: none !important; }
  :global(.content) { padding: 0 !important; }

  .btn-back, .manager-actions, .btn-print, .btn-refresh-detail, .confirmation-backdrop, .payment-history { display: none !important; }
  .invoice-detail {
    width: 80mm;
    max-width: 80mm;
    min-height: auto;
    box-sizing: border-box;
    margin: 0;
    padding: 5mm 4mm;
    border-radius: 0;
    box-shadow: none;
    color: #000;
    font-family: "Courier New", monospace;
    font-size: 10px;
  }
  .head { display: block; margin-bottom: 4mm; text-align: center; }
  .head h2 { margin: 0 0 2mm; font-size: 16px; }
  .head p { margin: 1mm 0; color: #000; }
  .invoice-agent { display: none !important; }
  .status { display: inline-block; margin-top: 1mm; padding: 0; background: none !important; color: #000 !important; font-size: 10px; }
  .items { table-layout: fixed; margin-bottom: 4mm; }
  .items th, .items td { padding: 1.5mm 0; border-bottom: 1px dashed #000; color: #000; font-size: 10px; }
  .items th { background: none; font-weight: 700; }
  .items th:first-child, .items td:first-child { width: 45%; text-align: left; overflow-wrap: anywhere; }
  .items th:nth-child(2), .items td:nth-child(2) { width: 13%; text-align: center; }
  .items th:nth-child(3), .items td:nth-child(3) { width: 21%; text-align: right; }
  .items th:nth-child(4), .items td:nth-child(4) { width: 21%; text-align: right; }
  .items tfoot td { border-top: 1px solid #000; border-bottom: none; padding-top: 2mm; }
  .items tfoot tr + tr td { border-top: none; padding-top: 1mm; }
}
</style>
