<template>
  <aside class="sidebar" :class="{ open }">
    <div class="brand">
      <span class="logo">📚</span>
      <span class="brand-name">School Store</span>
    </div>
    <nav class="nav">
      <router-link to="/dashboard" class="nav-item" @click="$emit('close')">
        <span>🏠</span> {{ $t('nav.dashboard') }}
      </router-link>
      <router-link v-if="auth.isManager" to="/products" class="nav-item" @click="$emit('close')">
        <span>📦</span> {{ $t('nav.products') }}
      </router-link>
      <router-link v-if="auth.isManager" to="/categories" class="nav-item" @click="$emit('close')">
        <span>🏷️</span> {{ $t('nav.categories') }}
      </router-link>
      <router-link v-if="auth.isManager" to="/clients" class="nav-item" @click="$emit('close')">
        <span>👥</span> {{ $t('nav.clients') }}
      </router-link>
      <router-link to="/invoices/new" class="nav-item" @click="$emit('close')">
        <span>🧾</span> {{ $t('nav.newInvoice') }}
      </router-link>
      <router-link to="/invoices" class="nav-item" @click="$emit('close')">
        <span>📋</span> {{ $t('nav.invoices') }}
      </router-link>
    </nav>
  </aside>
  <div v-if="open" class="backdrop" @click="$emit('close')"></div>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth.js'
defineProps({ open: Boolean })
defineEmits(['close'])
const auth = useAuthStore()
</script>

<style scoped>
.sidebar {
  width: 240px; background: #1e293b; color: white;
  display: flex; flex-direction: column; flex-shrink: 0;
}
.brand {
  padding: 20px; display: flex; align-items: center; gap: 10px;
  font-size: 1.1rem; font-weight: 700;
  border-bottom: 1px solid #334155;
}
.logo { font-size: 1.6rem; }
.nav { display: flex; flex-direction: column; padding: 12px 0; flex: 1; }
.nav-item {
  padding: 12px 20px; color: #cbd5e1; text-decoration: none;
  display: flex; align-items: center; gap: 12px;
  transition: all 0.15s;
}
.nav-item:hover { background: #334155; color: white; }
.nav-item.router-link-exact-active { background: #3b82f6; color: white; }
.nav-item.highlight { background: #10b981; color: white; margin: 8px 12px; border-radius: 6px; }
.nav-item.highlight:hover { background: #059669; }
.backdrop { display: none; }

@media (max-width: 768px) {
  .sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; z-index: 100;
    transform: translateX(-100%); transition: transform 0.3s;
  }
  .sidebar.open { transform: translateX(0); }
  .backdrop {
    display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99;
  }
}
</style>
