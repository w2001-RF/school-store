<template>
  <div class="invoice-create">
    <div class="invoice-grid">
      <div class="left">
        <BarcodeScanner @scan="onScan" />
        <div v-if="lastError" class="error-msg">⚠️ {{ lastError }}</div>
      </div>
      <div class="right">
        <div class="invoice-card">
          <div class="invoice-head">
            <div>
              <h2>🧾 {{ invoices.current?.invoice_number }}</h2>
              <div class="pos-actions">
                <button type="button" class="btn-secondary" @click="showProductSearch = true">{{ $t('pos.addProduct') }}</button>
                <button type="button" class="btn-secondary" @click="showClientSearch = true">{{ $t('pos.chooseClient') }}</button>
                <button v-if="invoices.current?.client_id" type="button" class="clear-client" @click="clearClient">{{ $t('clientsView.noClient') }}</button>
              </div>
              <div v-if="selectedClientName" class="selected-client">
                {{ $t('invoiceCreate.selectedClient', { name: selectedClientName }) }}
              </div>
              <input v-model="customerName" :placeholder="$t('invoiceCreate.customerName')" class="customer-input" />
            </div>
            <button class="btn-secondary" @click="clearCart" :disabled="!invoices.current?.lines.length">
              {{ $t('pos.clearCart') }}
            </button>
          </div>

          <div v-if="!invoices.current?.lines.length" class="empty-cart">
            <p>🛒 {{ $t('invoiceCreate.empty') }}</p>
            <p class="hint">{{ $t('invoiceCreate.scanHint') }}</p>
          </div>
          <div v-else class="lines">
            <InvoiceItemRow
              v-for="(line, index) in invoices.current.lines"
              :key="line.product_id"
              :line="line"
              :max-stock="getMaxStock(line)"
              :compact="isMobile"
              @update:line="changes => invoices.updateLine(index, changes)"
              @remove="invoices.removeLine(index)"
            />
          </div>

          <PosSummary
            :subtotal="invoices.currentTotal"
            :discount-amount="invoices.currentDiscount"
            :has-items="Boolean(invoices.current?.lines.length)"
            @pay="showPayment = true"
          />
        </div>
      </div>
    </div>

    <PaymentDialog
      v-if="showPayment"
      :subtotal="invoices.currentTotal"
      :initial-discount="invoices.currentDiscount"
      :is-passager="isPassager"
      :submitting="submitting"
      @close="showPayment = false"
      @confirm="confirmPayment"
    />
    <ProductSearchDialog
      v-if="showProductSearch"
      :products="products.items"
      :cart-lines="invoices.current?.lines || []"
      @close="showProductSearch = false"
      @select="addProduct"
    />
    <ClientSearchDialog
      v-if="showClientSearch"
      :clients="clients.items"
      @close="showClientSearch = false"
      @select="selectClient"
    />
    <div v-if="toastMessage" class="mobile-toast" role="status" aria-live="polite">{{ toastMessage }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useInvoicesStore } from '../stores/invoices.js'
import { useProductsStore } from '../stores/products.js'
import { useClientsStore } from '../stores/clients.js'
import BarcodeScanner from '../components/scanner/BarcodeScanner.vue'
import InvoiceItemRow from '../components/invoices/InvoiceItemRow.vue'
import ClientSearchDialog from '../components/pos/ClientSearchDialog.vue'
import PaymentDialog from '../components/pos/PaymentDialog.vue'
import PosSummary from '../components/pos/PosSummary.vue'
import ProductSearchDialog from '../components/pos/ProductSearchDialog.vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const invoices = useInvoicesStore()
const products = useProductsStore()
const clients = useClientsStore()
const { t } = useI18n()
const isMobile = ref(false)
const lastError = ref('')
const customerName = computed({
  get: () => invoices.current?.customer_name || '',
  set: v => invoices.current && (invoices.current.customer_name = v)
})

