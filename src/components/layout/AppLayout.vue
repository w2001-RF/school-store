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
  background: rgba(255,255,255,.9); padding: 16px 28px; display: flex; align-items: center; gap: 18px;
  border-bottom: 1px solid var(--line); backdrop-filter: blur(14px); position: sticky; top: 0; z-index: 10;
}
.hamburger {
  background: none; border: none; font-size: 24px; cursor: pointer;
  display: none; padding: 4px 8px;
}
.topbar-title { font-size: 1.3rem; margin: 0; flex: 1; color: var(--ink); }
.user-info { display: flex; align-items: center; gap: 12px; }
.language-picker { display: flex; align-items: center; gap: 4px; }
.language-picker select { max-width: 105px; padding: 7px; border: 1px solid var(--line); border-radius: 8px; background: white; color: var(--ink); }
.user-name { font-weight: 500; }
.role-badge {
  padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;
  text-transform: uppercase;
}
.role-badge.manager { background: #fff0ca; color: #8a5e10; }
.role-badge.agent { background: #d9f2ed; color: var(--teal-dark); }
.btn-icon {
  background: white; border: 1px solid var(--line); padding: 8px 11px; cursor: pointer;
  border-radius: 9px; font-size: 1.1rem;
}
.btn-icon:hover { background: #edf6f4; transform: translateY(-1px); }
.content { width: 100%; max-width: 1440px; margin: 0 auto; padding: 30px 34px 48px; flex: 1; background: var(--paper); }

@media (max-width: 768px) {
  .hamburger { display: block; }
  .user-name { display: none; }
  .topbar { padding: 13px 16px; }
  .content { padding: 20px 16px 32px; }
}
</style>
