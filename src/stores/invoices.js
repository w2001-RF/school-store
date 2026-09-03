import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../services/database/index.js'
import { useProductsStore } from './products.js'
import { useAuthStore } from './auth.js'

export function computePaymentSummary({
  totalAmount,
  paidAmount,
  isPassager = false,
  discountAmount = 0
}) {
  const netTotal = Math.max(0, Number(totalAmount) || 0)
  const discount = Number(discountAmount)
  const totalDue = Math.max(0, netTotal - discount)
  const safePaid = Number(paidAmount)

  if (Number.isNaN(discount) || discount < 0 || discount > netTotal) {
    return {
      valid: false,
      totalAmount: netTotal,
      paidAmount: safePaid,
      discountAmount: discount,
      remaining: netTotal,
      changeDue: 0,
      status: 'pending',
      error: 'La remise doit etre comprise entre 0 et 100 %.'
    }
  }

  if (Number.isNaN(safePaid) || safePaid < 0) {
    return {
      valid: false,
      totalAmount: totalDue,
      paidAmount: safePaid,
      discountAmount: discount,
      remaining: totalDue,
      changeDue: 0,
      status: 'pending',
      error: 'Le montant payé est invalide.'
    }
  }

  if (isPassager && safePaid < totalDue) {
    return {
      valid: false,
      totalAmount: totalDue,
      paidAmount: safePaid,
      discountAmount: discount,
      remaining: Math.max(0, totalDue - safePaid),
      changeDue: 0,
      status: 'pending',
      error: 'Le paiement complet est requis pour un client passager.'
    }
  }

  const remaining = Math.max(0, totalDue - safePaid)
  const changeDue = Math.max(0, safePaid - totalDue)

  return {
    valid: true,
    totalAmount: totalDue,
    paidAmount: safePaid,
    discountAmount: discount,
    remaining,
    changeDue,
    status: safePaid >= totalDue ? 'paid' : 'pending',
    error: null
  }
}

export const useInvoicesStore = defineStore('invoices', () => {
  const items = ref([])
  const current = ref(null) // facture en cours de création
  const loading = ref(false)

  const currentTotal = computed(() =>
    (current.value?.lines || []).reduce((s, l) => s + l.total_price, 0)
  )

  const currentDiscount = computed(() => Number(current.value?.discount_amount || 0))
  const currentAmountDue = computed(() => Math.max(0, currentTotal.value - currentDiscount.value))

  function newDraft() {
    current.value = {
      invoice_number: generateInvoiceNumber(),
      client_id: null,
      customer_name: '',
      lines: [],
      discount_amount: 0,
      payment_method: 'cash',
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

    const normalizedPayment = {
      paid_amount: Number(payment?.paid_amount ?? 0),
      discount_amount: Number(payment?.discount_amount ?? current.value.discount_amount ?? 0),
      payment_method: payment?.payment_method || current.value.payment_method || 'cash'
    }

    // 1) Client
    const defaultClients = current.value.client_id
      ? []
      : await db.find('clients', { where: { name: ['ilike', 'passager'] }, limit: 1 })
    const clientId = current.value.client_id || defaultClients[0]?.id || null
    const client = clientId ? await db.findById('clients', clientId) : null
    const isPassager = !client || client.name?.toLowerCase() === 'passager'

    const summary = computePaymentSummary({
      totalAmount: currentTotal.value,
      paidAmount: normalizedPayment.paid_amount,
      isPassager,
      discountAmount: normalizedPayment.discount_amount
    })

    if (!summary.valid) {
      throw new Error(summary.error)
    }

    current.value.discount_amount = normalizedPayment.discount_amount
    current.value.payment_method = normalizedPayment.payment_method

    if (db.constructor.name === 'SupabaseAdapter') {
      loading.value = true
      try {
        const invoice = await db.rpc('create_invoice_transaction', {
          p_invoice_number: current.value.invoice_number,
          p_client_id: clientId,
          p_customer_name: current.value.customer_name || null,
          p_lines: current.value.lines.map(line => ({
            product_id: line.product_id,
            quantity: Number(line.quantity)
          })),
          p_discount_amount: normalizedPayment.discount_amount,
          p_payment_amount: normalizedPayment.paid_amount,
          p_payment_method: normalizedPayment.payment_method,
          p_payment_reference: payment?.payment_reference || null
        })

        await productsStore.fetchAll()
        current.value = null
        return invoice
      } finally {
        loading.value = false
      }
    }

    const payload = {
      invoice_number: current.value.invoice_number,
      agent_id: auth.user.id,
      client_id: clientId,
      customer_name: current.value.customer_name || null,
      total_amount: summary.totalAmount,
      paid_amount: normalizedPayment.paid_amount,
      discount_amount: normalizedPayment.discount_amount,
      payment_method: normalizedPayment.payment_method,
      status: summary.status
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
        if (normalizedPayment.paid_amount > 0) {
          await db.create('payments', {
            invoice_id: invoice.id,
            recorded_by: auth.user.id,
            amount: normalizedPayment.paid_amount,
            method: normalizedPayment.payment_method,
            payment_reference: payment?.payment_reference || null,
            paid_at: new Date().toISOString()
          })
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
            await productsStore.logStockAdjustment({
              productId: line.product_id,
              delta: -line.quantity,
              reason: 'sale',
              invoiceId: invoice.id,
              changedBy: auth.user?.id
            })
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
    const payments = await db.find('payments', {
      where: { invoice_id: id },
      orderBy: { field: 'paid_at', ascending: false }
    })
    return { ...(await withAgent(invoice)), items: lines, payments }
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

  // Retour d'articles : remet le stock, ne touche pas aux montants de la facture (pas de note de crédit)
  async function returnItems(invoiceId, returns) {
    if (!returns?.length) throw new Error('Aucun article à retourner')
    const productsStore = useProductsStore()
    const auth = useAuthStore()

    for (const { itemId, productId, quantity } of returns) {
      const qty = Number(quantity)
      if (!qty || qty <= 0) continue

      const item = await db.findById('invoice_items', itemId)
      if (!item) throw new Error('Ligne de facture introuvable')
      const alreadyReturned = Number(item.returned_quantity || 0)
      const maxReturnable = Number(item.quantity) - alreadyReturned
      if (qty > maxReturnable) {
        throw new Error(`Quantité de retour invalide pour "${item.product_name}" (max ${maxReturnable})`)
      }

      await db.update('invoice_items', itemId, { returned_quantity: alreadyReturned + qty })

      const product = await db.findById('products', productId)
      if (product) {
        await db.update('products', productId, { stock: product.stock + qty }, { throwIfMissing: false })
      }
      await productsStore.logStockAdjustment({
        productId,
        delta: qty,
        reason: 'return',
        invoiceId,
        changedBy: auth.user?.id
      })
    }

    await productsStore.fetchAll()
    return await fetchWithItems(invoiceId)
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
    items, current, loading, currentTotal, currentDiscount, currentAmountDue,
    newDraft, addProductByBarcode, applyClientPricing, updateLine, removeLine,
    validate, fetchAll, fetchWithItems, updateStatus, returnItems, remove, removeMany
  }
})
