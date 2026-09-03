import { createClient } from '@supabase/supabase-js'
import { DatabaseAdapter } from './DatabaseAdapter.js'

export class SupabaseAdapter extends DatabaseAdapter {
  constructor(config) {
    super()
    this.client = createClient(config.url, config.anonKey)
    this._authCallbacks = new Set()
  }

  // ============ Auth ============
  async signIn({ email, password }) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password })
    if (error) throw error
    return this._hydrateUser(data.user)
  }

  async signUp({ email, password, fullName, role = 'agent' }) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } }
    })
    if (error) throw error
    return this._hydrateUser(data.user)
  }

  async signOut() {
    const { error } = await this.client.auth.signOut()
    if (error) throw error
  }

  async getCurrentUser() {
    const { data: { user } } = await this.client.auth.getUser()
    return user ? this._hydrateUser(user) : null
  }

  onAuthStateChange(callback) {
    const { data: { subscription } } = this.client.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ? await this._hydrateUser(session.user) : null
        callback(user)
      }
    )
    this._authCallbacks.add(subscription)
    return () => subscription.unsubscribe()
  }

  async _hydrateUser(authUser) {
    if (!authUser) return null
    const { data: profile } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()
    return {
      id: authUser.id,
      email: authUser.email,
      fullName: profile?.full_name || authUser.email,
      role: profile?.role || 'agent',
      isSuperAdmin: profile?.is_super_admin === true
    }
  }

  // ============ Requêtes unifiées ============
  _applyWhere(query, where = {}) {
    for (const [field, raw] of Object.entries(where)) {
      const [op, value] = Array.isArray(raw) ? raw : ['eq', raw]
      switch (op) {
        case 'eq':    query = query.eq(field, value); break
        case 'neq':   query = query.neq(field, value); break
        case 'gt':    query = query.gt(field, value); break
        case 'gte':   query = query.gte(field, value); break
        case 'lt':    query = query.lt(field, value); break
        case 'lte':   query = query.lte(field, value); break
        case 'like':  query = query.like(field, `%${value}%`); break
        case 'ilike': query = query.ilike(field, `%${value}%`); break
        case 'in':    query = query.in(field, value); break
      }
    }
    return query
  }

  _applyOptions(query, options = {}) {
    let q = query
    if (options.select) q = q.select(options.select)
    if (options.where) q = this._applyWhere(q, options.where)
    if (options.orderBy) {
      q = q.order(options.orderBy.field, { ascending: options.orderBy.ascending ?? true })
    }
    if (options.limit != null) {
      q = q.limit(options.limit)
      if (options.offset) q = q.range(options.offset, options.offset + options.limit - 1)
    }
    return q
  }

  // ============ CRUD public ============
  async find(resource, options = {}) {
    const { data, error } = await this._applyOptions(
      this.client.from(resource).select(options.select || '*'),
      options
    )
    if (error) throw error
    return data || []
  }

  async findById(resource, id) {
    const { data, error } = await this.client
      .from(resource).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  }

  async findOne(resource, filters = {}) {
    const { data, error } = await this._applyOptions(
      this.client.from(resource).select('*'),
      { where: filters, limit: 1 }
    )
    if (error) throw error
    return data?.[0] || null
  }

  async create(resource, data) {
    const { data: created, error } = await this.client
      .from(resource).insert(data).select().single()
    if (error) throw error
    return created
  }

  /**
   * Met à jour une ligne.
   * @param {boolean} [options.throwIfMissing=true] - Si false, retourne null au lieu de lever
   */
  async update(resource, id, data, options = {}) {
    const { throwIfMissing = true } = options

    const { data: updated, error } = await this.client
      .from(resource)
      .update(data)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw error

    if (!updated) {
      if (throwIfMissing) {
        throw new Error(`${resource} ${id} introuvable ou non modifiable`)
      }
      // Mode silencieux : utile pour les opérations best-effort (stock, logs...)
      return null
    }
    return updated
  }

  async delete(resource, id) {
    const { error } = await this.client.from(resource).delete().eq('id', id)
    if (error) throw error
    return true
  }

  async count(resource, filters = {}) {
    const { count, error } = await this._applyWhere(
      this.client.from(resource).select('*', { count: 'exact', head: true }),
      filters
    )
    if (error) throw error
    return count || 0
  }

  // ============ Real-time ============
  subscribe(resource, callback) {
    const channel = this.client
      .channel(`${resource}_changes`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: resource },
        payload => callback({ event: payload.eventType, new: payload.new, old: payload.old })
      )
      .subscribe()
    return channel
  }

  unsubscribe(channel) {
    if (channel) this.client.removeChannel(channel)
  }

  /**
   * Appelle une fonction RPC Postgres (ex: decrement_stock).
   * @param {string} fnName - nom de la fonction
   * @param {object} params - paramètres nommés
   */
  async rpc(fnName, params = {}) {
    const { data, error } = await this.client.rpc(fnName, params)
    if (error) throw error
    return data
  }

  async invoke(functionName, body = {}) {
    const { data, error } = await this.client.functions.invoke(functionName, { body })
    if (error) throw error
    return data
  }
}
