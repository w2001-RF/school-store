import { DatabaseAdapter } from './DatabaseAdapter.js'

/**
 * SQLiteAdapter - base de données SQL réelle via sql.js.
 *
 * Charge sql.js dynamiquement pour éviter les problèmes d'import Vite
 * et garantir que le WASM est correctement résolu en dev comme en prod.
 */
export class SQLiteAdapter extends DatabaseAdapter {
  constructor(config = {}) {
    super()
    this.dbName = config.dbName || 'school_store.db'
    this.db = null
    this.SQL = null
    this.ready = this._init()
  }

  async _init() {
    try {
      // ✅ Import dynamique de sql.js
      const initSqlJs = (await import('sql.js')).default
      
      // Récupération de l'URL du WASM de manière fiable
      const sqlWasmUrl = (await import('sql.js/dist/sql-wasm.wasm?url')).default
      
      this.SQL = await initSqlJs({
        locateFile: () => sqlWasmUrl
      })
      
      const fileBuffer = await this._loadFromFile()
      this.db = fileBuffer
        ? new this.SQL.Database(new Uint8Array(fileBuffer))
        : new this.SQL.Database()

      if (!fileBuffer) {
        this._createSchema()
        this._seed()
        await this._saveToFile()
      } else {
        this._ensureSchema()
      }
      
      console.log('✅ SQLite initialisé')
    } catch (e) {
      console.error('❌ Échec init SQLite :', e)
      throw e
    }
  }

  // ============== Persistance fichier local (OPFS) ==============
  async _getSqliteFile(create = false) {
    if (!navigator.storage?.getDirectory) {
      throw new Error('Le stockage local des fichiers n’est pas supporté par ce navigateur')
    }
    const root = await navigator.storage.getDirectory()
    const sqliteDirectory = await root.getDirectoryHandle('sqlite', { create: true })
    return sqliteDirectory.getFileHandle(this.dbName, { create })
  }

  async _loadFromFile() {
    try {
      const fileHandle = await this._getSqliteFile()
      return await (await fileHandle.getFile()).arrayBuffer()
    } catch (error) {
      if (error.name === 'NotFoundError') return null
      throw error
    }
  }

  async _saveToFile() {
    if (!this.db) return
    const fileHandle = await this._getSqliteFile(true)
    const writable = await fileHandle.createWritable()
    await writable.write(this.db.export())
    await writable.close()
  }

  // ============== Schéma ==============
  _createSchema() {
    this.db.run(`
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        full_name TEXT,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('manager','agent')),
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        discount_percent REAL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE client_product_prices (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        price REAL NOT NULL CHECK (price >= 0),
        UNIQUE(client_id, product_id)
      );
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        barcode TEXT UNIQUE,
        price REAL NOT NULL CHECK (price >= 0),
        stock INTEGER DEFAULT 0 CHECK (stock >= 0),
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        image_url TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        agent_id TEXT REFERENCES profiles(id),
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        customer_name TEXT,
        total_amount REAL NOT NULL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        product_barcode TEXT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL
      );
      CREATE INDEX idx_products_barcode ON products(barcode);
      CREATE INDEX idx_invoices_agent ON invoices(agent_id);
      CREATE INDEX idx_invoices_status ON invoices(status);
      CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

      CREATE TRIGGER trg_products_updated AFTER UPDATE ON products
      BEGIN UPDATE products SET updated_at = datetime('now') WHERE id = NEW.id; END;
    `)
  }

  _ensureSchema() {
    try {
      const columns = this.db.exec('PRAGMA table_info(profiles)')[0]?.values || []
      const hasPasswordHash = columns.some(([,, name]) => name === 'password_hash')
      if (!hasPasswordHash) this.db.run('ALTER TABLE profiles ADD COLUMN password_hash TEXT')
      this.db.run(
        'UPDATE profiles SET password_hash = ? WHERE email = ? AND password_hash IS NULL',
        [this._hashPassword('demo1234'), 'manager@demo.com']
      )
      this.db.run(`CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        discount_percent REAL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
        created_at TEXT DEFAULT (datetime('now'))
      )`)
      const clientColumns = this.db.exec('PRAGMA table_info(clients)')[0]?.values || []
      if (!clientColumns.some(([,, name]) => name === 'discount_percent')) {
        this.db.run('ALTER TABLE clients ADD COLUMN discount_percent REAL DEFAULT 0')
      }
      this.db.run(`CREATE TABLE IF NOT EXISTS client_product_prices (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        price REAL NOT NULL CHECK (price >= 0),
        UNIQUE(client_id, product_id)
      )`)
      const invoiceColumns = this.db.exec('PRAGMA table_info(invoices)')[0]?.values || []
      if (!invoiceColumns.some(([,, name]) => name === 'client_id')) {
        this.db.run('ALTER TABLE invoices ADD COLUMN client_id TEXT REFERENCES clients(id) ON DELETE SET NULL')
      }
      if (!invoiceColumns.some(([,, name]) => name === 'discount_amount')) {
        this.db.run('ALTER TABLE invoices ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0')
      }
      if (!invoiceColumns.some(([,, name]) => name === 'payment_method')) {
        this.db.run('ALTER TABLE invoices ADD COLUMN payment_method TEXT NOT NULL DEFAULT "cash"')
      }
      this.db.run(
        `INSERT INTO clients (id, name, discount_percent)
         SELECT ?, 'Passager', 0
         WHERE NOT EXISTS (SELECT 1 FROM clients WHERE LOWER(name) = 'passager')`,
        [this._uid()]
      )
    } catch (e) { console.warn('Migration check failed', e) }
  }

