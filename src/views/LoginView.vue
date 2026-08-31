<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand-mark" aria-hidden="true">📚</div>
      <p class="eyebrow">Gestion scolaire</p>
      <h1>School Store</h1>
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
        <div v-if="auth.error" class="error" aria-live="polite" role="alert">{{ auth.error }}</div>
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
  background: radial-gradient(circle at 12% 18%, rgba(245,200,107,.45), transparent 28%), linear-gradient(135deg, #075b60 0%, #087f78 54%, #e9f2ee 140%);
  padding: 20px;
}
.login-card {
  background: rgba(255,255,255,.96); padding: 38px; border: 1px solid rgba(255,255,255,.65); border-radius: 20px;
  width: 100%; max-width: 440px; box-shadow: 0 24px 70px rgba(7, 49, 54, .25);
}
.brand-mark { display: grid; place-items: center; width: 56px; height: 56px; margin-bottom: 16px; border-radius: 16px; background: #f5c86b; font-size: 1.8rem; }
.eyebrow { margin: 0 0 4px; color: #087f78; font-size: .74rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 0 0 8px; color: #173042; font-size: 2rem; }
.subtitle { color: #6b7280; margin: 0 0 20px; }
.tabs { display: flex; gap: 4px; margin-bottom: 20px; background: #eaf1ef; border-radius: 10px; padding: 4px; }
.tabs button {
  flex: 1; background: none; border: none; padding: 8px;
  border-radius: 6px; cursor: pointer; font-weight: 500;
}
.tabs button.active { background: white; color: #075b60; box-shadow: 0 3px 8px rgba(23,48,66,.1); }
.form-group { margin-bottom: 14px; }
label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.9rem; }
input, select {
  width: 100%; padding: 11px 12px; border: 1px solid #ccd9d6;
  border-radius: 9px; font-size: 1rem; box-sizing: border-box; background: #fbfdfc;
}
input:focus, select:focus { outline: none; border-color: #087f78; box-shadow: 0 0 0 3px rgba(8,127,120,.12); }
.btn-primary {
  width: 100%; padding: 13px; background: #ef765d; color: white;
  border: none; border-radius: 9px; font-size: 1rem; font-weight: 700; cursor: pointer;
  margin-top: 8px;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #d95d4f; transform: translateY(-1px); box-shadow: 0 8px 18px rgba(217,93,79,.25); }
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

@media (max-width: 480px) {
  .login-card { padding: 28px 22px; }
  .login-page { padding: 14px; }
}
</style>
