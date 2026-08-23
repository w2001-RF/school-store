<template>
  <div class="invoice-create">
    <div class="lines">
      <InvoiceItemRow
        v-for="(line, i) in invoices.current?.lines || []"
        :key="line.product_id"
        :line="line"
        :max-stock="getMaxStock(line)"
        :compact="isMobile"
        @update:line="changes => invoices.updateLine(i, changes)"
        @remove="invoices.removeLine(i)"
      />
    </div>
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
              <input
                v-model="productSearch"
                @keydown.enter.prevent="addSearchProduct"
                :placeholder="$t('invoiceCreate.productSearch')"
                class="customer-input"
              />
              <div v-if="productSearch && productMatches.length" class="product-results">
                <button
                  v-for="product in productMatches"
                  :key="product.id"
                  type="button"
                  class="product-result"
                  @click="addProduct(product)"
                >
                  <span>{{ product.name }}</span>
                  <small>{{ product.barcode }} · {{ formatMoney(product.price) }}</small>
                </button>
              </div>
              <input v-model="clientSearch" :placeholder="$t('invoiceCreate.clientSearch')" class="customer-input" />
              <button v-if="invoices.current?.client_id" type="button" class="clear-client" @click="clearClient">{{ $t('clientsView.noClient') }}</button>
              <div v-if="clientSearch && clientMatches.length" class="product-results">
                <button v-for="client in clientMatches" :key="client.id" type="button" class="product-result" @click="selectClient(client)">
                  <span>{{ client.name }}</span>
                  <small>{{ client.email || client.phone || 'Client' }}<template v-if="client.discount_percent"> · -{{ client.discount_percent }}%</template></small>
                </button>
              </div>
              <div v-if="invoices.current?.client_id" class="selected-client">
                {{ $t('invoiceCreate.selectedClient', { name: clientSearch }) }}
              </div>
              <input v-model="customerName" :placeholder="$t('invoiceCreate.customerName')" class="customer-input" />
            </div>
            <button class="btn-secondary" @click="clearCart" :disabled="!invoices.current?.lines.length">
              {{ $t('invoiceCreate.clear') }}
            </button>
          </div>

          <div v-if="!invoices.current?.lines.length" class="empty-cart">
            <p>🛒 {{ $t('invoiceCreate.empty') }}</p>
            <p class="hint">{{ $t('invoiceCreate.scanHint') }}</p>
          </div>
          <div v-else class="lines">
            <div v-for="(line, i) in invoices.current.lines" :key="i" class="line">
              <div class="line-info">
                <div class="line-name">{{ line.product_name }}</div>
                <div class="line-barcode">{{ line.product_barcode }}</div>
              </div>
              <div class="line-controls">
                <div class="qty">
                  <button @click="changeQty(i, -1)">−</button>
                  <input type="number" :value="line.quantity" min="1" @change="setQty(i, $event.target.value)" />
                  <button @click="changeQty(i, 1)">+</button>
                </div>
                <div class="price-control">
                  <input type="number" :value="line.unit_price" step="0.01" min="0"
                         @change="setPrice(i, $event.target.value)" />
                </div>
                <div class="line-total">{{ formatMoney(line.total_price) }}</div>
                <button class="btn-remove" @click="invoices.removeLine(i)">🗑️</button>
              </div>
            </div>
          </div>

          <div v-if="invoices.current?.lines.length" class="totals">
            <div class="total-row">
              <span>Sous-total</span>
              <span>{{ formatMoney(invoices.currentTotal) }}</span>
            </div>
            <div class="total-row grand">
              <span>TOTAL</span>
              <span>{{ formatMoney(invoices.currentTotal) }}</span>
            </div>
          </div>

          <button v-if="invoices.current?.lines.length" class="btn-pay" @click="showPayment = true">
            💳 Procéder au paiement
          </button>
        </div>
      </div>
    </div>

    <Modal v-if="showPayment" @close="showPayment = false" :title="$t('invoiceCreate.payment')">
      <div class="payment-summary">
        <div class="total-display">{{ formatMoney(invoices.currentTotal) }}</div>
        <div class="form-group">
          <label>{{ $t('invoiceCreate.received') }}</label>
          <input v-model.number="paidAmount" type="number" step="0.01" min="0" autofocus />
        </div>
        <div v-if="paidAmount >= invoices.currentTotal" class="change-display">
          {{ $t('invoiceCreate.change') }} : <strong>{{ formatMoney(paidAmount - invoices.currentTotal) }}</strong>
        </div>
        <div v-else class="remain-display">
          {{ $t('invoiceCreate.remaining') }} : <strong>{{ formatMoney(invoices.currentTotal - paidAmount) }}</strong>
        </div>
        <div class="quick-amounts">
          <button v-for="a in quickAmounts" :key="a" @click="paidAmount = a" class="quick-btn">
            {{ formatMoney(a) }}
          </button>
        </div>
        <div class="form-actions">
          <button class="btn-secondary" @click="showPayment = false">{{ $t('common.cancel') }}</button>
          <button class="btn-primary" :disabled="paidAmount < 0" @click="confirmPayment">
            {{ $t('invoiceCreate.validate') }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useInvoicesStore } from '../stores/invoices.js'
import { useProductsStore } from '../stores/products.js'
import { useClientsStore } from '../stores/clients.js'
import { formatMoney } from '../utils/format.js'
import BarcodeScanner from '../components/scanner/BarcodeScanner.vue'
import Modal from '../components/common/Modal.vue'
import InvoiceItemRow from '../components/invoices/InvoiceItemRow.vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const invoices = useInvoicesStore()
const products = useProductsStore()
const clients = useClientsStore()
const { t } = useI18n()
const isMobile = ref(false)
const lastError = ref('')
const productSearch = ref('')
const clientSearch = ref('')
const customerName = computed({
  get: () => invoices.current?.customer_name || '',
  set: v => invoices.current && (invoices.current.customer_name = v)
})

