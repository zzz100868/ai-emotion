import type { RouteRecordRaw } from 'vue-router'

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: 'dashboard',
    component: () => import('@/views/admin/DashboardView.vue'),
    meta: { title: '情绪看板', roles: ['admin'], nav: true },
  },
  {
    path: 'sessions',
    component: () => import('@/views/admin/SessionsView.vue'),
    meta: { title: '会话管理', roles: ['admin'], nav: true },
  },
]
