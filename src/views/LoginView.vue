<template>
  <div class="login-page">
    <div class="login-card">
      <h1>📚 School Store</h1>
      <p class="subtitle">{{ $t('login.subtitle') }}</p>

      <div class="tabs">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">{{ $t('login.signIn') }}</button>
        <button :class="{ active: mode === 'signup' }" @click="mode = 'signup'">{{ $t('login.signUp') }}</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div v-if="mode === 'signup'" class="form-group">
          <label>{{ $t('login.fullName') }}</label>
          <input v-model="form.fullName" required />
        </div>
        <div v-if="mode === 'signup'" class="form-group">
          <label>{{ $t('login.role') }}</label>
          <select v-model="form.role">
            <option value="agent">{{ $t('login.agent') }}</option>
            <option value="manager">{{ $t('login.manager') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ $t('common.email') }}</label>
          <input v-model="form.email" type="email" required autocomplete="username" />
        </div>
        <div class="form-group">
          <label>{{ $t('login.password') }}</label>
          <input v-model="form.password" type="password" required autocomplete="current-password" />
        </div>
        <div v-if="auth.error" class="error">{{ auth.error }}</div>
        <button class="btn-primary" :disabled="auth.loading" type="submit">
          {{ auth.loading ? $t('login.wait') : (mode === 'login' ? $t('login.submitSignIn') : $t('login.submitSignUp')) }}
        </button>
      </form>

      <div class="demo-info">
        <p>🔑 <strong>{{ $t('login.demo') }} :</strong></p>
        <p>manager@demo.com / demo1234</p>
        <p class="env-hint">{{ $t('login.adapter') }} : <code>{{ currentAdapter }}</code></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { useRouter } from 'vue-router'

const mode = ref('login')
const form = reactive({ email: 'manager@demo.com', password: 'demo1234', fullName: '', role: 'agent' })
const auth = useAuthStore()
const router = useRouter()
const currentAdapter = import.meta.env.VITE_DB_ADAPTER || 'sqlite'

async function handleSubmit() {
  try {
    if (mode.value === 'login') {
      await auth.signIn({ email: form.email, password: form.password })
    } else {
      await auth.signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        role: form.role
      })
    }
    router.push('/dashboard')
  } catch (e) { /* erreur affichée via auth.error */ }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
  padding: 20px;
}
.login-card {
  background: white; padding: 36px; border-radius: 16px;
  width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
h1 { margin: 0 0 8px; font-size: 1.7rem; }
.subtitle { color: #6b7280; margin: 0 0 20px; }
.tabs { display: flex; gap: 4px; margin-bottom: 20px; background: #f3f4f6; border-radius: 8px; padding: 4px; }
.tabs button {
  flex: 1; background: none; border: none; padding: 8px;
  border-radius: 6px; cursor: pointer; font-weight: 500;
}
.tabs button.active { background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.form-group { margin-bottom: 14px; }
label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.9rem; }
input, select {
  width: 100%; padding: 10px 12px; border: 1px solid #d1d5db;
  border-radius: 8px; font-size: 1rem; box-sizing: border-box;
}
input:focus, select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.btn-primary {
  width: 100%; padding: 12px; background: #3b82f6; color: white;
  border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;
  margin-top: 8px;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error {
  color: #dc2626; background: #fee2e2; padding: 10px;
  border-radius: 6px; margin-bottom: 12px; font-size: 0.9rem;
}
.demo-info {
  margin-top: 20px; padding: 12px; background: #f3f4f6; border-radius: 8px;
  font-size: 0.85rem; color: #4b5563;
}
.demo-info p { margin: 4px 0; }
.env-hint code {
  background: #1e293b; color: #10b981; padding: 2px 6px;
  border-radius: 4px; font-family: monospace;
}
</style>
