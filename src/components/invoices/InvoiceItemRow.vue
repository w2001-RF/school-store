<template>
  <div class="invoice-item-row" :class="{ compact }">
    <div class="line-main">
      <div class="line-info">
        <div class="line-name">{{ line.product_name }}</div>
        <div class="line-meta">
          <span v-if="line.product_barcode" class="barcode">📊 {{ line.product_barcode }}</span>
          <span class="stock-hint" v-if="maxStock != null">
            {{ $t('pos.stock', { stock: maxStock }) }}
          </span>
        </div>
      </div>

      <div class="line-controls">
        <!-- Contrôle quantité -->
        <div class="qty-control" role="group" :aria-label="$t('pos.quantityOf', { name: line.product_name })">
          <button
            class="qty-btn"
            :disabled="line.quantity <= 1"
            @click="decrement"
            :aria-label="$t('pos.decreaseQuantity')"
          >−</button>
          <input
            type="number"
            class="qty-input"
            :value="line.quantity"
            :min="1"
            :max="maxStock || undefined"
            @input="onQuantityInput"
            @blur="validateQuantity"
            inputmode="numeric"
          />
          <button
            class="qty-btn"
            :disabled="maxStock != null && line.quantity >= maxStock"
            @click="increment"
            :aria-label="$t('pos.increaseQuantity')"
          >+</button>
        </div>

        <!-- Contrôle prix unitaire -->
        <div class="price-control">
          <label class="price-label">{{ $t('pos.unitPrice') }}</label>
          <input
            type="number"
            class="price-input"
            :value="line.unit_price"
            :min="0"
            step="0.01"
            @input="onPriceInput"
            @blur="validatePrice"
            inputmode="decimal"
          />
          <span class="currency">MAD</span>
        </div>

        <!-- Total de la ligne -->
        <div class="line-total">
          <div class="total-label">{{ $t('pos.lineTotal') }}</div>
          <div class="total-value">{{ formatMoney(line.total_price) }}</div>
        </div>

        <!-- Bouton supprimer -->
        <button
          v-if="removable"
          class="btn-remove"
          @click="$emit('remove')"
          :aria-label="$t('pos.removeFromInvoice', { name: line.product_name })"
          :title="$t('pos.removeFromInvoiceTitle')"
        >
          🗑️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatMoney } from '../../utils/format.js'

/**
 * InvoiceItemRow - ligne de facture interactive.
 *
 * Props :
 *   - line      : { product_id, product_name, product_barcode, quantity, unit_price, total_price }
 *   - maxStock  : nombre | null  (limite haute pour la quantité)
 *   - removable : boolean (afficher le bouton supprimer)
 *   - compact   : boolean (mode compact pour mobile)
 *
 * Émet :
 *   - update:line  : { quantity?, unit_price? }
 *   - remove       : aucun payload
 */
const props = defineProps({
  line: {
    type: Object,
    required: true,
    validator: (v) => {
      return v && typeof v.quantity === 'number' && typeof v.unit_price === 'number'
    }
  },
  maxStock: {
    type: Number,
    default: null
  },
  removable: {
    type: Boolean,
    default: true
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:line', 'remove'])

// ============== Helpers ==============
function clampQuantity(value) {
  let q = parseInt(value, 10)
  if (isNaN(q) || q < 1) q = 1
  if (props.maxStock != null && q > props.maxStock) q = props.maxStock
  return q
}

function clampPrice(value) {
  let p = parseFloat(value)
  if (isNaN(p) || p < 0) p = 0
  // Arrondi à 2 décimales
  return Math.round(p * 100) / 100
}

const lineTotal = computed(() => {
  return Math.round(props.line.quantity * props.line.unit_price * 100) / 100
})

// ============== Handlers ==============
function increment() {
  const newQty = Math.min(
    props.maxStock ?? Infinity,
    props.line.quantity + 1
  )
  emit('update:line', { quantity: newQty })
}

function decrement() {
  const newQty = Math.max(1, props.line.quantity - 1)
  emit('update:line', { quantity: newQty })
}

function onQuantityInput(event) {
  const newQty = clampQuantity(event.target.value)
  emit('update:line', { quantity: newQty })
}

function validateQuantity(event) {
  // Force la valeur clamped dans l'input
  event.target.value = clampQuantity(event.target.value)
}

function onPriceInput(event) {
  const newPrice = clampPrice(event.target.value)
  emit('update:line', { unit_price: newPrice })
}

function validatePrice(event) {
  const clamped = clampPrice(event.target.value)
  event.target.value = clamped
  // Réémet pour synchroniser le state si la valeur a été clampée
  if (clamped !== props.line.unit_price) {
    emit('update:line', { unit_price: clamped })
  }
}
</script>

<style scoped>
.invoice-item-row {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.invoice-item-row:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.08);
}

.line-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.line-info {
  flex: 1 1 200px;
  min-width: 0;
}

.line-name {
  font-weight: 500;
  color: #1f2937;
  word-break: break-word;
  line-height: 1.3;
}

.line-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.75rem;
  color: #6b7280;
  flex-wrap: wrap;
}

.barcode {
  font-family: monospace;
}

.stock-hint {
  color: #059669;
  background: #d1fae5;
  padding: 1px 6px;
  border-radius: 8px;
}

.line-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ====== Contrôle quantité ====== */
.qty-control {
  display: flex;
  align-items: center;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
  background: white;
}

.qty-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  transition: background 0.15s;
}
.qty-btn:hover:not(:disabled) {
  background: #e5e7eb;
}
.qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qty-input {
  width: 50px;
  height: 32px;
  text-align: center;
  border: none;
  border-left: 1px solid #e5e7eb;
  border-right: 1px solid #e5e7eb;
  font-size: 0.95rem;
  font-weight: 500;
  -moz-appearance: textfield;
}
.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.qty-input:focus {
  outline: none;
  background: #eff6ff;
}

/* ====== Contrôle prix ====== */
.price-control {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  background: white;
}

.price-label {
  font-size: 0.7rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.price-input {
  width: 70px;
  height: 32px;
  border: none;
  text-align: right;
  font-size: 0.95rem;
  font-weight: 500;
  -moz-appearance: textfield;
}
.price-input::-webkit-outer-spin-button,
.price-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.price-input:focus {
  outline: none;
  background: #eff6ff;
}

.currency {
  color: #6b7280;
  font-size: 0.85rem;
}

/* ====== Total ====== */
.line-total {
  text-align: right;
  min-width: 80px;
}

.total-label {
  font-size: 0.7rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.total-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: #3b82f6;
}

/* ====== Bouton supprimer ====== */
.btn-remove {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #991b1b;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-remove:hover {
  background: #fecaca;
  transform: scale(1.05);
}

/* ====== Mode compact (mobile) ====== */
.invoice-item-row.compact .line-main {
  flex-direction: column;
  align-items: stretch;
}

.invoice-item-row.compact .line-controls {
  justify-content: space-between;
}

@media (max-width: 640px) {
  .invoice-item-row {
    padding: 10px;
  }
  .line-controls {
    gap: 8px;
  }
  .qty-input {
    width: 40px;
  }
  .price-input {
    width: 60px;
  }
  .line-total {
    min-width: 70px;
  }
}
</style>
