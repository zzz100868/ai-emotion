import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { adminRoutes } from './admin'
import { setupGuards } from './guards'
import { userRoutes } from './user'

const AppShell = () => import('@/layouts/AppShell.vue')
const LoginView = () => import('@/views/common/LoginView.vue')
const ForbiddenView = () => import('@/views/common/ForbiddenView.vue')
const NotFoundView = () => import('@/views/common/NotFoundView.vue')
const SettingsView = () => import('@/views/common/SettingsView.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => (useAuthStore().user.role === 'admin' ? '/dashboard' : '/chat'),
    },
    { path: '/login', component: LoginView, meta: { title: '登录' } },
    { path: '/403', component: ForbiddenView, meta: { title: '无权限' } },
    {
      path: '/',
      component: AppShell,
      meta: { requiresAuth: true },
      children: [
        ...userRoutes,
        ...adminRoutes,
        { path: 'settings', component: SettingsView, meta: { title: '系统设置', nav: true } },
      ],
    },
    { path: '/:pathMatch(.*)*', component: NotFoundView, meta: { title: '页面不存在' } },
  ],
})

setupGuards(router)

export default router