  _seed() {
    // Catégories
    const categories = [
      { id: this._uid(), name: 'Cahiers', description: 'Cahiers et blocs' },
      { id: this._uid(), name: 'Stylos', description: 'Stylos et crayons' },
      { id: this._uid(), name: 'Sacs', description: 'Sacs et cartables' }
    ]
    for (const c of categories) {
      this.db.run(
        'INSERT INTO categories (id, name, description) VALUES (?, ?, ?)',
        [c.id, c.name, c.description]
      )
    }
    // Produits
    const products = [
      { id: this._uid(), name: 'Cahier 96 pages', barcode: '6001234567890', price: 1.50, stock: 100, category_id: categories[0].id },
      { id: this._uid(), name: 'Stylo Bic bleu', barcode: '6009876543210', price: 0.50, stock: 200, category_id: categories[1].id },
      { id: this._uid(), name: 'Cartable primaire', barcode: '6005554443332', price: 25.00, stock: 30, category_id: categories[2].id }
    ]
    for (const p of products) {
      this.db.run(
        'INSERT INTO products (id, name, barcode, price, stock, category_id, active) VALUES (?,?,?,?,?,?,1)',
        [p.id, p.name, p.barcode, p.price, p.stock, p.category_id]
      )
    }
    this.db.run(
      'INSERT INTO clients (id, name, discount_percent) VALUES (?, ?, 0)',
      [this._uid(), 'Passager']
    )
    // Manager démo
    const demoManager = {
      id: this._uid(),
      email: 'manager@demo.com',
      password_hash: this._hashPassword('demo1234'),
      full_name: 'Manager Démo',
      role: 'manager'
    }
    this.db.run(
      'INSERT INTO profiles (id, email, full_name, password_hash, role, active) VALUES (?,?,?,?,?,1)',
      [demoManager.id, demoManager.email, demoManager.full_name, demoManager.password_hash, demoManager.role]
    )
    this._demoManagerId = demoManager.id
    this._demoPasswords = { [demoManager.email]: 'demo1234' }

    // Agent démo
    const demoAgent = {
      id: this._uid(),
      email: 'agent@demo.com',
      password_hash: this._hashPassword('demo1234'),
      full_name: 'Agent Démo',
      role: 'agent'
    }
    this.db.run(
      'INSERT INTO profiles (id, email, full_name, password_hash, role, active) VALUES (?,?,?,?,?,1)',
      [demoAgent.id, demoAgent.email, demoAgent.full_name, demoAgent.password_hash, demoAgent.role]
    )
    this._demoAgentId = demoAgent.id
    this._demoPasswords = { ...this._demoPasswords, [demoAgent.email]: 'demo1234' }
  }

