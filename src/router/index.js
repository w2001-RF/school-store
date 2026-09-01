import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

// Hash history = compatible GitHub Pages sans config serveur
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('../components/layout/AppLayout.vue'),
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
        { path: 'products', name: 'products', component: () => import('../views/ProductsView.vue'), meta: { roles: ['manager'] } },
        { path: 'categories', name: 'categories', component: () => import('../views/CategoriesView.vue'), meta: { roles: ['manager'] } },
        { path: 'clients', name: 'clients', component: () => import('../views/ClientsView.vue'), meta: { roles: ['manager'] } },
        { path: 'invoices/new', name: 'invoice-new', component: () => import('../views/InvoiceCreateView.vue') },
        { path: 'invoices', name: 'invoices', component: () => import('../views/InvoicesView.vue') },
        { path: 'invoices/:id', name: 'invoice-detail', component: () => import('../views/InvoiceDetailView.vue') }
      ]
    },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('../views/NotFoundView.vue') }
  ]
})

let authInitPromise = null

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  
  if (auth.loading && !authInitPromise) {
    authInitPromise = auth.init()
  }
  if (authInitPromise) {
    await authInitPromise
  }
  
  if (to.meta.public) return next()
  if (!auth.isAuthenticated) return next({ name: 'login' })
  if (to.name === 'login' && auth.isAuthenticated) return next({ name: 'dashboard' })
  if (to.meta.roles && !to.meta.roles.includes(auth.user?.role)) return next({ name: 'dashboard' })
  next()
})

export default router
