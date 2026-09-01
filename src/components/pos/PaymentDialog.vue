<template>
  <Modal :title="$t('invoiceCreate.payment')" @close="$emit('close')">
    <form class="payment-dialog" @submit.prevent="submit">
      <div class="total-display">{{ formatMoney(totalAmount) }}</div>

      <label class="field">
        {{ $t('pos.amountReceived') }}
        <input v-model.number="paidAmount" type="number" min="0" step="0.01" autofocus />
      </label>

      <label class="field">
        {{ $t('pos.paymentMethod') }}
        <select v-model="paymentMethod">
          <option value="cash">{{ $t('pos.cash') }}</option>
          <option value="card">{{ $t('pos.card') }}</option>
          <option value="transfer">{{ $t('pos.transfer') }}</option>
        </select>
      </label>

      <label class="field">
        {{ $t('pos.discountPercent') }}
        <input v-model.number="discountPercent" type="number" min="0" max="100" step="0.01" />
      </label>

      <p v-if="changeDue > 0" class="change">{{ $t('pos.changeDue') }}: <strong>{{ formatMoney(changeDue) }}</strong></p>
      <p v-else-if="remaining > 0" class="remaining">{{ $t('invoiceCreate.remaining') }}: <strong>{{ formatMoney(remaining) }}</strong></p>

      <div class="quick-amounts" :aria-label="$t('pos.quickAmounts')">
        <button v-for="amount in quickAmounts" :key="amount" type="button" @click="paidAmount = amount">
          {{ formatMoney(amount) }}
        </button>
      </div>

      <div class="actions">
        <button type="button" class="secondary" :disabled="submitting" @click="$emit('close')">{{ $t('common.cancel') }}</button>
        <button type="submit" class="primary" :disabled="!isPaymentValid || submitting">{{ submitting ? $t('pos.processingPayment') : $t('invoiceCreate.validate') }}</button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import Modal from '../common/Modal.vue'
import { computePaymentSummary } from '../../stores/invoices.js'
import { formatMoney } from '../../utils/format.js'

const props = defineProps({
  subtotal: { type: Number, required: true },
  initialDiscount: { type: Number, default: 0 },
  isPassager: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'confirm'])
const paidAmount = ref(0)
const discountPercent = ref(toDiscountPercent(props.initialDiscount, props.subtotal))
const paymentMethod = ref('cash')

watch(() => props.initialDiscount, value => {
  discountPercent.value = toDiscountPercent(value, props.subtotal)
})

const discountAmount = computed(() => Math.round(
  props.subtotal * Math.min(100, Math.max(0, Number(discountPercent.value) || 0)) / 100 * 100
) / 100)

const summary = computed(() => computePaymentSummary({
  totalAmount: props.subtotal,
  paidAmount: paidAmount.value,
  isPassager: props.isPassager,
  discountAmount: discountAmount.value
}))
const totalAmount = computed(() => summary.value.totalAmount)
const remaining = computed(() => summary.value.remaining)
const changeDue = computed(() => summary.value.changeDue)
const isPaymentValid = computed(() => summary.value.valid)
const quickAmounts = computed(() => {
  const total = totalAmount.value
  return [...new Set([total, Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50])]
    .filter(amount => amount >= total)
})

function submit() {
  if (!summary.value.valid) return
  emit('confirm', {
    paid_amount: paidAmount.value,
    discount_amount: discountAmount.value,
    payment_method: paymentMethod.value
  })
}

function toDiscountPercent(amount, subtotal) {
  if (!subtotal) return 0
  return Math.min(100, Math.max(0, Number(amount) / subtotal * 100))
}
</script>

<style scoped>
.payment-dialog { display: grid; gap: 14px; }
.total-display { color: #075b60; font-size: 2rem; font-weight: 700; text-align: center; }
.field { display: grid; gap: 5px; color: #374151; font-size: .9rem; font-weight: 600; }
.field input, .field select { box-sizing: border-box; width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; font: inherit; }
.change, .remaining { margin: 0; padding: 10px; border-radius: 6px; text-align: center; }
.change { background: #ecfdf5; color: #047857; }
.remaining { background: #fef2f2; color: #b91c1c; }
.quick-amounts { display: flex; flex-wrap: wrap; gap: 8px; }
.quick-amounts button { border: 1px solid #d1d5db; border-radius: 6px; background: #fff; padding: 7px 10px; cursor: pointer; }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.secondary, .primary { border: 0; border-radius: 6px; padding: 10px 16px; cursor: pointer; font-weight: 600; }
.secondary { background: #e5e7eb; color: #374151; }
.primary { background: #075b60; color: #fff; }
.primary:disabled { cursor: not-allowed; opacity: .5; }
</style>
