<template>
  <Modal title="Ajouter un produit" @close="$emit('close')">
    <div class="search-dialog">
      <input ref="searchInput" v-model="query" type="search" placeholder="Nom ou code-barres" @keydown.enter.prevent="selectFirst" />
      <div v-if="matches.length" class="results">
        <button v-for="product in matches" :key="product.id" type="button" @click="$emit('select', product)">
          <span>{{ product.name }}</span>
          <small>{{ product.barcode || 'Sans code-barres' }} - {{ formatMoney(product.price) }}</small>
        </button>
      </div>
      <p v-else-if="query" class="empty">Aucun produit trouve.</p>
    </div>
  </Modal>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import Modal from '../common/Modal.vue'
import { formatMoney } from '../../utils/format.js'

const props = defineProps({ products: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'select'])
const query = ref('')
const searchInput = ref(null)
const matches = computed(() => {
  const value = query.value.trim().toLowerCase()
  if (!value) return props.products.slice(0, 12)
  return props.products.filter(product =>
    product.name.toLowerCase().includes(value) || (product.barcode || '').toLowerCase().includes(value)
  ).slice(0, 12)
})

onMounted(async () => {
  await nextTick()
  searchInput.value?.focus()
})

function selectFirst() {
  if (matches.value[0]) emit('select', matches.value[0])
}
</script>

<style scoped>
.search-dialog { display: grid; gap: 12px; }
input { box-sizing: border-box; width: 100%; border: 1px solid #9ca3af; border-radius: 6px; padding: 10px; font: inherit; }
.results { display: grid; border: 1px solid #e5e7eb; border-radius: 6px; max-height: 360px; overflow: auto; }
.results button { display: grid; gap: 3px; border: 0; border-bottom: 1px solid #e5e7eb; background: #fff; cursor: pointer; padding: 10px; text-align: left; }
.results button:last-child { border-bottom: 0; }
.results button:hover { background: #f3f4f6; }
small, .empty { color: #6b7280; }
.empty { margin: 0; text-align: center; }
</style>
