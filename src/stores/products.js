import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../services/database/index.js'
import { useAuthStore } from './auth.js'
import { APP_CONFIG } from '../config/index.js'

export function isLowStock(product) {
  const threshold = product?.low_stock_threshold ?? APP_CONFIG.lowStockThreshold
  return Number(product?.stock ?? 0) < Number(threshold)
}

export const useProductsStore = defineStore('products', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  const lowStockItems = computed(() => items.value.filter(isLowStock))

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

  async function adjustStock(id, delta, reason = 'correction') {
    const product = await db.findById('products', id)
    if (!product) throw new Error('Produit introuvable')
    const auth = useAuthStore()
    const updated = await update(id, { stock: Math.max(0, product.stock + delta) })
    await logStockAdjustment({ productId: id, delta, reason, changedBy: auth.user?.id })
    return updated
  }

  async function logStockAdjustment({ productId, delta, reason, invoiceId = null, changedBy = null }) {
    try {
      await db.create('stock_adjustments', {
        product_id: productId,
        invoice_id: invoiceId,
        changed_by: changedBy,
        quantity_delta: delta,
        reason
      })
    } catch (e) {
      // Best-effort: absence de la table ne doit pas bloquer l'opération métier
      console.warn('[stock_adjustments] échec de journalisation :', e.message)
    }
  }

  return { items, loading, error, lowStockItems, fetchAll, findByBarcode, create, update, remove, removeMany, adjustStock, logStockAdjustment }
})
