<template>
  <div class="app-layout">
    <Sidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div class="main-area">
      <header class="topbar">
        <button class="hamburger" @click="sidebarOpen = !sidebarOpen">☰</button>
        <h1 class="topbar-title">{{ pageTitle }}</h1>
        <div class="user-info" v-if="auth.user">
          <label class="language-picker" :title="$t('language')">
            <span aria-hidden="true">🌐</span>
            <select :value="locale" :aria-label="$t('language')" @change="changeLocale($event.target.value)">
              <option v-for="code in supportedLocales" :key="code" :value="code">{{ $t(`languages.${code}`) }}</option>
            </select>
          </label>
          <span class="user-name">{{ auth.user.fullName }}</span>
          <span class="role-badge" :class="auth.user.role">{{ auth.user.role }}</span>
          <button class="btn-icon" @click="logout" :title="$t('actions.logout')">⎋</button>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import Sidebar from './Sidebar.vue'
import { setLocale, supportedLocales } from '../../i18n/index.js'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { t, locale } = useI18n()
const sidebarOpen = ref(false)

const titleKeys = {
  dashboard: 'pages.dashboard', products: 'pages.products', categories: 'pages.categories', clients: 'pages.clients',
  'invoice-new': 'pages.newInvoice', invoices: 'pages.invoices', 'invoice-detail': 'pages.detail'
}
const pageTitle = computed(() => t(titleKeys[route.name] || ''))

function changeLocale(nextLocale) {
  setLocale(nextLocale)
}

async function logout() {
  await auth.signOut()
  router.push('/login')
}
</script>

<style scoped>
.app-layout { display: flex; min-height: 100vh; }
.main-area { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar {
  background: white; padding: 12px 20px; display: flex; align-items: center; gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 10;
}
.hamburger {
  background: none; border: none; font-size: 24px; cursor: pointer;
  display: none; padding: 4px 8px;
}
.topbar-title { font-size: 1.25rem; margin: 0; flex: 1; }
.user-info { display: flex; align-items: center; gap: 12px; }
.language-picker { display: flex; align-items: center; gap: 4px; }
.language-picker select { max-width: 105px; padding: 5px; border: 1px solid #e5e7eb; border-radius: 6px; background: white; }
.user-name { font-weight: 500; }
.role-badge {
  padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;
  text-transform: uppercase;
}
.role-badge.manager { background: #dbeafe; color: #1e40af; }
.role-badge.agent { background: #dcfce7; color: #166534; }
.btn-icon {
  background: none; border: 1px solid #e5e7eb; padding: 6px 10px; cursor: pointer;
  border-radius: 6px; font-size: 1.1rem;
}
.btn-icon:hover { background: #f3f4f6; }
.content { padding: 24px; flex: 1; background: #f9fafb; }

@media (max-width: 768px) {
  .hamburger { display: block; }
  .user-name { display: none; }
  .content { padding: 16px; }
}
</style>
