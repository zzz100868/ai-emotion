import type { Router } from 'vue-router'
import type { UserRole } from '@/types'
import { useAuthStore } from '@/stores/auth'

function roleHome(role: UserRole): string {
  return role === 'admin' ? '/dashboard' : '/chat'
}

export function setupGuards(router: Router): void {
  router.beforeEach((to) => {
    const auth = useAuthStore()

    if (to.meta.requiresAuth && !auth.isLoggedIn) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    if (to.path === '/login' && auth.isLoggedIn) {
      return roleHome(auth.user.role)
    }

    const roles = to.meta.roles as string[] | undefined
    if (roles?.length && !roles.includes(auth.user.role)) {
      return roleHome(auth.user.role)
    }
  })

  router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} - MoodFlow` : 'MoodFlow'
  })
}
