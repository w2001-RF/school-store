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
    }
  ]
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.loading) await auth.init()
  if (!to.meta.public && !auth.isAuthenticated) return { name: 'login' }
  if (to.name === 'login' && auth.isAuthenticated) return { name: 'dashboard' }
  if (to.meta.roles && !to.meta.roles.includes(auth.user?.role)) return { name: 'dashboard' }
})

export default router
