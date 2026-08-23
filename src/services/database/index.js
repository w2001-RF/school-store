import { SupabaseAdapter } from './SupabaseAdapter.js'
import { FirebaseAdapter } from './FirebaseAdapter.js'
import { SQLiteAdapter } from './SQLiteAdapter.js'
import { LocalAdapter } from './LocalAdapter.js'

/**
 * Factory qui crée l'adapter approprié selon la configuration.
 *
 * Pour ajouter un nouveau moteur :
 *   1. Créer une classe qui étend DatabaseAdapter (cf. 11 méthodes)
 *   2. Ajouter le case ci-dessous
 *   3. Documenter les variables d'env requises dans .env.example
 */
export function createDatabase() {
  const type = (import.meta.env.VITE_DB_ADAPTER || 'sqlite').toLowerCase()

  switch (type) {
    // ---------- Cloud production ----------
    case 'supabase':
      return new SupabaseAdapter({
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
      })

    case 'firebase':
      return new FirebaseAdapter({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      })

    // ---------- Développement local ----------
    case 'sqlite':
      return new SQLiteAdapter({
        dbName: import.meta.env.VITE_SQLITE_DB_NAME || 'school_store.db'
      })

    case 'local':
      return new LocalAdapter()

    // ---------- Fallback ----------
    default:
      console.warn(
        `[DB] Adapter "${type}" inconnu. Options : supabase | firebase | sqlite | local. ` +
        `Fallback sur "sqlite" pour le développement.`
      )
      return new SQLiteAdapter()
  }
}

// Instance singleton (lazy : la factory est appelée une seule fois)
export const db = createDatabase()

// Helper pratique pour le débogage en console
if (typeof window !== 'undefined') {
  window.__db = db
}
