import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AuthService } from '../services/auth/AuthService.js'
import { db } from '../services/database/index.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(true)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const isManager = computed(() => user.value?.role === 'manager')
  const isSuperAdmin = computed(() => user.value?.isSuperAdmin === true)
  const isAgent   = computed(() => ['agent', 'manager'].includes(user.value?.role))

  async function init() {
    loading.value = true
    try {
      user.value = await AuthService.currentUser()
      AuthService.onAuthStateChange(u => { user.value = u })
    } finally {
      loading.value = false
    }
  }

  async function signIn(creds) {
    error.value = null
    try { user.value = await AuthService.signIn(creds) }
    catch (e) { error.value = e.message; throw e }
  }

  async function signUp(creds) {
    error.value = null
    try { user.value = await AuthService.signUp(creds) }
    catch (e) { error.value = e.message; throw e }
  }

  async function signOut() {
    await AuthService.signOut()
    user.value = null
  }

  async function updateProfile({ fullName }) {
    const normalizedName = String(fullName || '').trim()
    if (!normalizedName) throw new Error('Le nom complet est obligatoire')
    const updated = db.constructor.name === 'SupabaseAdapter'
      ? await db.rpc('update_my_profile', { profile_full_name: normalizedName })
      : await db.update('profiles', user.value.id, { full_name: normalizedName })
    user.value = { ...user.value, fullName: updated.full_name || normalizedName }
    return user.value
  }

  return {
    user, loading, error,
    isAuthenticated, isManager, isSuperAdmin, isAgent,
    init, signIn, signUp, signOut, updateProfile
  }
})
  