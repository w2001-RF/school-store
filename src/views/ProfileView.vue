<template>
  <div class="profile-view">
    <h2>👤 {{ $t('profile.title') }}</h2>
    <section class="profile-card">
      <form @submit.prevent="save">
        <div class="form-group"><label>{{ $t('profile.fullName') }}</label><input v-model="form.fullName" required maxlength="120" /></div>
        <div class="form-group"><label>{{ $t('common.email') }}</label><input :value="auth.user?.email" type="email" disabled /></div>
        <div class="form-group"><label>{{ $t('profile.role') }}</label><input :value="auth.user?.role" disabled /></div>
        <div v-if="error" class="error" role="alert">{{ error }}</div>
        <button class="btn-primary" type="submit" :disabled="saving">{{ $t('common.save') }}</button>
      </form>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { useToast } from '../composables/useToast.js'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const toast = useToast()
const { t } = useI18n()
const form = ref({ fullName: auth.user?.fullName || '' })
const saving = ref(false)
const error = ref('')

async function save() {
  saving.value = true
  error.value = ''
  try {
    await auth.updateProfile({ fullName: form.value.fullName })
    toast.success(t('profile.saved'))
  } catch (e) { error.value = e.message }
  finally { saving.value = false }
}
</script>

<style scoped>
.profile-card { max-width: 560px; padding: 24px; background: white; border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 5px; font-size: .9rem; }
.form-group input { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; }
.error { margin-bottom: 12px; color: #b91c1c; background: #fef2f2; padding: 8px; border-radius: 6px; }
</style>