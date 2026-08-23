<template>
  <nav v-if="totalItems > 0" class="pagination" aria-label="Pagination">
    <span class="pagination-summary">{{ startItem }}-{{ endItem }} / {{ totalItems }}</span>
    <label class="page-size">
      Par page
      <select :value="pageSize" @change="$emit('update:page-size', Number($event.target.value))">
        <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
      </select>
    </label>
    <div class="page-actions">
      <button type="button" :disabled="page <= 1" @click="$emit('change', page - 1)">Precedent</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button type="button" :disabled="page >= totalPages" @click="$emit('change', page + 1)">Suivant</button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  pageSizes: { type: Array, default: () => [5, 10, 15, 20] }
})

defineEmits(['change', 'update:page-size'])

const startItem = computed(() => (props.page - 1) * props.pageSize + 1)
const endItem = computed(() => Math.min(props.page * props.pageSize, props.totalItems))
</script>

<style scoped>
.pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; padding: 12px 0; color: #6b7280; font-size: .9rem; flex-wrap: wrap; }
.page-size, .page-actions { display: flex; align-items: center; gap: 8px; }
.page-size select, .page-actions button { padding: 7px 10px; border: 1px solid #d1d5db; border-radius: 6px; background: white; color: #374151; }
.page-actions button { cursor: pointer; }
.page-actions button:disabled { cursor: not-allowed; opacity: .5; }
@media (max-width: 600px) { .pagination { align-items: stretch; flex-direction: column; } .page-actions { justify-content: space-between; } }
</style>
