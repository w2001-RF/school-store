import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth.js'

/**
 * useAuth - composable d'authentification prêt à l'emploi.
 *
 * Retourne l'état réactif du store auth + des helpers pratiques :
 *   - signIn / signUp / signOut
 *   - hasRole, isManager, isAgent
 *   - guards pour les templates (v-if="auth.canManageProducts")
 *
 * Utilisation dans un composant :
 *   const { user, isManager, signOut } = useAuth()
 */
export function useAuth() {
  const store = useAuthStore()

  // storeToRefs préserve la réactivité lors de la déstructuration
  const { user, loading, error, isAuthenticated, isManager, isAgent } = storeToRefs(store)

  /**
   * Vérifie si l'utilisateur courant a l'un des rôles fournis.
   * @param  {...string} roles - rôles autorisés
   * @returns {boolean}
   */
  function hasRole(...roles) {
    if (!user.value) return false
    return roles.includes(user.value.role)
  }

  /**
   * Initialise l'auth au montage de l'app (idempotent).
   * À appeler dans App.vue / layout principal.
   */
  async function ensureInitialized() {
    if (loading.value) {
      // Attendre la fin de l'init en cours
      while (loading.value) {
        await new Promise(r => setTimeout(r, 30))
      }
    }
  }

  /**
   * Tente de se connecter. Lève l'erreur en cas d'échec pour permettre
   * une gestion fine par le caller.
   */
  async function signIn(credentials) {
    await store.signIn(credentials)
    return user.value
  }

  /**
   * Tente de créer un compte (dev / SQLite uniquement par défaut).
   */
  async function signUp(payload) {
    await store.signUp(payload)
    return user.value
  }

  /**
   * Déconnexion + reset du state local.
   */
  async function signOut() {
    await store.signOut()
  }

  // Permissions computed (lisibles directement dans les templates)
  const canManageProducts  = computed(() => isManager.value)
  const canManageCategories = computed(() => isManager.value)
  const canCreateInvoice   = computed(() => isAgent.value)
  const canValidatePayment = computed(() => isAgent.value)
  const canViewReports     = computed(() => isManager.value)

  return {
    // État réactif
    user,
    loading,
    error,
    isAuthenticated,
    isManager,
    isAgent,

    // Actions
    signIn,
    signUp,
    signOut,
    ensureInitialized,

    // Helpers
    hasRole,
    canManageProducts,
    canManageCategories,
    canCreateInvoice,
    canValidatePayment,
    canViewReports
  }
}
