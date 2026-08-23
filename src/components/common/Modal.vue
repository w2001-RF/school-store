<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal" :style="{ maxWidth: width }">
        <div class="modal-head">
          <h3>{{ title }}</h3>
          <button class="close" @click="$emit('close')">×</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({ title: String, width: { type: String, default: '500px' } })
defineEmits(['close'])
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