const showPayment = ref(false)
const paidAmount = ref(0)
const quickAmounts = computed(() => {
  const total = invoices.currentTotal || 0
  const arr = [total, Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, Math.ceil(total / 100) * 200]
  return [...new Set(arr)].filter(x => x >= total)
})

const productMatches = computed(() => {
  const search = productSearch.value.trim().toLowerCase()
  if (!search) return []
  return products.items.filter(product =>
    product.name.toLowerCase().includes(search) ||
    (product.barcode || '').toLowerCase().includes(search)
  ).slice(0, 6)
})

const clientMatches = computed(() => {
  const search = clientSearch.value.trim().toLowerCase()
  if (!search) return []
  return clients.items.filter(client =>
    [client.name, client.email, client.phone].some(value => (value || '').toLowerCase().includes(search))
  ).slice(0, 6)
})

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  invoices.newDraft()
  await Promise.all([products.fetchAll(), clients.fetchAll()])
  const passager = clients.items.find(client => client.name.toLowerCase() === 'passager')
  if (passager) await selectClient(passager)
})
onBeforeUnmount(() => { window.removeEventListener('resize', checkMobile) })

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
    productSearch.value = ''
    lastError.value = ''
  } catch (e) { lastError.value = e.message }
}

async function addSearchProduct() {
  const product = productMatches.value[0]
  if (product) await addProduct(product)
}

async function selectClient(client) {
  await invoices.applyClientPricing(client.id)
  clientSearch.value = client.name
  customerName.value = client.name
}

async function clearClient() {
  await invoices.applyClientPricing(null)
  clientSearch.value = ''
  customerName.value = ''
}

function changeQty(i, delta) {
  const line = invoices.current.lines[i]
  const newQty = Math.max(1, line.quantity + delta)
  invoices.updateLine(i, { quantity: newQty })
}

function setQty(i, v) {
  invoices.updateLine(i, { quantity: Math.max(1, parseInt(v) || 1) })
}

function setPrice(i, v) {
  invoices.updateLine(i, { unit_price: Math.max(0, parseFloat(v) || 0) })
}

function clearCart() {
  if (confirm('Vider le panier ?')) invoices.newDraft()
}

function confirmPayment() {
  invoices.validate({ paid_amount: paidAmount.value })
    .then(() => {
      showPayment.value = false
      alert(`✅ ${t('invoiceCreate.success')}`)
      router.push('/invoices')
    })
    .catch(e => alert('❌ ' + e.message))
}

function checkMobile() {
  isMobile.value = window.innerWidth < 640
}

</script>

<style scoped>
.invoice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.invoice-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.invoice-head { display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px; gap: 12px; }
.invoice-head h2 { margin: 0 0 8px; font-size: 1.2rem; }
.customer-input { width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 8px; }
.product-results { display: flex; flex-direction: column; margin: -4px 0 8px; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
.product-result { display: flex; justify-content: space-between; gap: 12px; padding: 8px 10px; border: none; border-bottom: 1px solid #e5e7eb; background: white; text-align: left; cursor: pointer; }
.product-result:last-child { border-bottom: none; }
.product-result:hover { background: #f3f4f6; }
.product-result small { color: #6b7280; }
.clear-client { margin: -4px 0 8px; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb; color: #4b5563; cursor: pointer; }
.selected-client { margin: -4px 0 8px; color: #059669; font-size: 0.85rem; }
.btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.empty-cart { text-align: center; padding: 40px 20px; color: #6b7280; }
.empty-cart .hint { font-size: 0.85rem; }
.lines { display: flex; flex-direction: column; gap: 10px; max-height: 50vh; overflow-y: auto; margin-bottom: 16px; }
.line { padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; }
.line-name { font-weight: 500; }
.line-barcode { font-size: 0.8rem; color: #6b7280; }
.line-controls { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.qty { display: flex; align-items: center; gap: 4px; }
.qty button { width: 28px; height: 28px; border: 1px solid #d1d5db; background: white; border-radius: 4px; cursor: pointer; }
.qty input { width: 50px; text-align: center; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; }
.price-control input { width: 80px; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; }
.line-total { font-weight: 600; color: #3b82f6; min-width: 70px; text-align: right; }
.btn-remove { background: none; border: none; cursor: pointer; padding: 4px; }
.totals { border-top: 2px solid #e5e7eb; padding-top: 12px; margin-bottom: 16px; }
.total-row { display: flex; justify-content: space-between; padding: 4px 0; }
.total-row.grand { font-size: 1.2rem; font-weight: 700; color: #3b82f6; border-top: 1px dashed #d1d5db; padding-top: 8px; margin-top: 4px; }
.btn-pay { width: 100%; padding: 14px; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
.error-msg { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 6px; margin-top: 10px; }
.payment-summary { text-align: center; }
.total-display { font-size: 2.5rem; font-weight: 700; color: #3b82f6; margin-bottom: 16px; }
.form-group { text-align: left; margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 500; }
.form-group input { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; box-sizing: border-box; }
.change-display { color: #059669; font-size: 1.1rem; margin: 12px 0; }
.remain-display { color: #dc2626; font-size: 1.1rem; margin: 12px 0; }
.quick-amounts { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin: 12px 0; }
.quick-btn { padding: 6px 12px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: 500; }

@media (max-width: 900px) {
  .invoice-grid { grid-template-columns: 1fr; }
}
</style>