  // ============== Utilitaires ==============
  _uid() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2)
  }

  // Hash simple pour démo uniquement - NE PAS UTILISER EN PRODUCTION
  _hashPassword(password) {
    let hash = 0
    for (let i = 0; i < password.length; i++) {
      hash = ((hash << 5) - hash) + password.charCodeAt(i)
      hash |= 0
    }
    return 'h_' + Math.abs(hash).toString(16)
  }

  _verifyPassword(password, hash) {
    return this._hashPassword(password) === hash
  }

  _rowsFromStmt(stmt) {
    const rows = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  }

  _buildWhereClause(where = {}) {
    const conds = []
    const params = []
    for (const [field, raw] of Object.entries(where)) {
      if (Array.isArray(raw)) {
        const [op, value] = raw
        switch (op) {
          case 'eq':    conds.push(`${field} = ?`); params.push(value); break
          case 'neq':   conds.push(`${field} != ?`); params.push(value); break
          case 'gt':    conds.push(`${field} > ?`);  params.push(value); break
          case 'gte':   conds.push(`${field} >= ?`); params.push(value); break
          case 'lt':    conds.push(`${field} < ?`);  params.push(value); break
          case 'lte':   conds.push(`${field} <= ?`); params.push(value); break
          case 'like':  conds.push(`${field} LIKE ?`);  params.push(`%${value}%`); break
          case 'ilike': conds.push(`LOWER(${field}) LIKE LOWER(?)`); params.push(`%${value}%`); break
          case 'in':
            const placeholders = value.map(() => '?').join(',')
            conds.push(`${field} IN (${placeholders})`)
            params.push(...value)
            break
        }
      } else {
        conds.push(`${field} = ?`)
        params.push(raw)
      }
    }
    return { clause: conds.length ? ' WHERE ' + conds.join(' AND ') : '', params }
  }
  // ============== Auth ==============
  async signIn({ email, password }) {
    await this.ready
    const stmt = this.db.prepare('SELECT * FROM profiles WHERE email = ? AND active = 1')
    stmt.bind([email])
    const user = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    if (!user || !this._verifyPassword(password, user.password_hash)) {
      throw new Error('Identifiants invalides')
    }
    const session = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role
    }
    sessionStorage.setItem('school_store_session', JSON.stringify(session))
    return session
  }

  async signUp({ email, password, fullName, role = 'agent' }) {
    await this.ready
    try {
      const id = this._uid()
      this.db.run(
        'INSERT INTO profiles (id, email, full_name, role, password_hash, active) VALUES (?,?,?,?,?,1)',
        [id, email, fullName || email, role, this._hashPassword(password)]
      )
      await this._saveToFile()
      return { id, email, fullName: fullName || email, role }
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        throw new Error('Cet email est déjà utilisé')
      }
      throw e
    }
  }

  async signOut() {
    sessionStorage.removeItem('school_store_session')
    return true
  }

  async getCurrentUser() {
    const raw = sessionStorage.getItem('school_store_session')
    return raw ? JSON.parse(raw) : null
  }

  onAuthStateChange(callback) {
    this.getCurrentUser().then(callback)
    return () => {}
  }

  // ============== CRUD ==============
  async find(resource, options = {}) {
    await this.ready
    const { clause, params } = this._buildWhereClause(options.where)
    let sql = `SELECT ${options.select || '*'} FROM ${resource}${clause}`
    if (options.orderBy) {
      const dir = options.orderBy.ascending === false ? 'DESC' : 'ASC'
      sql += ` ORDER BY ${options.orderBy.field} ${dir}`
    }
    if (options.limit != null) {
      sql += ` LIMIT ${options.limit}`
      if (options.offset) sql += ` OFFSET ${options.offset}`
    }
    const stmt = this.db.prepare(sql)
    stmt.bind(params)
    return this._rowsFromStmt(stmt)
  }

  async findById(resource, id) {
    await this.ready
    const stmt = this.db.prepare(`SELECT * FROM ${resource} WHERE id = ?`)
    stmt.bind([id])
    const row = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    return row
  }

  async findOne(resource, filters = {}) {
    const rows = await this.find(resource, { where: filters, limit: 1 })
    return rows[0] || null
  }

  async create(resource, data) {
    await this.ready
    const id = data.id || this._uid()
    const record = { ...data, id, created_at: new Date().toISOString() }
    const fields = Object.keys(record)
    const placeholders = fields.map(() => '?').join(',')
    const values = fields.map(f => record[f])
    try {
      this.db.run(
        `INSERT INTO ${resource} (${fields.join(',')}) VALUES (${placeholders})`,
        values
      )
      await this._saveToFile()
      return record
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        throw new Error(`Violation de contrainte d'unicité sur ${resource}`)
      }
      throw e
    }
  }

  async update(resource, id, data) {
    await this.ready
    const fields = Object.keys(data)
    if (fields.length === 0) return await this.findById(resource, id)
    const setClause = fields.map(f => `${f} = ?`).join(', ')
    const values = fields.map(f => data[f])
    this.db.run(
      `UPDATE ${resource} SET ${setClause}, updated_at = datetime('now') WHERE id = ?`,
      [...values, id]
    )
    await this._saveToFile()
    return await this.findById(resource, id)
  }

  async delete(resource, id) {
    await this.ready
    this.db.run(`DELETE FROM ${resource} WHERE id = ?`, [id])
    await this._saveToFile()
    return true
  }

  async count(resource, filters = {}) {
    const rows = await this.find(resource, { where: filters })
    return rows.length
  }

  // ============== Real-time (polling simple) ==============
  // SQLite n'a pas de pub/sub natif. On émule via polling.
  _pollingChannels = new Map()

  subscribe(resource, callback) {
    const intervalId = setInterval(async () => {
      const rows = await this.find(resource)
      callback({ event: 'sync', new: rows, old: null })
    }, 3000)
    const channel = { intervalId, resource }
    this._pollingChannels.set(resource, channel)
    return channel
  }

  unsubscribe(channel) {
    if (channel && channel.intervalId) {
      clearInterval(channel.intervalId)
      this._pollingChannels.delete(channel.resource)
    }
  }

  // ============== Utilitaires de dev ==============
  async reset() {
    this.db.run('DELETE FROM invoice_items')
    this.db.run('DELETE FROM invoices')
    this.db.run('DELETE FROM products')
    this.db.run('DELETE FROM client_product_prices')
    this.db.run('DELETE FROM categories')
    this.db.run('DELETE FROM profiles')
    this._seed()
    await this._saveToFile()
  }

  async rpc() { throw new Error('RPC non supporté en SQLite (utilisez les transactions)') }
}
