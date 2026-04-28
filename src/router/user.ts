import type { RouteRecordRaw } from 'vue-router'

export const userRoutes: RouteRecordRaw[] = [
  {
    path: 'chat',
    component: () => import('@/views/user/ChatView.vue'),
    meta: { title: 'AI 对话', roles: ['user'], nav: true },
  },
  {
    path: 'reports/:id?',
    component: () => import('@/views/user/ReportDetailView.vue'),
    meta: { title: '复盘详情', roles: ['user'], nav: true },
  },
]
