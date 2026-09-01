<template>
  <Modal title="Choisir un client" @close="$emit('close')">
    <div class="search-dialog">
      <input ref="searchInput" v-model="query" type="search" placeholder="Nom, e-mail ou telephone" @keydown.enter.prevent="selectFirst" />
      <div v-if="matches.length" class="results">
        <button v-for="client in matches" :key="client.id" type="button" @click="$emit('select', client)">
          <span>{{ client.name }}</span>
          <small>{{ client.email || client.phone || 'Client' }}<template v-if="client.discount_percent"> - {{ client.discount_percent }} %</template></small>
        </button>
      </div>
      <p v-else-if="query" class="empty">Aucun client trouve.</p>
    </div>
  </Modal>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import Modal from '../common/Modal.vue'

const props = defineProps({ clients: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'select'])
const query = ref('')
const searchInput = ref(null)
const matches = computed(() => {
  const value = query.value.trim().toLowerCase()
  if (!value) return props.clients.slice(0, 12)
  return props.clients.filter(client =>
    [client.name, client.email, client.phone].some(field => (field || '').toLowerCase().includes(value))
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
