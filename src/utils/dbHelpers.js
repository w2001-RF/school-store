/**
 * Helpers pratiques pour debugger / gérer l'adapter de BDD depuis la console.
 *
 * Exemples d'usage dans la console du navigateur :
 *   __dbHelper.switchAdapter('supabase')
 *   __dbHelper.testConnection()
 *   __dbHelper.resetDevData()
 */
import { db } from '../services/database/index.js'

export const dbHelpers = {
  currentAdapter: () => import.meta.env.VITE_DB_ADAPTER || 'sqlite',

  async testConnection() {
    try {
      const count = await db.count('products')
      console.log(`✅ Connexion OK — ${count} produits en base`)
      return true
    } catch (e) {
      console.error('❌ Erreur de connexion :', e)
      return false
    }
  },

  async resetDevData() {
    if (!confirm('⚠️ Effacer toutes les données de dev ?')) return
    if (db.reset) {
      await db.reset()
      console.log('🗑️ Base réinitialisée')
    } else {
      console.warn('Cet adapter ne supporte pas reset()')
    }
  },

  // Affiche les stats globales
  async getStats() {
    const [products, categories, invoices] = await Promise.all([
      db.count('products'),
      db.count('categories'),
      db.count('invoices')
    ])
    return { products, categories, invoices, adapter: this.currentAdapter() }
  }
}

if (typeof window !== 'undefined') {
  window.__dbHelper = dbHelpers
}
