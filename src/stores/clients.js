import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../services/database/index.js'

export const useClientsStore = defineStore('clients', () => {
  const items = ref([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      items.value = await db.find('clients', { orderBy: { field: 'name' } })
    } finally { loading.value = false }
  }

  async function create(data) {
    const client = await db.create('clients', data)
    items.value.push(client)
    return client
  }

  async function update(id, data) {
    const client = await db.update('clients', id, data)
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) items.value[index] = client
    return client
  }

  async function remove(id) {
    await db.delete('clients', id)
    items.value = items.value.filter(item => item.id !== id)
  }

  return { items, loading, fetchAll, create, update, remove }
})
