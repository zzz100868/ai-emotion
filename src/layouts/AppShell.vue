<script setup>
// 应用的通用外层布局：左侧边栏导航 + 右侧主内容区
// 所有需要登录的页面都会嵌套在这个布局中

import { computed, onBeforeUnmount, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { Bot, ChartNoAxesCombined, ClipboardList, LogOut, MessageCircle, Settings, Table2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useMoodStore } from '@/stores/mood'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mood = useMoodStore()

// 收到 401 未授权事件时自动登出并跳回登录页
function handleUnauthorized() {
  auth.logout()
  router.push('/login')
}

onMounted(() => {
  mood.init()
  window.addEventListener('moodflow:unauthorized', handleUnauthorized)
})

onBeforeUnmount(() => {
  window.removeEventListener('moodflow:unauthorized', handleUnauthorized)
})

// 根据当前用户角色动态计算导航项（admin 和普通用户看到不同的菜单）
const navItems = computed(() => [
  { to: '/chat', label: 'AI 对话', icon: MessageCircle, visible: auth.user.role === 'user' },
  { to: `/reports/${mood.activeSession?.id || ''}`, label: '复盘', icon: ClipboardList, visible: auth.user.role === 'user' },
  { to: '/dashboard', label: '情绪看板', icon: ChartNoAxesCombined, visible: auth.user.role === 'admin' },
  { to: '/sessions', label: '会话管理', icon: Table2, visible: auth.user.role === 'admin' },
  { to: '/settings', label: '系统设置', icon: Settings, visible: true },
].filter((item) => item.visible))

const homePath = computed(() => auth.user.role === 'admin' ? '/dashboard' : '/chat')

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <aside class="side-rail">
      <RouterLink :to="homePath" class="brand-mark" aria-label="MoodFlow">
        <Bot :size="25" />
      </RouterLink>

      <nav class="rail-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rail-link"
          :class="{ active: route.path === item.to }"
          :title="item.label"
        >
          <component :is="item.icon" :size="21" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <button class="rail-link logout-btn" type="button" title="退出登录" @click="logout">
        <LogOut :size="20" />
        <span>退出</span>
      </button>
    </aside>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
