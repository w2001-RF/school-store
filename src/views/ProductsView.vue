<template>
  <div class="products-view">
    <div class="toolbar">
      <input v-model="search" @input="resetPage" :placeholder="`🔍 ${$t('common.search')}...`" class="search" />
      <button class="btn-secondary refresh-button" type="button" :disabled="store.loading" :title="$t('actions.refresh')" @click="refreshProducts">↻ {{ $t('actions.refresh') }}</button>
      <label class="select-all"><input type="checkbox" :checked="allSelected" @change="toggleAll" /> Tout sélectionner</label>
      <button v-if="selectedIds.size" class="bulk-delete" type="button" @click="requestBulkDelete">🗑️ Supprimer ({{ selectedIds.size }})</button>
      <button class="btn-secondary" @click="showBulk = true">📥 {{ $t('common.import') }}</button>
      <button class="btn-primary" @click="openForm()">+ {{ $t('productsView.new') }}</button>
    </div>
    <div v-if="store.loading" class="empty">{{ $t('common.loading') }}</div>
    <div v-else-if="filtered.length === 0" class="empty">{{ $t('productsView.noProducts') }}</div>
    <div v-else class="products-grid">
      <div v-for="p in paginated" :key="p.id" class="product-card">
        <input class="select-item" type="checkbox" :checked="selectedIds.has(p.id)" :aria-label="`Sélectionner ${p.name}`" @change="toggleSelection(p.id)" />
        <img v-if="p.image_url" :src="p.image_url" :alt="p.name" class="product-image" />
        <div class="product-head">
          <h3>{{ p.name }}</h3>
          <span class="badge" :class="{ low: p.stock < 10 }">{{ p.stock }} {{ $t('productsView.inStock') }}</span>
        </div>
        <p class="barcode">📊 {{ p.barcode }}</p>
        <p class="category" v-if="getCategoryName(p.category_id)">🏷️ {{ getCategoryName(p.category_id) }}</p>
        <p class="price">{{ formatMoney(p.price) }}</p>
        <div class="actions">
          <button class="btn-icon" @click="openForm(p)">✏️</button>
          <button class="btn-icon danger" @click="confirmDelete(p)">🗑️</button>
        </div>
      </div>
    </div>
    <Pagination :page="page" :total-pages="totalPages" :total-items="filtered.length" :page-size="pageSize" @change="goToPage" @update:page-size="changePageSize" />

    <Modal v-if="showForm" @close="showForm = false" :title="form.id ? $t('productsView.edit') : $t('productsView.newTitle')">
      <form @submit.prevent="save">
        <div class="form-group">
          <label>{{ $t('common.name') }} *</label>
          <input v-model="form.name" required />
        </div>
        <div class="form-group">
          <label>{{ $t('common.barcode') }} *</label>
          <input v-model="form.barcode" required />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ $t('common.price') }} *</label>
            <input v-model.number="form.price" type="number" step="0.01" min="0" required />
          </div>
          <div class="form-group">
            <label>{{ $t('common.stock') }}</label>
            <input v-model.number="form.stock" type="number" min="0" />
          </div>
        </div>
        <div class="form-group">
          <label>{{ $t('common.category') }}</label>
          <select v-model="form.category_id">
            <option :value="null">— {{ $t('productsView.noCategory') }} —</option>
            <option v-for="c in categoriesStore.items" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ $t('common.description') }}</label>
          <textarea v-model="form.description" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label>{{ $t('productsView.imageUrl') }}</label>
          <input v-model="form.image_url" type="url" placeholder="https://..." />
          <input type="file" accept="image/*" @change="loadImage" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="showForm = false">{{ $t('common.cancel') }}</button>
          <button type="submit" class="btn-primary">{{ $t('common.save') }}</button>
        </div>
      </form>
    </Modal>
    <BulkImportModal v-if="showBulk" :title="$t('productsView.importing')" :field-map="productFields" :create-rows="createRows" @close="showBulk = false" />
    <Modal v-if="deleteConfirmation" title="Supprimer les produits" @close="deleteConfirmation = false">
      <p>Cette action est définitive pour {{ selectedIds.size }} produit(s).</p>
      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="deleteConfirmation = false">Annuler</button>
        <button type="button" class="btn-danger" @click="confirmBulkDelete">Supprimer</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductsStore } from '../stores/products.js'
import { useCategoriesStore } from '../stores/categories.js'
import { db } from '../services/database/index.js'
import { formatMoney } from '../utils/format.js'
import Modal from '../components/common/Modal.vue'
import BulkImportModal from '../components/common/BulkImportModal.vue'
import Pagination from '../components/common/Pagination.vue'
import { usePagination } from '../composables/usePagination.js'

const store = useProductsStore()
const categoriesStore = useCategoriesStore()
const search = ref('')
const showForm = ref(false)
const showBulk = ref(false)
const form = ref({})
const selectedIds = ref(new Set())
const deleteConfirmation = ref(false)
const productFields = { name: ['name', 'nom'], barcode: ['barcode', 'code_barres', 'codebarres'], price: ['price', 'prix'], stock: ['stock'], category_id: ['category_id', 'categorie_id', 'categorie', 'category'], image_url: ['image_url', 'image'] }

