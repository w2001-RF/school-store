<template>
  <section class="pos-summary">
    <div class="summary-row"><span>{{ $t('pos.subtotal') }}</span><span>{{ formatMoney(subtotal) }}</span></div>
    <div v-if="discountAmount > 0" class="summary-row discount"><span>{{ $t('pos.discount') }}</span><span>-{{ formatMoney(discountAmount) }}</span></div>
    <div class="summary-row total"><span>{{ $t('pos.total') }}</span><span>{{ formatMoney(totalAmount) }}</span></div>
    <button type="button" class="pay" :disabled="!hasItems" @click="$emit('pay')">{{ $t('pos.proceedPayment') }}</button>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { formatMoney } from '../../utils/format.js'

const props = defineProps({
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  hasItems: { type: Boolean, default: false }
})
defineEmits(['pay'])
const totalAmount = computed(() => Math.max(0, props.subtotal - props.discountAmount))
</script>

<style scoped>
.pos-summary { border-top: 2px solid #e5e7eb; display: grid; gap: 8px; padding-top: 14px; }
.summary-row { display: flex; justify-content: space-between; gap: 16px; }
.discount { color: #047857; }
.total { border-top: 1px dashed #d1d5db; color: #075b60; font-size: 1.2rem; font-weight: 700; padding-top: 10px; text-transform: uppercase; }
.pay { border: 0; border-radius: 6px; background: #075b60; color: #fff; cursor: pointer; font-size: 1rem; font-weight: 700; margin-top: 8px; padding: 14px; }
.pay:disabled { cursor: not-allowed; opacity: .5; }
</style>
