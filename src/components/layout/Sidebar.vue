<template>
  <aside class="sidebar" :class="{ open, rtl: isRTL }">
    <div class="brand">
      <svg class="logo" viewBox="0 0 48 48" aria-hidden="true"><path d="M8 12c7-3 15-2 21 3v24c-6-5-14-6-21-3V12Zm32 0c-7-3-15-2-21 3v24c6-5 14-6 21-3V12Z" /><path d="M24 15v24" /></svg>
      <span><strong class="brand-name">{{ $t('brand.name') }}</strong><small>{{ $t('brand.tagline') }}</small></span>
    </div>
    <nav class="nav" aria-label="Menu principal">
      <router-link to="/dashboard" class="nav-item" @click="$emit('close')">
        <span aria-hidden="true">🏠</span> {{ $t('nav.dashboard') }}
      </router-link>
      <router-link v-if="auth.isManager" to="/products" class="nav-item" @click="$emit('close')">
        <span aria-hidden="true">📦</span> {{ $t('nav.products') }}
      </router-link>
      <router-link v-if="auth.isManager" to="/categories" class="nav-item" @click="$emit('close')">
        <span aria-hidden="true">🏷️</span> {{ $t('nav.categories') }}
      </router-link>
      <router-link v-if="auth.isManager" to="/clients" class="nav-item" @click="$emit('close')">
        <span aria-hidden="true">👥</span> {{ $t('nav.clients') }}
      </router-link>
      <router-link v-if="auth.isManager" to="/reports" class="nav-item" @click="$emit('close')">
        <span aria-hidden="true">📊</span> {{ $t('nav.reports') }}
      </router-link>
      <router-link v-if="auth.isManager" to="/team" class="nav-item" @click="$emit('close')">
        <span aria-hidden="true">👥</span> {{ $t('nav.team') }}
      </router-link>
      <router-link to="/invoices/new" class="nav-item" @click="$emit('close')">
        <span aria-hidden="true">🧾</span> {{ $t('nav.newInvoice') }}
      </router-link>
      <router-link to="/invoices" class="nav-item" @click="$emit('close')">
        <span aria-hidden="true">📋</span> {{ $t('nav.invoices') }}
      </router-link>
    </nav>
  </aside>
  <div v-if="open" class="backdrop" @click="$emit('close')"></div>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth.js'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps({ open: Boolean })
defineEmits(['close'])
const auth = useAuthStore()
const { locale } = useI18n()
const isRTL = computed(() => locale.value === 'ar')
</script>

<style scoped>
.sidebar {
  width: 250px; background: var(--teal-dark); color: white;
  display: flex; flex-direction: column; flex-shrink: 0;
}
.brand {
  padding: 24px 20px; display: flex; align-items: center; gap: 12px;
  font-size: 1.1rem; font-weight: 700;
  border-bottom: 1px solid rgba(255,255,255,.14);
}
.logo { width: 32px; height: 32px; fill: none; stroke: #f5c86b; stroke-linecap: round; stroke-linejoin: round; stroke-width: 3; }
.brand-name { display: block; }
.brand small { display: block; margin-top: 3px; color: #a8d6d1; font-size: .72rem; font-weight: 400; letter-spacing: .04em; text-transform: uppercase; }

:root[dir='rtl'] .brand {
  flex-direction: row-reverse;
}
.nav { display: flex; flex-direction: column; padding: 12px 0; flex: 1; }
.nav-item {
  margin: 3px 12px; padding: 13px 14px; color: #c3e0dc; text-decoration: none;
  display: flex; align-items: center; gap: 12px;
  border-radius: 10px;
}
.nav-item:hover { background: rgba(255,255,255,.1); color: white; transform: translateX(3px); }
.nav-item.router-link-exact-active { background: #f5c86b; color: #173042; box-shadow: 0 8px 18px rgba(0,0,0,.12); }
.nav-item.highlight { background: #10b981; color: white; margin: 8px 12px; border-radius: 6px; }
.nav-item.highlight:hover { background: #059669; }
.backdrop { display: none; }

:root[dir='rtl'] .nav-item {
  flex-direction: row-reverse;
}

:root[dir='rtl'] .nav-item:hover {
  transform: translateX(-3px);
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; z-index: 100;
    transform: translateX(-100%); transition: transform 0.3s ease;
  }
  .sidebar.open { transform: translateX(0); }
  .sidebar.rtl {
    left: auto; right: 0;
    transform: translateX(100%);
  }
  .sidebar.rtl.open { transform: translateX(0); }
  .backdrop {
    display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99;
  }
}
</style>
