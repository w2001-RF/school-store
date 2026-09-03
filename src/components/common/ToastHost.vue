<template>
  <Teleport to="body">
    <div class="toast-host" aria-live="polite">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
        role="status"
        @click="remove(toast.id)"
      >
        {{ toast.message }}
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '../../composables/useToast.js'

const { toasts, remove } = useToast()
</script>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: 22px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  transform: translateX(-50%);
  max-width: calc(100vw - 32px);
  pointer-events: none;
}
.toast {
  padding: 13px 18px;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 10px 24px rgba(0, 0, 0, .25);
  cursor: pointer;
  pointer-events: auto;
  animation: toast-in .2s ease-out;
}
.toast.error { background: #d95d4f; }
.toast.success { background: #075b60; }
.toast.info { background: #3b82f6; }

@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 450px) {
  .toast-host { bottom: calc(76px + env(safe-area-inset-bottom)); }
}
</style>
