<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div 
        class="modal" 
        :style="{ maxWidth: width }" 
        ref="modalRef" 
        tabindex="-1"
        @keydown.esc="$emit('close')"
      >
        <div class="modal-head">
          <h3 :id="titleId">{{ title }}</h3>
          <button class="close" @click="$emit('close')" aria-label="Fermer">×</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
const props = defineProps({ title: String, width: { type: String, default: '500px' } })
const emit = defineEmits(['close'])

const modalRef = ref(null)
const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`

function handleKeydown(e) {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  
  if (e.key === 'Tab' && modalRef.value) {
    // Focus trap inside the modal
    const focusableElements = modalRef.value.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (!focusableElements.length) return
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  // Ensure we focus the modal (or its first element) when it opens
  await nextTick()
  if (modalRef.value) {
    const focusable = modalRef.value.querySelector('input:not([disabled]), button:not([disabled])')
    if (focusable) focusable.focus()
    else modalRef.value.focus()
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.modal { background: white; border-radius: 12px; width: 100%; max-height: 90vh; overflow: auto; }
.modal-head { padding: 16px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
.modal-head h3 { margin: 0; }
.close { background: none; border: none; font-size: 1.5rem; cursor: pointer; line-height: 1; }
.modal-body { padding: 20px; }
</style>
