import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/orders' },
    { path: '/incomes', component: () => import('../pages/IncomesPage.vue') },
    { path: '/orders', component: () => import('../pages/OrdersPage.vue') },
    { path: '/sales', component: () => import('../pages/SalesPage.vue') },
    { path: '/stocks', component: () => import('../pages/StocksPage.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/orders' },
  ],
})
