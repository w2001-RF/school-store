<template>
  <Modal :title="title" @close="$emit('close')">
    <div class="import-form">
      <label class="file-picker">
        <span>{{ $t('bulkImport.chooseFile') }}</span>
        <input type="file" :accept="acceptedExtensions" @change="readFile" />
      </label>
      <p class="formats">{{ $t('bulkImport.formats') }}</p>
      <p class="hint">{{ $t('common.importHint') }}</p>
      <textarea v-model="manualText" rows="7" :placeholder="$t('bulkImport.paste')"></textarea>
      <p v-if="fileName" class="file-name">{{ fileName }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <div v-if="loading" class="loading-state" role="status" aria-live="polite">
        <span>{{ $t('common.loading') }}</span>
        <div class="loading-bar"><span></span></div>
        <div v-if="progress > 0" class="progress-track" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
          <span :style="{ width: `${progress}%` }"></span>
        </div>
        <small v-if="progress > 0">{{ progress }}%</small>
      </div>
      <div v-if="rows.length" class="preview">
        <strong>{{ $t('bulkImport.preview', { count: rows.length }) }}</strong>
        <div class="preview-scroll">
          <table class="preview-table">
            <thead>
              <tr><th v-for="field in fields" :key="field">{{ field }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
                <td v-for="field in fields" :key="field">
                  <input v-model="row[field]" :aria-label="`${field} ${rowIndex + 1}`" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="$emit('close')">{{ $t('common.cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="loading || !rows.length" @click="importRows">
          {{ loading ? $t('bulkImport.importing') : $t('bulkImport.importRows', { count: rows.length }) }}
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import Modal from './Modal.vue'
import { parseImportFile, importers } from '../../services/imports/index.js'

const props = defineProps({
  title: { type: String, required: true },
  fieldMap: { type: Object, required: true },
  createRows: { type: Function, required: true }
})
defineEmits(['close'])

const file = ref(null)
const fileName = ref('')
const manualText = ref('')
const rows = ref([])
const error = ref('')
const loading = ref(false)
const progress = ref(0)
const acceptedExtensions = computed(() => importers.flatMap(importer => importer.extensions).join(','))
const fields = computed(() => Object.keys(props.fieldMap))

watch(manualText, async value => {
  if (file.value || !value.trim()) return
  await parseText(value)
})

async function readFile(event) {
  file.value = event.target.files?.[0] || null
  fileName.value = file.value?.name || ''
  manualText.value = ''
  if (file.value) await parseFile(file.value)
}

async function parseFile(selectedFile) {
  error.value = ''
  loading.value = true
  try { rows.value = (await parseImportFile(selectedFile, props.fieldMap)).rows }
  catch (importError) { rows.value = []; error.value = importError.message }
  finally { loading.value = false }
}

async function parseText(value) {
  const isJson = /^[\s\r\n]*[\[{]/.test(value)
  const textFile = new File([value], isJson ? 'manual.json' : 'manual.csv', { type: isJson ? 'application/json' : 'text/csv' })
  await parseFile(textFile)
}

async function importRows() {
  loading.value = true
  progress.value = 0
  error.value = ''
  try {
    await props.createRows(rows.value, completed => {
      progress.value = Math.round((completed / rows.value.length) * 100)
    })
    rows.value = []
    file.value = null
    manualText.value = ''
  } catch (importError) { error.value = importError.message }
  finally {
    loading.value = false
    progress.value = 0
  }
}
</script>

<style scoped>
.import-form { display: grid; gap: 10px; }
.file-picker { display: inline-flex; width: fit-content; padding: 10px 14px; border-radius: 6px; background: #e5e7eb; cursor: pointer; }
.file-picker input { display: none; }
.formats, .hint, .file-name { margin: 0; color: #6b7280; font-size: .88rem; }
.import-form textarea { width: 100%; box-sizing: border-box; resize: vertical; padding: 9px 10px; border: 1px solid #d1d5db; border-radius: 6px; font: inherit; }
.preview { display: grid; gap: 5px; padding: 10px; background: #f9fafb; border-radius: 6px; font-size: .88rem; }
.preview-row { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #4b5563; }
.error { margin: 0; color: #b91c1c; background: #fef2f2; padding: 8px; border-radius: 6px; }
.preview-scroll { max-width: 100%; max-height: 280px; overflow: auto; border: 1px solid #e5e7eb; }
.preview-table { min-width: 620px; border-collapse: collapse; font-size: .85rem; }
.preview-table th, .preview-table td { padding: 6px; border: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
.preview-table th { position: sticky; top: 0; z-index: 1; background: #f3f4f6; }
.preview-table input { min-width: 120px; padding: 5px 6px; border: 1px solid #d1d5db; border-radius: 4px; font: inherit; }
.loading-state { display: grid; gap: 5px; color: #4b5563; font-size: .88rem; }
.loading-bar, .progress-track { height: 7px; overflow: hidden; border-radius: 999px; background: #e5e7eb; }
.loading-bar span { display: block; width: 35%; height: 100%; border-radius: inherit; background: #93c5fd; animation: loading-slide 1s ease-in-out infinite; }
.progress-track span { display: block; height: 100%; border-radius: inherit; background: #2563eb; transition: width .2s ease; }
.loading-state small { text-align: right; }
@keyframes loading-slide { from { transform: translateX(-120%); } to { transform: translateX(300%); } }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
.btn-primary, .btn-secondary { border: none; padding: 9px 14px; border-radius: 6px; cursor: pointer; }
.btn-primary { background: #2563eb; color: white; }
.btn-primary:disabled { opacity: .55; cursor: not-allowed; }
.btn-secondary { background: #e5e7eb; color: #374151; }
</style>