const showPayment = ref(false)
const showProductSearch = ref(false)
const showClientSearch = ref(false)
const submitting = ref(false)
const toastMessage = ref('')
let toastTimer
const isPassager = computed(() => {
  const client = clients.items.find(client => client.id === invoices.current?.client_id)
  return !client || client.name?.toLowerCase() === 'passager'
})
const selectedClientName = computed(() =>
  clients.items.find(client => client.id === invoices.current?.client_id)?.name || ''
)

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  invoices.newDraft()
  await Promise.all([products.fetchAll(), clients.fetchAll()])
  const passager = clients.items.find(client => client.name.toLowerCase() === 'passager')
  if (passager) await selectClient(passager)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
  clearTimeout(toastTimer)
})

function getMaxStock(line) {
  const p = products.items.find(p => p.id === line.product_id)
  return p?.stock ?? null
}

async function onScan(barcode) {
  lastError.value = ''
  try {
    await invoices.addProductByBarcode(barcode)
  } catch (e) { lastError.value = e.message }
}

async function addProduct(product) {
  try {
    await invoices.addProductByBarcode(product.barcode)
    showProductSearch.value = false
    lastError.value = ''
  } catch (e) { lastError.value = e.message }
}

async function selectClient(client) {
  await invoices.applyClientPricing(client.id)
  customerName.value = client.name
  showClientSearch.value = false
}

async function clearClient() {
  await invoices.applyClientPricing(null)
  customerName.value = ''
}

function clearCart() {
  if (confirm('Vider le panier ?')) invoices.newDraft()
}

async function confirmPayment(payment) {
  if (submitting.value) return
  submitting.value = true
  try {
    const invoice = await invoices.validate(payment)
    showPayment.value = false
    showToast(t('invoiceCreate.success'))
    await router.push({ name: 'invoice-detail', params: { id: invoice.id } })
  } catch (error) {
    showToast(error.message)
  } finally {
    submitting.value = false
  }
}

function showToast(message) {
  toastMessage.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 3200)
}

function checkMobile() {
  isMobile.value = window.innerWidth <= 450
}

</script>

<style scoped>
.invoice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.invoice-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.invoice-head { display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px; gap: 12px; }
.invoice-head h2 { margin: 0 0 8px; font-size: 1.2rem; }
.customer-input { width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 8px; }
.pos-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.clear-client { margin: -4px 0 8px; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb; color: #4b5563; cursor: pointer; }
.selected-client { margin: -4px 0 8px; color: #059669; font-size: 0.85rem; }
.btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.empty-cart { text-align: center; padding: 40px 20px; color: #6b7280; }
.empty-cart .hint { font-size: 0.85rem; }
.lines { display: flex; flex-direction: column; gap: 10px; max-height: 50vh; overflow-y: auto; margin-bottom: 16px; }
.error-msg { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 6px; margin-top: 10px; }
.mobile-toast { position: fixed; left: 50%; bottom: 22px; z-index: 1100; max-width: calc(100vw - 32px); padding: 13px 18px; transform: translateX(-50%); border-radius: 10px; background: #075b60; color: white; box-shadow: 0 10px 24px rgba(7, 91, 96, .25); text-align: center; font-weight: 600; animation: toast-in .2s ease-out; }

@keyframes toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }

@media (max-width: 900px) {
  .invoice-grid { grid-template-columns: 1fr; }
}

@media (max-width: 450px) {
  .invoice-create { padding-bottom: 84px; }
  .invoice-grid { display: flex; flex-direction: column; gap: 12px; }
  .right { order: 1; }
  .left { order: 2; }
  .left :deep(.scanner-wrapper) { box-shadow: none; padding: 12px; }
  .invoice-card { padding: 14px; border-radius: 8px; }
  .invoice-head { display: block; }
  .invoice-head h2 { font-size: 1rem; }
  .pos-actions { display: grid; grid-template-columns: 1fr; }
  .pos-actions .btn-secondary, .clear-client { min-height: 48px; text-align: left; }
  .customer-input { min-height: 44px; font-size: 16px; }
  .lines { max-height: none; }
  :deep(.pos-summary .pay) { position: fixed; right: 16px; bottom: calc(12px + env(safe-area-inset-bottom)); left: 16px; z-index: 20; min-height: 52px; box-shadow: 0 10px 24px rgba(7, 91, 96, .25); }
  .mobile-toast { bottom: calc(76px + env(safe-area-inset-bottom)); }
}
</style>
