import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where as fbWhere,
  orderBy as fbOrderBy,
  limit as fbLimit,
  startAfter,
  onSnapshot
} from 'firebase/firestore'
import { DatabaseAdapter } from './DatabaseAdapter.js'

/**
 * FirebaseAdapter - implémentation complète de DatabaseAdapter pour Firebase.
 *
 * Mapping des opérations :
 *   - resources Firestore (collections) : profiles, categories, products, invoices, invoice_items
 *   - Filtres where convertis vers fbWhere avec opérateurs Firestore
 *   - Real-time via onSnapshot
 *
 * NOTE : Firestore n'autorise pas la recherche `ilike` ni `like` SQL.
 *        On émule ces opérateurs via des filtres de plage (>= X && < X+1) ou
 *        via une recherche côté client si nécessaire (voir _applyWhere).
 */
export class FirebaseAdapter extends DatabaseAdapter {
  constructor(config) {
    super()
    this.app = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    })
    this.auth = getAuth(this.app)
    this.db = getFirestore(this.app)
    this._authCallbacks = new Set()
    this._userProfileCache = new Map()

    // Observer global d'auth → synchronise la session
    onAuthStateChanged(this.auth, async (fbUser) => {
      if (fbUser) {
        const profile = await this._fetchProfile(fbUser.uid)
        const user = {
          id: fbUser.uid,
          email: fbUser.email,
          fullName: profile?.full_name || fbUser.email,
          role: profile?.role || 'agent'
        }
        this._userProfileCache.set(fbUser.uid, user)
        this._notifyAuth(user)
      } else {
        this._notifyAuth(null)
      }
    })
  }

  // ===================== Helpers =====================
  _col(name) { return collection(this.db, name) }
  _docRef(resource, id) { return doc(this.db, resource, id) }

  _notifyAuth(user) {
    this._authCallbacks.forEach(cb => cb(user))
  }

  async _fetchProfile(uid) {
    try {
      const snap = await getDoc(this._docRef('profiles', uid))
      return snap.exists() ? snap.data() : null
    } catch { return null }
  }

  // Mapping des opérateurs unifiés → opérateurs Firestore
  _buildFirestoreFilters(where = {}) {
    return Object.entries(where).map(([field, raw]) => {
      if (!Array.isArray(raw)) return fbWhere(field, '==', raw)
      const [op, value] = raw
      switch (op) {
        case 'eq':  return fbWhere(field, '==', value)
        case 'neq': return fbWhere(field, '!=', value)
        case 'gt':  return fbWhere(field, '>', value)
        case 'gte': return fbWhere(field, '>=', value)
        case 'lt':  return fbWhere(field, '<', value)
        case 'lte': return fbWhere(field, '<=', value)
        case 'in':  return fbWhere(field, 'in', value)
        // 'like' / 'ilike' ne sont pas supportés nativement par Firestore.
        // On retourne un filtre vide qui sera traité en post-filtrage mémoire.
        case 'like':
        case 'ilike':
          this._postFilter = { field, op, value }
          return null
        default:    return fbWhere(field, '==', value)
      }
    }).filter(Boolean)
  }

  // ===================== Auth =====================
  async signIn({ email, password }) {
    try {
      const cred = await signInWithEmailAndPassword(this.auth, email, password)
      const profile = await this._fetchProfile(cred.user.uid)
      return {
        id: cred.user.uid,
        email: cred.user.email,
        fullName: profile?.full_name || cred.user.email,
        role: profile?.role || 'agent'
      }
    } catch (e) {
      throw new Error(this._translateAuthError(e.code))
    }
  }

  async signUp({ email, password, fullName, role = 'agent' }) {
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email, password)
      // Création du profil dans Firestore
      await setDoc(this._docRef('profiles', cred.user.uid), {
        email,
        full_name: fullName || email,
        role,
        active: true,
        created_at: new Date().toISOString()
      })
      return {
        id: cred.user.uid,
        email,
        fullName: fullName || email,
        role
      }
    } catch (e) {
      throw new Error(this._translateAuthError(e.code))
    }
  }

  async signOut() {
    await fbSignOut(this.auth)
  }

  async getCurrentUser() {
    const fbUser = this.auth.currentUser
    if (!fbUser) return null
    return {
      id: fbUser.uid,
      email: fbUser.email,
      fullName: fbUser.email,
      role: 'agent'
    }
  }

  onAuthStateChange(callback) {
    this._authCallbacks.add(callback)
    return () => this._authCallbacks.delete(callback)
  }

  _translateAuthError(code) {
    const map = {
      'auth/user-not-found': 'Utilisateur introuvable',
      'auth/wrong-password': 'Mot de passe incorrect',
      'auth/invalid-email': 'Email invalide',
      'auth/email-already-in-use': 'Email déjà utilisé',
      'auth/weak-password': 'Mot de passe trop faible'
    }
    return map[code] || code
  }

  // ===================== CRUD =====================
  async find(resource, options = {}) {
    try {
      this._postFilter = null
      const filters = this._buildFirestoreFilters(options.where)
      const constraints = [...filters]
      if (options.orderBy) {
        constraints.push(fbOrderBy(options.orderBy.field, options.orderBy.ascending === false ? 'desc' : 'asc'))
      }
      if (options.limit) {
        constraints.push(fbLimit(options.limit + (options.offset || 0)))
      }
      const q = query(this._col(resource), ...constraints)
      const snap = await getDocs(q)

      let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Post-filtrage pour 'like' / 'ilike'
      if (this._postFilter) {
        const { field, op, value } = this._postFilter
        const needle = String(value || '').toLowerCase()
        docs = docs.filter(r => {
          const hay = String(r[field] || '')
          const target = op === 'ilike' ? hay.toLowerCase() : hay
          return target.includes(needle)
        })
      }

      if (options.offset) docs = docs.slice(options.offset)
      if (options.limit) docs = docs.slice(0, options.limit)

      return docs
    } catch (e) {
      throw new Error(`Firebase find(${resource}) : ${e.message}`)
    }
  }

  async findById(resource, id) {
    const snap = await getDoc(this._docRef(resource, id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }

  async findOne(resource, filters = {}) {
    const rows = await this.find(resource, { where: filters, limit: 1 })
    return rows[0] || null
  }

  async create(resource, data) {
    const payload = {
      ...data,
      created_at: data.created_at || new Date().toISOString()
    }
    const ref = await addDoc(this._col(resource), payload)
    return { id: ref.id, ...payload }
  }

  async update(resource, id, data) {
    const payload = { ...data, updated_at: new Date().toISOString() }
    await updateDoc(this._docRef(resource, id), payload)
    return { id, ...payload }
  }

  async delete(resource, id) {
    await deleteDoc(this._docRef(resource, id))
    return true
  }

  async count(resource, filters = {}) {
    const rows = await this.find(resource, { where: filters })
    return rows.length
  }

  // ===================== Real-time =====================
  subscribe(resource, callback) {
    const unsub = onSnapshot(this._col(resource), (snap) => {
      snap.docChanges().forEach(change => {
        callback({
          event: change.type,
          new: change.doc.exists() ? { id: change.doc.id, ...change.doc.data() } : null,
          old: null
        })
      })
    })
    return unsub
  }

  unsubscribe(channel) {
    if (typeof channel === 'function') channel()
  }
}
