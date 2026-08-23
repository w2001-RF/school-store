<template>
  <div>
    <div class="toolbar">
      <h2>🏷️ {{ $t('categoriesView.title') }}</h2>
      <button class="btn-secondary refresh-button" type="button" :disabled="refreshing" :title="$t('actions.refresh')" @click="refreshCategories">↻ {{ $t('actions.refresh') }}</button>
      <label class="select-all"><input type="checkbox" :checked="allSelected" @change="toggleAll" /> Tout sélectionner</label>
      <button v-if="selectedIds.size" class="bulk-delete" type="button" @click="requestBulkDelete">🗑️ Supprimer ({{ selectedIds.size }})</button>
      <button class="btn-secondary" @click="showBulk = true">📥 {{ $t('common.import') }}</button>
      <button class="btn-primary" @click="openForm()">+ {{ $t('categoriesView.new') }}</button>
    </div>
    <div class="categories-grid">
      <div v-for="c in paginated" :key="c.id" class="cat-card">
        <input class="select-item" type="checkbox" :checked="selectedIds.has(c.id)" :aria-label="`Sélectionner ${c.name}`" @change="toggleSelection(c.id)" />
        <h3>{{ c.name }}</h3>
        <p v-if="c.description">{{ c.description }}</p>
        <div class="actions">
          <button @click="openForm(c)">✏️</button>
          <button @click="remove(c)" class="danger">🗑️</button>
        </div>
      </div>
    </div>
    <Pagination :page="page" :total-pages="totalPages" :total-items="store.items.length" :page-size="pageSize" @change="goToPage" @update:page-size="changePageSize" />
    <Modal v-if="showForm" @close="showForm = false" :title="form.id ? $t('categoriesView.edit') : $t('categoriesView.new')">
      <form @submit.prevent="save">
        <div class="form-group">
          <label>{{ $t('common.name') }} *</label>
          <input v-model="form.name" required />
        </div>
        <div class="form-group">
          <label>{{ $t('common.description') }}</label>
          <textarea v-model="form.description" rows="2"></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="showForm = false">{{ $t('common.cancel') }}</button>
          <button type="submit" class="btn-primary">{{ $t('common.save') }}</button>
        </div>
      </form>
    </Modal>
    <BulkImportModal v-if="showBulk" :title="$t('categoriesView.importing')" :field-map="categoryFields" :create-rows="createRows" @close="showBulk = false" />
    <Modal v-if="deleteConfirmation" title="Supprimer les catégories" @close="deleteConfirmation = false">
      <p>Cette action est définitive pour {{ selectedIds.size }} catégorie(s).</p>
      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="deleteConfirmation = false">Annuler</button>
        <button type="button" class="btn-danger" @click="confirmBulkDelete">Supprimer</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCategoriesStore } from '../stores/categories.js'
import Modal from '../components/common/Modal.vue'
import BulkImportModal from '../components/common/BulkImportModal.vue'
import Pagination from '../components/common/Pagination.vue'
import { usePagination } from '../composables/usePagination.js'

const store = useCategoriesStore()
const showForm = ref(false)
const showBulk = ref(false)
const form = ref({})
const selectedIds = ref(new Set())
const deleteConfirmation = ref(false)
const categoryFields = { name: ['name', 'nom'], description: ['description'] }
const refreshing = ref(false)
onMounted(() => store.fetchAll())

async function refreshCategories() {
  refreshing.value = true
  try { await store.fetchAll() } finally { refreshing.value = false }
}
const categoryItems = computed(() => store.items)
const { page, pageSize, totalPages, paginated, goToPage, resetPage } = usePagination(categoryItems)
const allSelected = computed(() => paginated.value.length > 0 && paginated.value.every(category => selectedIds.value.has(category.id)))

function changePageSize(size) {
  pageSize.value = size
  resetPage()
}

function toggleSelection(id) {
  const next = new Set(selectedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedIds.value = next
}

function toggleAll() {
  const next = new Set(selectedIds.value)
  if (allSelected.value) paginated.value.forEach(category => next.delete(category.id))
  else paginated.value.forEach(category => next.add(category.id))
  selectedIds.value = next
}

function requestBulkDelete() {
  deleteConfirmation.value = true
}

async function confirmBulkDelete() {
  try {
    const currentPageIds = new Set(paginated.value.map(category => category.id))
    const idsToRemove = [...selectedIds.value].filter(id => currentPageIds.has(id))
    await store.removeMany(idsToRemove)
    selectedIds.value = new Set([...selectedIds.value].filter(id => !currentPageIds.has(id)))
    deleteConfirmation.value = false
  } catch (error) { alert(error.message) }
}

function openForm(c = null) {
  form.value = c ? { ...c } : { name: '', description: '' }
  showForm.value = true
}
async function save() {
  try {
    if (form.value.id) await store.update(form.value.id, form.value)
    else await store.create(form.value)
    showForm.value = false
  } catch (e) { alert(e.message) }
}
async function remove(c) {
  if (confirm(`Supprimer "${c.name}" ?`)) await store.remove(c.id)
}

async function createRows(rows, onProgress = () => {}) {
  for (const [index, row] of rows.entries()) {
    if (!row.name) throw new Error('Chaque catégorie doit avoir un nom')
    await store.create(row)
    onProgress(index + 1)
  }
  showBulk.value = false
}
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.toolbar h2 { margin: 0; }
.refresh-button { white-space: nowrap; }
.select-all { display: inline-flex; align-items: center; gap: 6px; color: #374151; font-size: .9rem; }
.bulk-delete { padding: 10px 12px; border: 1px solid #fecaca; border-radius: 6px; background: #fef2f2; color: #b91c1c; cursor: pointer; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; }
.btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; }
.hint { color: #6b7280; font-size: .9rem; }
.categories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.cat-card { background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.select-item { width: 16px; height: 16px; margin-bottom: 8px; }
.cat-card h3 { margin: 0 0 6px; }
.cat-card p { color: #6b7280; margin: 0 0 12px; font-size: 0.9rem; }
.actions { display: flex; gap: 6px; }
.actions button { background: #f3f4f6; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
.actions .danger:hover { background: #fee2e2; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 500; }
.form-group input, .form-group textarea { width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.btn-danger { background: #dc2626; color: white; border: none; padding: 10px 14px; border-radius: 6px; cursor: pointer; }
</style>
