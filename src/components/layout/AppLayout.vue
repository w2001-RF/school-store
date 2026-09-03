<template>
  <div class="app-layout">
    <Sidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div class="main-area">
      <header class="topbar">
        <button class="hamburger" @click="sidebarOpen = !sidebarOpen" :aria-label="sidebarOpen ? $t('layout.closeMenu') : $t('layout.openMenu')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <h1 class="topbar-title">{{ pageTitle }}</h1>
        <div class="user-info" v-if="auth.user">
          <label class="language-picker" :title="$t('language')">
            <span aria-hidden="true">🌐</span>
            <select :value="locale" :aria-label="$t('language')" @change="changeLocale($event.target.value)">
              <option v-for="code in supportedLocales" :key="code" :value="code">{{ $t(`languages.${code}`) }}</option>
            </select>
          </label>
          <label class="theme-picker" :title="$t('theme.label')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /><circle cx="12" cy="12" r="4" /></svg>
            <select :value="preference" :aria-label="$t('theme.label')" @change="setTheme($event.target.value)">
              <option value="system">{{ $t('theme.system') }}</option>
              <option value="light">{{ $t('theme.light') }}</option>
              <option value="dark">{{ $t('theme.dark') }}</option>
            </select>
          </label>
          <span class="user-name">{{ auth.user.fullName }}</span>
          <span class="role-badge" :class="auth.user.role">{{ auth.user.role }}</span>
          <router-link to="/profile" class="btn-icon" :title="$t('profile.shortcut')" :aria-label="$t('profile.shortcut')">👤</router-link>
          <router-link v-if="auth.isSuperAdmin" to="/organizations" class="btn-icon" :title="$t('organizations.shortcut')" :aria-label="$t('organizations.shortcut')">🏢</router-link>
          <button class="btn-icon" @click="logout" :title="$t('actions.logout')" :aria-label="$t('actions.logout')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3m8 7v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" /></svg>
          </button>
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
import { useTheme } from '../../composables/useTheme.js'
import { useTenantStore } from '../../stores/tenant.js'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { t, locale } = useI18n()
const { preference, setTheme } = useTheme()
const tenant = useTenantStore()
const sidebarOpen = ref(false)
const isRTL = computed(() => locale.value === 'ar')

const titleKeys = {
  dashboard: 'pages.dashboard', products: 'pages.products', categories: 'pages.categories', clients: 'pages.clients',
  reports: 'pages.reports', team: 'pages.team', organizations: 'organizations.title', profile: 'profile.title', 'invoice-new': 'pages.newInvoice', invoices: 'pages.invoices', 'invoice-detail': 'pages.detail'
}
const pageTitle = computed(() => t(titleKeys[route.name] || ''))

function changeLocale(nextLocale) {
  setLocale(nextLocale)
}

async function logout() {
  await auth.signOut()
  tenant.reset()
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
  background: none; border: none; cursor: pointer;
  display: none; padding: 4px 8px;
}
.hamburger svg, .btn-icon svg, .theme-picker svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; }
.topbar-title { font-size: 1.3rem; margin: 0; flex: 1; color: var(--ink); }
.user-info { display: flex; align-items: center; gap: 12px; }
.language-picker, .theme-picker { display: flex; align-items: center; gap: 4px; }
.language-picker select, .theme-picker select { max-width: 105px; padding: 7px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); color: var(--ink); }
.user-name { font-weight: 500; }
.role-badge {
  padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;
  text-transform: uppercase;
}
.role-badge.manager { background: #fff0ca; color: #8a5e10; }
.role-badge.agent { background: #d9f2ed; color: var(--teal-dark); }
.btn-icon {
  display: inline-grid; place-items: center; background: var(--surface); border: 1px solid var(--line); padding: 8px; cursor: pointer;
  border-radius: 9px; font-size: 1.1rem;
}
.btn-icon:hover { background: #edf6f4; transform: translateY(-1px); }
.content { width: 100%; max-width: 1440px; margin: 0 auto; padding: 30px 34px 48px; flex: 1; background: var(--paper); }

:root[dir='rtl'] .topbar {
  flex-direction: row-reverse;
}

:root[dir='rtl'] .hamburger {
  order: 3;
}

:root[dir='rtl'] .topbar-title {
  order: 2;
  text-align: right;
}

:root[dir='rtl'] .user-info {
  order: 1;
  flex-direction: row-reverse;
}

@media (max-width: 768px) {
  .hamburger { display: block; }
  .user-name { display: none; }
  .topbar { padding: 13px 16px; }
  .content { padding: 20px 16px 32px; }
}

@media (max-width: 450px) {
  .topbar { gap: 8px; }
  .topbar-title { font-size: 1.05rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .user-info { gap: 6px; }
  .language-picker select, .theme-picker select { max-width: 64px; padding: 6px 3px; font-size: .8rem; }
  .role-badge { display: none; }
}
</style>