onMounted(async () => {
  await Promise.all([store.fetchAll(), categoriesStore.fetchAll()])
})

async function refreshProducts() {
  await Promise.all([store.fetchAll(), categoriesStore.fetchAll()])
}

const filtered = computed(() => {
  if (!search.value) return store.items
  const s = search.value.toLowerCase()
  return store.items.filter(p =>
    p.name.toLowerCase().includes(s) ||
    (p.barcode || '').includes(s)
  )
})
const { page, pageSize, totalPages, paginated, goToPage, resetPage } = usePagination(filtered)
const allSelected = computed(() => paginated.value.length > 0 && paginated.value.every(product => selectedIds.value.has(product.id)))

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
  if (allSelected.value) paginated.value.forEach(product => next.delete(product.id))
  else paginated.value.forEach(product => next.add(product.id))
  selectedIds.value = next
}

function requestBulkDelete() {
  deleteConfirmation.value = true
}

async function confirmBulkDelete() {
  try {
    const currentPageIds = new Set(paginated.value.map(product => product.id))
    const idsToRemove = [...selectedIds.value].filter(id => currentPageIds.has(id))
    await store.removeMany(idsToRemove)
    selectedIds.value = new Set([...selectedIds.value].filter(id => !currentPageIds.has(id)))
    deleteConfirmation.value = false
  } catch (error) { alert(error.message) }
}

function getCategoryName(id) {
  return categoriesStore.items.find(c => c.id === id)?.name
}

function openForm(p = null) {
  form.value = p
    ? { ...p }
    : { name: '', barcode: '', price: 0, stock: 0, category_id: null, description: '', image_url: '' }
  showForm.value = true
}

function loadImage(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { form.value.image_url = reader.result }
  reader.readAsDataURL(file)
}

async function createRows(rows, onProgress = () => {}) {
  const barcodes = rows.map(row => String(row.barcode || '').trim())
  const missingBarcodeRow = rows.findIndex(row => !String(row.barcode || '').trim())
  if (missingBarcodeRow !== -1) throw new Error(`Code-barres manquant a la ligne ${missingBarcodeRow + 1}`)

  const repeatedBarcode = barcodes.find((barcode, index) => barcode && barcodes.indexOf(barcode) !== index)
  if (repeatedBarcode) throw new Error(`Code-barres duplique dans le fichier : ${repeatedBarcode}`)

  const existingProducts = await db.find('products', { where: { barcode: ['in', barcodes] } })
  if (existingProducts.length) {
    const existingBarcode = existingProducts[0].barcode
    throw new Error(`Ce code-barres existe deja : ${existingBarcode}. Supprimez-le du fichier ou utilisez un autre code.`)
  }

  for (const [index, row] of rows.entries()) {
    if (!row.name) throw new Error('Chaque produit doit avoir un nom')
    const category = categoriesStore.items.find(item => item.id === row.category_id || item.name.toLowerCase() === row.category_id?.toLowerCase())
    await store.create({ ...row, price: Number(row.price || 0), stock: Number(row.stock || 0), category_id: category?.id || null, image_url: row.image_url || '' })
    onProgress(index + 1)
  }
  showBulk.value = false
}

async function save() {
  try {
    if (form.value.id) {
      await store.update(form.value.id, form.value)
    } else {
      await store.create(form.value)
    }
    showForm.value = false
  } catch (e) { alert(e.message) }
}

async function confirmDelete(p) {
  if (confirm(`Supprimer "${p.name}" ?`)) await store.remove(p.id)
}
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.search { flex: 1; min-width: 200px; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 500; }
.btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; }
.select-all { display: inline-flex; align-items: center; gap: 6px; color: #374151; font-size: .9rem; }
.bulk-delete { padding: 10px 12px; border: 1px solid #fecaca; border-radius: 8px; background: #fef2f2; color: #b91c1c; cursor: pointer; }
.products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.product-card {
  background: white; border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow);
  display: flex; flex-direction: column; gap: 8px;
}
.product-card:hover { transform: translateY(-3px); box-shadow: 0 16px 30px rgba(23,48,66,.12); }
.select-item { align-self: flex-start; width: 16px; height: 16px; }
.product-image { width: 100%; height: 140px; object-fit: scale-down; border-radius: 8px; background: #f3f4f6; }
.product-head { display: flex; justify-content: space-between; align-items: start; gap: 8px; }
.product-head h3 { margin: 0; font-size: 1rem; }
.badge { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.badge.low { background: #fee2e2; color: #991b1b; }
.barcode, .category { margin: 0; font-size: 0.85rem; color: #6b7280; }
.price { margin: 8px 0; font-size: 1.3rem; font-weight: 700; color: #3b82f6; }
.actions { display: flex; gap: 8px; margin-top: auto; }
.btn-icon { background: #f3f4f6; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
.btn-icon:hover { background: #e4f1ef; transform: translateY(-1px); }
.btn-icon.danger:hover { background: #fee2e2; }
.empty { text-align: center; padding: 40px; color: #6b7280; }
.hint { color: #6b7280; font-size: .9rem; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 500; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.95rem; box-sizing: border-box;
}
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.btn-danger { background: #dc2626; color: white; border: none; padding: 10px 14px; border-radius: 6px; cursor: pointer; }
</style>
