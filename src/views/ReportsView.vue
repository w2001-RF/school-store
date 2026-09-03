<template>
  <div class="reports-view">
    <h2>📊 {{ $t('reports.title') }}</h2>
    <div class="filters">
      <div class="preset-buttons">
        <button type="button" class="btn-secondary" :class="{ active: preset === '7d' }" @click="applyPreset('7d')">{{ $t('reports.last7Days') }}</button>
        <button type="button" class="btn-secondary" :class="{ active: preset === 'month' }" @click="applyPreset('month')">{{ $t('reports.thisMonth') }}</button>
        <button type="button" class="btn-secondary" :class="{ active: preset === 'all' }" @click="applyPreset('all')">{{ $t('reports.allTime') }}</button>
      </div>
      <label>{{ $t('reports.dateFrom') }} <input v-model="dateFrom" type="date" @change="preset = 'custom'" /></label>
      <label>{{ $t('reports.dateTo') }} <input v-model="dateTo" type="date" @change="preset = 'custom'" /></label>
      <button class="btn-secondary refresh-button" type="button" :disabled="loading" :title="$t('actions.refresh')" @click="refresh">↻ {{ $t('actions.refresh') }}</button>
    </div>

    <div v-if="loading" class="empty">{{ $t('common.loading') }}</div>
    <template v-else>
      <div class="stats-grid">
        <div class="stat-card highlight">
          <div class="stat-icon">💰</div>
          <div class="stat-info"><div class="stat-value">{{ formatMoney(summary.totalRevenue) }}</div><div class="stat-label">{{ $t('reports.totalRevenue') }}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🧾</div>
          <div class="stat-info"><div class="stat-value">{{ summary.invoiceCount }}</div><div class="stat-label">{{ $t('reports.invoiceCount') }}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-info"><div class="stat-value">{{ formatMoney(summary.averageSale) }}</div><div class="stat-label">{{ $t('reports.averageSale') }}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info"><div class="stat-value">{{ formatMoney(summary.outstandingBalance) }}</div><div class="stat-label">{{ $t('reports.outstandingBalance') }}</div></div>
        </div>
      </div>

      <section class="report-table">
        <div class="section-head">
          <h3>{{ $t('reports.topProducts') }}</h3>
          <button type="button" class="btn-secondary" :disabled="!topProducts.length" @click="exportProductsCsv">📥 {{ $t('reports.exportCsv') }}</button>
        </div>
        <p v-if="!topProducts.length" class="empty">{{ $t('reports.noData') }}</p>
        <table v-else class="data-table">
          <thead><tr><th>{{ $t('reports.product') }}</th><th>{{ $t('reports.quantitySold') }}</th><th>{{ $t('reports.revenue') }}</th></tr></thead>
          <tbody>
            <tr v-for="row in topProducts" :key="row.productId">
              <td>{{ row.name }}</td>
              <td>{{ row.quantity }}</td>
              <td>{{ formatMoney(row.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="report-table">
        <h3>{{ $t('reports.topClients') }}</h3>
        <p v-if="!topClients.length" class="empty">{{ $t('reports.noData') }}</p>
        <table v-else class="data-table">
          <thead><tr><th>{{ $t('reports.client') }}</th><th>{{ $t('reports.invoiceCount') }}</th><th>{{ $t('reports.revenue') }}</th></tr></thead>
          <tbody>
            <tr v-for="row in topClients" :key="row.name">
              <td>{{ row.name }}</td>
              <td>{{ row.invoiceCount }}</td>
              <td>{{ formatMoney(row.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="report-table">
        <h3>{{ $t('reports.salesByAgent') }}</h3>
        <p v-if="!salesByAgent.length" class="empty">{{ $t('reports.noData') }}</p>
        <table v-else class="data-table">
          <thead><tr><th>{{ $t('reports.agent') }}</th><th>{{ $t('reports.invoiceCount') }}</th><th>{{ $t('reports.revenue') }}</th></tr></thead>
          <tbody>
            <tr v-for="row in salesByAgent" :key="row.name">
              <td>{{ row.name }}</td>
              <td>{{ row.invoiceCount }}</td>
              <td>{{ formatMoney(row.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '../services/database/index.js'
import { formatMoney, remainingAmount } from '../utils/format.js'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const loading = ref(false)
const invoices = ref([])
const invoiceItems = ref([])
const preset = ref('month')
const dateFrom = ref('')
const dateTo = ref('')

onMounted(() => {
  applyPreset('month')
})

function toDateInput(date) {
  return date.toISOString().slice(0, 10)
}

function applyPreset(value) {
  preset.value = value
  const now = new Date()
  if (value === '7d') {
    const from = new Date(now)
    from.setDate(from.getDate() - 6)
    dateFrom.value = toDateInput(from)
    dateTo.value = toDateInput(now)
  } else if (value === 'month') {
    dateFrom.value = toDateInput(new Date(now.getFullYear(), now.getMonth(), 1))
    dateTo.value = toDateInput(now)
  } else if (value === 'all') {
    dateFrom.value = ''
    dateTo.value = ''
  }
  refresh()
}

async function refresh() {
  loading.value = true
  try {
    const [allInvoices, allItems] = await Promise.all([
      db.find('invoices'),
      db.find('invoice_items')
    ])
    invoices.value = allInvoices
    invoiceItems.value = allItems
  } finally {
    loading.value = false
  }
}

const filteredInvoices = computed(() => {
  const from = dateFrom.value ? new Date(dateFrom.value) : null
  const to = dateTo.value ? new Date(`${dateTo.value}T23:59:59`) : null
  return invoices.value.filter(invoice => {
    const created = new Date(invoice.created_at)
    if (from && created < from) return false
    if (to && created > to) return false
    return true
  })
})

const paidInvoices = computed(() => filteredInvoices.value.filter(invoice => invoice.status === 'paid'))

const summary = computed(() => {
  const totalRevenue = paidInvoices.value.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)
  const invoiceCount = filteredInvoices.value.length
  const outstandingBalance = filteredInvoices.value
    .filter(invoice => invoice.status !== 'cancelled')
    .reduce((sum, invoice) => sum + remainingAmount(invoice), 0)
  return {
    totalRevenue,
    invoiceCount,
    averageSale: paidInvoices.value.length ? totalRevenue / paidInvoices.value.length : 0,
    outstandingBalance
  }
})

const topProducts = computed(() => {
  const paidIds = new Set(paidInvoices.value.map(invoice => invoice.id))
  const totals = new Map()
  for (const item of invoiceItems.value) {
    if (!paidIds.has(item.invoice_id)) continue
    const key = item.product_id || item.product_name
    const entry = totals.get(key) || { productId: key, name: item.product_name, quantity: 0, revenue: 0 }
    entry.quantity += Number(item.quantity || 0)
    entry.revenue += Number(item.total_price || 0)
    totals.set(key, entry)
  }
  return [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10)
})

const topClients = computed(() => {
  const totals = new Map()
  for (const invoice of paidInvoices.value) {
    const name = invoice.customer_name || t('clientsView.noClient')
    const entry = totals.get(name) || { name, invoiceCount: 0, revenue: 0 }
    entry.invoiceCount += 1
    entry.revenue += Number(invoice.total_amount || 0)
    totals.set(name, entry)
  }
  return [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10)
})

const salesByAgent = computed(() => {
  const totals = new Map()
  for (const invoice of paidInvoices.value) {
    const name = invoice.agent_name || '—'
    const entry = totals.get(name) || { name, invoiceCount: 0, revenue: 0 }
    entry.invoiceCount += 1
    entry.revenue += Number(invoice.total_amount || 0)
    totals.set(name, entry)
  }
  return [...totals.values()].sort((a, b) => b.revenue - a.revenue)
})

function exportProductsCsv() {
  const header = [t('reports.product'), t('reports.quantitySold'), t('reports.revenue')]
  const rows = topProducts.value.map(row => [row.name, row.quantity, row.revenue.toFixed(2)])
  const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `top-products-${dateFrom.value || 'all'}_${dateTo.value || 'all'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.filters { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.preset-buttons { display: flex; gap: 8px; }
.filters label { display: flex; flex-direction: column; gap: 4px; font-size: .85rem; color: #4b5563; }
.filters input[type="date"] { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 9px 14px; border-radius: 8px; cursor: pointer; }
.btn-secondary.active { background: #3b82f6; color: white; }
.btn-secondary:disabled { opacity: .5; cursor: not-allowed; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: white; padding: 20px; border: 1px solid var(--line); border-radius: var(--radius); display: flex; gap: 16px; align-items: center; box-shadow: var(--shadow); }
.stat-card.highlight { background: linear-gradient(135deg, #ef765d, #d95d4f); color: white; border-color: transparent; }
.stat-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 12px; background: #e7f4f1; font-size: 1.65rem; }
.highlight .stat-icon { background: rgba(255,255,255,.18); }
.stat-value { font-size: 1.5rem; font-weight: 700; }
.stat-label { font-size: 0.85rem; opacity: 0.8; }
.report-table { background: white; padding: 20px; border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); margin-bottom: 20px; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-head h3, .report-table > h3 { margin: 0 0 12px; }
.section-head h3 { margin: 0; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
.empty { text-align: center; padding: 24px; color: #6b7280; }
</style>
