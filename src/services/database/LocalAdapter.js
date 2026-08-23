import { DatabaseAdapter } from './DatabaseAdapter.js'

/**
 * Adapter LocalStorage pour développement et démos sans backend.
 * Utilise la même interface unifiée que SupabaseAdapter.
 * Permet de tester toute l'app sans aucune configuration.
 */
export class LocalAdapter extends DatabaseAdapter {
  constructor() {
    super()
    this.STORAGE_KEY = 'school_store_db'
    this.AUTH_KEY = 'school_store_auth'
    this._init()
    this._authCallbacks = new Set()
  }

  _init() {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      const seed = {
        profiles: [],
        categories: [
          { id: this._uid(), name: 'Cahiers', description: 'Cahiers et blocs', created_at: new Date().toISOString() },
          { id: this._uid(), name: 'Stylos', description: 'Stylos et crayons', created_at: new Date().toISOString() },
          { id: this._uid(), name: 'Sacs', description: 'Sacs et cartables', created_at: new Date().toISOString() }
        ],
        products: [
          { id: this._uid(), name: 'Cahier 96 pages', barcode: '6001234567890', price: 1.50, stock: 100, category_id: null, active: true, created_at: new Date().toISOString() },
          { id: this._uid(), name: 'Stylo Bic bleu', barcode: '6009876543210', price: 0.50, stock: 200, category_id: null, active: true, created_at: new Date().toISOString() },
          { id: this._uid(), name: 'Cartable primaire', barcode: '6005554443332', price: 25.00, stock: 30, category_id: null, active: true, created_at: new Date().toISOString() }
        ],
        invoices: [],
        invoice_items: []
      }
      // assigner les catégories
      seed.products[0].category_id = seed.categories[0].id
      seed.products[1].category_id = seed.categories[1].id
      seed.products[2].category_id = seed.categories[2].id
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(seed))

      // utilisateur de démo
      const demoUser = {
        id: this._uid(),
        email: 'manager@demo.com',
        password: 'demo1234',
        fullName: 'Manager Démo',
        role: 'manager'
      }
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(demoUser))
    }
  }

  _read() { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) }
  _write(db) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(db)) }
  _uid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now() }

  _match(value, raw) {
    if (!Array.isArray(raw)) return value === raw
    const [op, v] = raw
    switch (op) {
      case 'eq':  return value === v
      case 'neq': return value !== v
      case 'gt':  return value > v
      case 'gte': return value >= v
      case 'lt':  return value < v
      case 'lte': return value <= v
      case 'like':
      case 'ilike':
        const s = String(value || '').toLowerCase()
        const p = String(v || '').toLowerCase()
        return s.includes(p)
      case 'in':  return v.includes(value)
      default:    return value === v
    }
  }

  _filter(rows, where = {}) {
    return rows.filter(row => {
      for (const [field, raw] of Object.entries(where)) {
        if (!this._match(row[field], raw)) return false
      }
      return true
    })
  }

  // ============ Auth ============
  async signIn({ email, password }) {
    const user = JSON.parse(localStorage.getItem(this.AUTH_KEY))
    if (!user || user.email !== email || user.password !== password) {
      throw new Error('Identifiants invalides')
    }
    const { password: _, ...safe } = user
    this._notifyAuth(safe)
    return safe
  }

  async signUp({ email, password, fullName, role = 'agent' }) {
    if (localStorage.getItem(this.AUTH_KEY)) {
      throw new Error('Un utilisateur existe déjà en mode local')
    }
    const user = { id: this._uid(), email, password, fullName, role }
    localStorage.setItem(this.AUTH_KEY, JSON.stringify(user))
    const { password: _, ...safe } = user
    return safe
  }

  async signOut() {
    this._notifyAuth(null)
    return true
  }

  async getCurrentUser() {
    return JSON.parse(localStorage.getItem('school_store_session') || 'null')
  }

  onAuthStateChange(callback) {
    this._authCallbacks.add(callback)
    this.getCurrentUser().then(u => callback(u))
    return () => this._authCallbacks.delete(callback)
  }

  _notifyAuth(user) {
    if (user) localStorage.setItem('school_store_session', JSON.stringify(user))
    else localStorage.removeItem('school_store_session')
    this._authCallbacks.forEach(cb => cb(user))
  }

  // ============ CRUD ============
  async find(resource, options = {}) {
    const db = this._read()
    let rows = this._filter(db[resource] || [], options.where)
    if (options.orderBy) {
      const { field, ascending = true } = options.orderBy
      rows = [...rows].sort((a, b) => {
        if (a[field] < b[field]) return ascending ? -1 : 1
        if (a[field] > b[field]) return ascending ? 1 : -1
        return 0
      })
    }
    if (options.offset) rows = rows.slice(options.offset)
    if (options.limit != null) rows = rows.slice(0, options.limit)
    return rows
  }

  async findById(resource, id) {
    const db = this._read()
    return (db[resource] || []).find(r => r.id === id) || null
  }

  async findOne(resource, filters = {}) {
    const rows = await this.find(resource, { where: filters, limit: 1 })
    return rows[0] || null
  }

  async create(resource, data) {
    const db = this._read()
    const record = { id: this._uid(), created_at: new Date().toISOString(), ...data }
    db[resource] = [...(db[resource] || []), record]
    this._write(db)
    return record
  }

  async update(resource, id, data) {
    const db = this._read()
    const idx = (db[resource] || []).findIndex(r => r.id === id)
    if (idx === -1) throw new Error(`${resource} ${id} introuvable`)
    db[resource][idx] = { ...db[resource][idx], ...data, updated_at: new Date().toISOString() }
    this._write(db)
    return db[resource][idx]
  }

  async delete(resource, id) {
    const db = this._read()
    db[resource] = (db[resource] || []).filter(r => r.id !== id)
    this._write(db)
    return true
  }

  async count(resource, filters = {}) {
    const db = this._read()
    return this._filter(db[resource] || [], filters).length
  }

  async rpc() { throw new Error('RPC non supporté en mode local') }

  // ============ Real-time (no-op en local) ============
  subscribe() { return null }
  unsubscribe() { return true }
}
