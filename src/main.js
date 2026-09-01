import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import { i18n } from './i18n/index.js'
import './style.css'
import './utils/dbHelpers.js' // Initialise window.__dbHelper

const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
  console.error('Global Vue error:', err, 'Info:', info)
}
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled Promise Rejection:', event.reason)
})

app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')
