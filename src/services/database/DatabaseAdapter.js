/**
 * Interface abstraite pour tous les adapters de base de données.
 * Chaque adapter concret (Supabase, Firebase, Local...) doit implémenter
 * ces méthodes avec la même signature.
 *
 * FORMAT DE REQUÊTE UNIFIÉ (utilisé par find, count, etc.) :
 * {
 *   where:    { field: value | [op, value] },
 *   orderBy:  { field: 'name', ascending: true },
 *   limit:    10,
 *   offset:   0,
 *   select:   'id, name, price'      // optionnel
 * }
 *
 * Opérateurs supportés dans where :
 *   ['eq', value]      égal (défaut)
 *   ['neq', value]     différent
 *   ['gt', value]      supérieur
 *   ['gte', value]     supérieur ou égal
 *   ['lt', value]      inférieur
 *   ['lte', value]     inférieur ou égal
 *   ['like', value]    LIKE %value%
 *   ['ilike', value]   LIKE insensible à la casse
 *   ['in', [v1,v2]]    dans la liste
 */
export class DatabaseAdapter {
  // ============== AUTH ==============
  async signIn(credentials) { throw this._e('signIn') }
  async signUp(credentials) { throw this._e('signUp') }
  async signOut() { throw this._e('signOut') }
  async getCurrentUser() { throw this._e('getCurrentUser') }
  onAuthStateChange(_callback) { throw this._e('onAuthStateChange') }

  // ============== CRUD GÉNÉRIQUE ==============
  async find(_resource, _options = {}) { throw this._e('find') }
  async findById(_resource, _id) { throw this._e('findById') }
  async findOne(_resource, _filters = {}) { throw this._e('findOne') }
  async create(_resource, _data) { throw this._e('create') }
  async update(_resource, _id, _data) { throw this._e('update') }
  async delete(_resource, _id) { throw this._e('delete') }
  async count(_resource, _filters = {}) { throw this._e('count') }

  // ============== REAL-TIME ==============
  subscribe(_resource, _callback) { throw this._e('subscribe') }
  unsubscribe(_channel) { throw this._e('unsubscribe') }

  _e(method) {
    return new Error(`DatabaseAdapter: méthode "${method}" non implémentée`)
  }
}
