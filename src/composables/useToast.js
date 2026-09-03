import { reactive } from 'vue'

// État partagé (singleton) : un seul hôte de toasts pour toute l'application.
const toasts = reactive([])
let counter = 0

function show(message, type = 'error', duration = 3200) {
  const id = ++counter
  toasts.push({ id, message, type })
  setTimeout(() => remove(id), duration)
  return id
}

function remove(id) {
  const index = toasts.findIndex(toast => toast.id === id)
  if (index !== -1) toasts.splice(index, 1)
}

export function useToast() {
  return {
    toasts,
    show,
    error: (message, duration) => show(message, 'error', duration),
    success: (message, duration) => show(message, 'success', duration),
    info: (message, duration) => show(message, 'info', duration),
    remove
  }
}
