import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../services/database/index.js'

export const useCategoriesStore = defineStore('categories', () => {
  const items = ref([])

  async function fetchAll() {
    items.value = await db.find('categories', { orderBy: { field: 'name' } })
  }

  async function create(data) {
    const c = await db.create('categories', data)
    items.value.push(c)
    return c
  }

  async function update(id, data) {
    const c = await db.update('categories', id, data)
    const idx = items.value.findIndex(x => x.id === id)
    if (idx !== -1) items.value[idx] = c
    return c
  }

  async function remove(id) {
    await db.delete('categories', id)
    items.value = items.value.filter(x => x.id !== id)
  }

  async function removeMany(ids) {
    for (const id of ids) await db.delete('categories', id)
    const selected = new Set(ids)
    items.value = items.value.filter(category => !selected.has(category.id))
  }

  return { items, fetchAll, create, update, remove, removeMany }
})
