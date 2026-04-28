import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 懒加载各页面组件：只有当用户访问到该路由时，浏览器才会下载对应的 JS 文件
// 这样可以减少首页加载时间
const AppShell = () => import('@/layouts/AppShell.vue')
const LoginView = () => import('@/views/LoginView.vue')
const ChatView = () => import('@/views/ChatView.vue')
const ReportDetailView = () => import('@/views/ReportDetailView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')
const SessionsView = () => import('@/views/SessionsView.vue')
const SettingsView = () => import('@/views/SettingsView.vue')
const ForbiddenView = () => import('@/views/ForbiddenView.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

// 根据角色返回对应的首页路径
function roleHome(role) {
  return role === 'admin' ? '/dashboard' : '/chat'
}

/**
 * 路由配置说明：
 * - path: 访问路径
 * - component: 该路径渲染的组件
 * - meta: 路由元信息，可用于存储标题、权限要求等额外数据
 *   - title: 页面标题，路由守卫会自动设置到 document.title
 *   - requiresAuth: 是否需要登录（true 表示必须登录才能访问）
 *   - roles: 允许访问的角色数组，如 ['admin'] 表示仅管理员可访问
 *   - nav: 是否显示在左侧导航栏中
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 根路径重定向：根据当前登录用户的角色自动跳转到对应首页
    { path: '/', redirect: () => (useAuthStore().user.role === 'admin' ? '/dashboard' : '/chat') },
    { path: '/login', component: LoginView, meta: { title: '登录' } },
    { path: '/403', component: ForbiddenView, meta: { title: '无权限' } },
    // 所有需要登录的页面都作为 AppShell 的子路由，共享侧边栏布局
    {
      path: '/',
      component: AppShell,
      meta: { requiresAuth: true },
      children: [
        { path: 'chat', component: ChatView, meta: { title: 'AI 对话', roles: ['user'], nav: true } },
        { path: 'reports/:id?', component: ReportDetailView, meta: { title: '复盘详情', roles: ['user'], nav: true } },
        { path: 'dashboard', component: DashboardView, meta: { title: '情绪看板', roles: ['admin'], nav: true } },
        { path: 'sessions', component: SessionsView, meta: { title: '会话管理', roles: ['admin'], nav: true } },
        { path: 'settings', component: SettingsView, meta: { title: '系统设置', nav: true } },
      ],
    },
    // 通配符路由：匹配所有未定义的路径，渲染 404 页面
    { path: '/:pathMatch(.*)*', component: NotFoundView, meta: { title: '页面不存在' } },
  ],
})

/**
 * 全局前置守卫（beforeEach）：
 * 在每次路由切换前执行，用于权限校验和重定向
 *
 * 逻辑顺序：
 * 1. 若目标路由需要登录（requiresAuth=true）且当前未登录 -> 重定向到登录页，并携带原目标地址（方便登录后跳转回来）
 * 2. 若已登录用户访问登录页 -> 自动跳转到对应角色的首页
 * 3. 若目标路由有角色限制（roles）且当前用户角色不匹配 -> 跳转到该角色的首页
 */
router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.path === '/login' && auth.isLoggedIn) {
    return auth.user.role === 'admin' ? '/dashboard' : '/chat'
  }

  if (to.meta.roles?.length && !to.meta.roles.includes(auth.user.role)) {
    return roleHome(auth.user.role)
  }
})

// 全局后置守卫（afterEach）：路由切换完成后，更新浏览器标签页的标题
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - MoodFlow` : 'MoodFlow'
})

export default router
