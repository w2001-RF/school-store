import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../services/database/index.js'

export const useProductsStore = defineStore('products', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(options = {}) {
    loading.value = true
    try {
      items.value = await db.find('products', {
        orderBy: { field: 'name', ascending: true },
        ...options
      })
    } catch (e) { error.value = e.message }
    finally { loading.value = false }
  }

  async function findByBarcode(barcode) {
    return await db.findOne('products', { barcode })
  }

  async function create(data) {
    const created = await db.create('products', data)
    items.value.push(created)
    return created
  }

  async function update(id, data) {
    const updated = await db.update('products', id, data)
    const idx = items.value.findIndex(p => p.id === id)
    if (idx !== -1) items.value[idx] = updated
    return updated
  }

  async function remove(id) {
    await db.delete('products', id)
    items.value = items.value.filter(p => p.id !== id)
  }

  async function removeMany(ids) {
    for (const id of ids) await db.delete('products', id)
    const selected = new Set(ids)
    items.value = items.value.filter(product => !selected.has(product.id))
  }

  async function adjustStock(id, delta) {
    const product = await db.findById('products', id)
    if (!product) throw new Error('Produit introuvable')
    return await update(id, { stock: Math.max(0, product.stock + delta) })
  }

  return { items, loading, error, fetchAll, findByBarcode, create, update, remove, removeMany, adjustStock }
})
