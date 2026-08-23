import { computed, unref } from 'vue'
import { useAuthStore } from '../stores/auth.js'

/**
 * usePermissions - système de permissions déclaratif et centralisé.
 *
 * Définit les "capabilities" de l'application sous forme de fonctions pures.
 * Chaque capability retourne un booléen indiquant si l'utilisateur courant
 * peut effectuer l'action.
 *
 * Avantages :
 *   - Source unique de vérité pour les permissions
 *   - Réutilisable côté UI (boutons disabled) et côté store (validations)
 *   - Testable indépendamment
 *
 * Utilisation :
 *   const { can, cannot, requireRole } = usePermissions()
 *   if (can('product.delete')) { ... }
 */

// ==================== Définition des capabilities ====================
export const CAPABILITIES = {
  // Produits
  'product.view':     ['agent', 'manager'],
  'product.create':   ['manager'],
  'product.update':   ['manager'],
  'product.delete':   ['manager'],
  'product.adjustStock': ['manager'],

  // Catégories
  'category.view':    ['agent', 'manager'],
  'category.create':  ['manager'],
  'category.update':  ['manager'],
  'category.delete':  ['manager'],

  // Factures
  'invoice.view':     ['agent', 'manager'],
  'invoice.create':   ['agent', 'manager'],
  'invoice.update':   ['agent', 'manager'], // filtré par statut dans le store
  'invoice.delete':   ['manager'],
  'invoice.cancel':   ['manager'],
  'invoice.validatePayment': ['agent', 'manager'],
  'invoice.viewAll':  ['manager'], // manager voit tout, agent voit les siennes

  // Utilisateurs
  'user.view':        ['manager'],
  'user.manage':     ['manager'],

  // Rapports / Dashboard
  'dashboard.viewRevenue': ['manager'],
  'dashboard.viewStats':   ['agent', 'manager']
}

// ==================== Composable ====================
export function usePermissions() {
  const authStore = useAuthStore()

  /**
   * Vérifie si l'utilisateur courant possède la capability.
   * @param {string} capability - ex: 'product.create'
   * @param {object} [context] - contexte optionnel (resource, owner, etc.)
   * @returns {boolean}
   */
  function can(capability, context = null) {
    const user = authStore.user
    if (!user) return false

    const allowedRoles = CAPABILITIES[capability]
    if (!allowedRoles) {
      console.warn(`[Permissions] Capability inconnue : "${capability}"`)
      return false
    }
    if (!allowedRoles.includes(user.role)) return false

    // Vérifications contextuelles
    if (context) {
      return _checkContext(capability, user, context)
    }
    return true
  }

  /**
   * Inverse de can(). Pratique pour l'UX : v-if="cannot('product.delete')"
   */
  function cannot(capability, context = null) {
    return !can(capability, context)
  }

  /**
   * Lève une erreur si l'utilisateur n'a pas la capability.
   * À utiliser dans les stores avant une mutation.
   */
  function requireRole(...roles) {
    const user = authStore.user
    if (!user || !roles.includes(user.role)) {
      throw new Error(`Permission refusée : rôle "${user?.role || 'anonymous'}" non autorisé`)
    }
  }

  function requireCapability(capability, context = null) {
    if (!can(capability, context)) {
      throw new Error(`Permission refusée : action "${capability}" non autorisée`)
    }
  }

  /**
   * Vérifications contextuelles selon la capability.
   * Par exemple : un agent peut modifier SES factures, pas celles des autres.
   */
  function _checkContext(capability, user, context) {
    switch (capability) {
      case 'invoice.update':
      case 'invoice.cancel':
        // Agent : seulement ses propres factures non payées
        if (user.role === 'agent') {
          return context.ownerId === user.id && context.status === 'pending'
        }
        return true

      case 'invoice.view':
        // Agent : seulement ses propres factures (sauf s'il a invoice.viewAll)
        if (user.role === 'agent' && !CAPABILITIES['invoice.viewAll'].includes('agent')) {
          return context.ownerId === user.id
        }
        return true

      default:
        return true
    }
  }

  /**
   * Retourne un computed réactif (utile pour les templates).
   */
  function canReactive(capability, contextRef = null) {
    return computed(() => {
      const ctx = contextRef ? unref(contextRef) : null
      return can(capability, ctx)
    })
  }

  /**
   * Liste toutes les capabilities de l'utilisateur courant.
   * Utile pour debug / affichage des permissions.
   */
  function listCapabilities() {
    return Object.entries(CAPABILITIES)
      .filter(([, roles]) => authStore.user && roles.includes(authStore.user.role))
      .map(([cap]) => cap)
  }

  return {
    can,
    cannot,
    canReactive,
    requireRole,
    requireCapability,
    listCapabilities,
    CAPABILITIES
  }
}
