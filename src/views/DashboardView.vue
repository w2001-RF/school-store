<template>
  <div class="dashboard">
    <h2>Bonjour, {{ auth.user?.fullName }} 👋</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.products }}</div>
          <div class="stat-label">{{ $t('dashboard.products') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏷️</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.categories }}</div>
          <div class="stat-label">{{ $t('dashboard.categories') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🧾</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.invoices }}</div>
          <div class="stat-label">{{ $t('dashboard.invoices') }}</div>
        </div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-icon">💰</div>
        <div class="stat-info">
          <div class="stat-value">{{ formatMoney(stats.totalRevenue) }}</div>
          <div class="stat-label">{{ $t('dashboard.revenue') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-info"><div class="stat-value">{{ stats.clients }}</div><div class="stat-label">{{ $t('dashboard.clients') }}</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-info"><div class="stat-value">{{ stats.pending }}</div><div class="stat-label">{{ $t('dashboard.pending') }}</div></div>
      </div>
    </div>
    <div class="quick-actions">
      <router-link to="/invoices/new" class="action-card">
        <span class="action-icon">➕</span>
        <span>{{ $t('dashboard.createInvoice') }}</span>
      </router-link>
      <router-link v-if="auth.isManager" to="/products" class="action-card">
        <span class="action-icon">📦</span>
        <span>{{ $t('dashboard.manageProducts') }}</span>
      </router-link>
      <router-link to="/invoices" class="action-card">
        <span class="action-icon">📋</span>
        <span>{{ $t('dashboard.history') }}</span>
      </router-link>
      <router-link v-if="auth.isManager" to="/clients" class="action-card">
        <span class="action-icon">👥</span><span>{{ $t('dashboard.manageClients') }}</span>
      </router-link>
    </div>
    <section class="history">
      <div class="section-head"><h3>{{ $t('actions.recent') }}</h3><div class="section-actions"><button type="button" :disabled="loading" :title="$t('actions.refresh')" @click="refreshDashboard">↻ {{ $t('actions.refresh') }}</button><router-link to="/invoices">{{ $t('actions.viewAll') }}</router-link></div></div>
      <div v-if="recentInvoices.length === 0" class="empty">{{ $t('dashboard.noInvoices') }}</div>
      <div v-else class="invoice-list">
        <router-link v-for="invoice in recentInvoices" :key="invoice.id" :to="`/invoices/${invoice.id}`" class="invoice-row">
          <span><strong>{{ invoice.invoice_number }}</strong><small>{{ invoice.customer_name || 'Client non renseigné' }}</small></span>
          <span>{{ formatMoney(invoice.total_amount) }}</span>
          <span class="status" :class="invoice.status">{{ statusLabel(invoice.status) }}</span>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { db } from '../services/database/index.js'
import { formatMoney } from '../utils/format.js'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const { t } = useI18n()
const stats = ref({ products: 0, categories: 0, clients: 0, invoices: 0, pending: 0, totalRevenue: 0 })
const recentInvoices = ref([])
const loading = ref(false)

onMounted(refreshDashboard)

async function refreshDashboard() {
  loading.value = true
  try {
  stats.value.products = await db.count('products')
  stats.value.categories = await db.count('categories')
  stats.value.clients = await db.count('clients')
  const invoices = await db.find('invoices')
  recentInvoices.value = invoices.slice(0, 8)
  stats.value.invoices = invoices.length
  stats.value.pending = invoices.filter(invoice => invoice.status === 'pending').length
  stats.value.totalRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total_amount), 0)
  } finally { loading.value = false }
}

function statusLabel(status) {
  const key = { paid: 'status.paid', pending: 'status.pending', cancelled: 'status.cancelled' }[status]
  return key ? t(key) : status
}
</script>

<style scoped>
.dashboard h2 { margin: 0 0 20px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card {
  background: white; padding: 20px; border-radius: 12px; display: flex; gap: 16px;
  align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.stat-card.highlight { background: linear-gradient(135deg, #10b981, #059669); color: white; }
.stat-icon { font-size: 2.5rem; }
.stat-value { font-size: 1.6rem; font-weight: 700; }
.stat-label { font-size: 0.85rem; opacity: 0.8; }
.quick-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.action-card {
  background: white; padding: 20px; border-radius: 12px; text-decoration: none; color: #1f2937;
  display: flex; align-items: center; gap: 12px; font-weight: 500;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: transform 0.2s;
}
.action-card:hover { transform: translateY(-2px); }
.action-icon { font-size: 1.5rem; }
.history { margin-top: 24px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-head h3 { margin: 0; }
.section-head a { color: #3b82f6; text-decoration: none; }
.section-actions { display: flex; align-items: center; gap: 12px; }
.section-actions button { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; background: white; color: #374151; cursor: pointer; }
.section-actions button:disabled { cursor: wait; opacity: .55; }
.invoice-list { display: grid; gap: 8px; }
.invoice-row { display: grid; grid-template-columns: 1fr auto auto; gap: 16px; align-items: center; padding: 12px; color: #1f2937; text-decoration: none; border: 1px solid #e5e7eb; border-radius: 8px; }
.invoice-row:hover { background: #f9fafb; }
.invoice-row span:first-child { display: flex; flex-direction: column; gap: 3px; }
.invoice-row small { color: #6b7280; }
.status { padding: 3px 9px; border-radius: 12px; font-size: .75rem; font-weight: 600; }
.status.paid { background: #d1fae5; color: #065f46; }
.status.pending { background: #fef3c7; color: #92400e; }
.status.cancelled { background: #fee2e2; color: #991b1b; }
.empty { padding: 20px; color: #6b7280; text-align: center; }
@media (max-width: 640px) { .invoice-row { grid-template-columns: 1fr auto; } .invoice-row .status { grid-column: 1 / -1; justify-self: start; } }
</style>
