import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../services/database/index.js'
import { useProductsStore } from './products.js'
import { useAuthStore } from './auth.js'

export const useInvoicesStore = defineStore('invoices', () => {
  const items = ref([])
  const current = ref(null) // facture en cours de création
  const loading = ref(false)

  const currentTotal = computed(() =>
    (current.value?.lines || []).reduce((s, l) => s + l.total_price, 0)
  )

  function newDraft() {
    current.value = {
      invoice_number: generateInvoiceNumber(),
      client_id: null,
      customer_name: '',
      lines: [],
      status: 'pending'
    }
  }

  function generateInvoiceNumber() {
    const d = new Date()
    return `INV-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${crypto.randomUUID().split('-')[0]}` // Prevent collision
  }

  async function addProductByBarcode(barcode) {
    const productsStore = useProductsStore()
    const product = await productsStore.findByBarcode(barcode)
    if (!product) throw new Error(`Produit avec code "${barcode}" introuvable`)
    if (!current.value) newDraft()
    const clientPrice = current.value.client_id
      ? await db.findOne('client_product_prices', { client_id: current.value.client_id, product_id: product.id })
      : null
    const client = current.value.client_id
      ? await db.findById('clients', current.value.client_id)
      : null
    const unitPrice = clientPrice?.price != null
      ? Number(clientPrice.price)
      : Number(product.price) * (1 - Number(client?.discount_percent || 0) / 100)
    const existing = current.value.lines.find(l => l.product_id === product.id)
    if (existing) {
      existing.quantity += 1
      existing.total_price = existing.quantity * existing.unit_price
    } else {
      current.value.lines.push({
        product_id: product.id,
        product_name: product.name,
        product_barcode: product.barcode,
        quantity: 1,
        unit_price: unitPrice,
        total_price: unitPrice
      })
    }
    return product
  }

  function updateLine(index, changes) {
    const line = current.value.lines[index]
    Object.assign(line, changes)
    line.total_price = line.quantity * line.unit_price
  }

  function removeLine(index) {
    current.value.lines.splice(index, 1)
  }

  async function applyClientPricing(clientId) {
    if (!current.value) newDraft()
    current.value.client_id = clientId || null
    for (const line of current.value.lines) {
      const clientPrice = clientId
        ? await db.findOne('client_product_prices', { client_id: clientId, product_id: line.product_id })
        : null
      const product = await db.findById('products', line.product_id)
      const client = clientId ? await db.findById('clients', clientId) : null
      const unitPrice = clientPrice?.price != null
        ? Number(clientPrice.price)
        : Number(product?.price || line.unit_price) * (1 - Number(client?.discount_percent || 0) / 100)
      line.unit_price = unitPrice
      line.total_price = line.quantity * unitPrice
    }
  }

  async function validate(payment) {
    if (!current.value) throw new Error('Aucune facture en cours')
    if (current.value.lines.length === 0) throw new Error('Facture vide')

    const auth = useAuthStore()
    const productsStore = useProductsStore()

    // 1) Client
    const defaultClients = current.value.client_id
      ? []
      : await db.find('clients', { where: { name: ['ilike', 'passager'] }, limit: 1 })
    const clientId = current.value.client_id || defaultClients[0]?.id || null

    if (typeof payment.paid_amount !== 'number' || isNaN(payment.paid_amount) || payment.paid_amount < 0 || payment.paid_amount > currentTotal.value) {
        throw new Error('Le montant payé est invalide.')
    }

    const payload = {
      invoice_number: current.value.invoice_number,
      agent_id: auth.user.id,
      client_id: clientId,
      customer_name: current.value.customer_name || null,
      total_amount: currentTotal.value,
      paid_amount: payment.paid_amount,
      status: payment.paid_amount >= currentTotal.value ? 'paid' : 'pending'
    }

    loading.value = true
    try {
      // 2) Snapshot des produits
      const snapshots = await Promise.all(
        current.value.lines.map(line => db.findById('products', line.product_id))
      )

      // 3) Vérification du stock
      for (let i = 0; i < current.value.lines.length; i++) {
        const line = current.value.lines[i]
        const p = snapshots[i]
        if (!p) throw new Error(`Produit "${line.product_name}" introuvable`)
        if (p.stock < line.quantity) {
          throw new Error(`Stock insuffisant pour "${line.product_name}" (${p.stock} dispo, ${line.quantity} demandés)`)
        }
      }

      // 4) Création facture + lignes
      const invoice = await db.create('invoices', payload)
      try {
        for (const line of current.value.lines) {
          await db.create('invoice_items', { ...line, invoice_id: invoice.id })
        }
      } catch (e) {
        await db.delete('invoices', invoice.id).catch(() => {})
        throw e
      }

      // 5) Décrémentation du stock (best-effort + tolérant)
      for (let i = 0; i < current.value.lines.length; i++) {
        const line = current.value.lines[i]
        const p = snapshots[i]
        const newStock = Math.max(0, p.stock - line.quantity)

        try {
          // Option A : RPC atomique (préféré si déployé)
          if (typeof db.rpc === 'function' && db.constructor.name === 'SupabaseAdapter') {
            await db.rpc('decrement_stock', {
              p_product_id: line.product_id,
              p_quantity: line.quantity
            })
          } else {
            // Option B : UPDATE direct, tolère les échecs RLS
            await db.update('products', line.product_id, { stock: newStock }, { throwIfMissing: false })
          }
        } catch (e) {
          console.warn(`[stock] Échec décrémentation pour ${line.product_name} :`, e.message)
        }
      }

      // 6) Refresh du cache produits
      await productsStore.fetchAll()

      current.value = null
      return invoice
    } finally {
      loading.value = false
    }
  }

  async function fetchAll() {
    loading.value = true
    try {
      const invoices = await db.find('invoices', { orderBy: { field: 'created_at', ascending: false } })
      items.value = await Promise.all(invoices.map(withAgent))
    } finally { loading.value = false }
  }

  async function withAgent(invoice) {
    if (!invoice?.agent_id) return { ...invoice, agent_name: null }
    const agent = await db.findById('profiles', invoice.agent_id)
    return { ...invoice, agent_name: agent?.full_name || agent?.fullName || agent?.email || null }
  }

  async function fetchWithItems(id) {
    const invoice = await db.findById('invoices', id)
    const lines = await db.find('invoice_items', { where: { invoice_id: id } })
    return { ...(await withAgent(invoice)), items: lines }
  }

  async function updateStatus(id, status) {
    if (!['pending', 'paid', 'cancelled'].includes(status)) {
      throw new Error('Statut de facture invalide')
    }
    const updated = await db.update('invoices', id, { status })
    const index = items.value.findIndex(invoice => invoice.id === id)
    if (index !== -1) items.value[index] = { ...items.value[index], ...updated }
    return updated
  }

  async function remove(id) {
    await db.delete('invoices', id)
    items.value = items.value.filter(invoice => invoice.id !== id)
  }

  async function removeMany(ids) {
    for (const id of ids) await db.delete('invoices', id)
    const selected = new Set(ids)
    items.value = items.value.filter(invoice => !selected.has(invoice.id))
  }

  return {
    items, current, loading, currentTotal,
    newDraft, addProductByBarcode, applyClientPricing, updateLine, removeLine,
    validate, fetchAll, fetchWithItems, updateStatus, remove, removeMany
  }
})
