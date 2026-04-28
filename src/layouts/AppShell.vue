<script setup lang="ts">
import {
  ChatLineSquare,
  DataAnalysis,
  Document,
  List,
  Setting,
  SwitchButton,
} from '@element-plus/icons-vue'
import { computed, markRaw, onBeforeUnmount, onMounted } from 'vue'
import type { Component } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMoodStore } from '@/stores/mood'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mood = useMoodStore()

function handleUnauthorized(): void {
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

interface NavItem {
  to: string
  label: string
  icon: Component
  visible: boolean
}

const navItems = computed<NavItem[]>(() => [
  { to: '/chat', label: 'AI 对话', icon: markRaw(ChatLineSquare), visible: auth.user.role === 'user' },
  { to: `/reports/${mood.activeSession?.id || ''}`, label: '复盘', icon: markRaw(Document), visible: auth.user.role === 'user' },
  { to: '/dashboard', label: '情绪看板', icon: markRaw(DataAnalysis), visible: auth.user.role === 'admin' },
  { to: '/sessions', label: '会话管理', icon: markRaw(List), visible: auth.user.role === 'admin' },
  { to: '/settings', label: '系统设置', icon: markRaw(Setting), visible: true },
].filter((item) => item.visible))

const homePath = computed(() => auth.user.role === 'admin' ? '/dashboard' : '/chat')

function handleMenuSelect(index: string): void {
  router.push(index)
}

function logout(): void {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <aside class="side-rail">
      <router-link :to="homePath" class="brand-mark" aria-label="MoodFlow">
        <strong>MF</strong>
      </router-link>

      <el-menu
        :default-active="route.path"
        :collapse="true"
        class="rail-menu"
        @select="handleMenuSelect"
      >
        <el-menu-item v-for="item in navItems" :key="item.to" :index="item.to">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-menu>

      <el-button class="logout-btn" text :icon="SwitchButton" @click="logout">
        退出
      </el-button>
    </aside>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 72px 1fr;
  min-height: 100vh;
}
.side-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}
.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 15px;
  text-decoration: none;
  margin-bottom: 12px;
}
.rail-menu {
  border-right: none !important;
  flex: 1;
}
.rail-menu .el-menu-item {
  height: 48px;
  line-height: 48px;
}
.logout-btn {
  margin-top: auto;
  color: var(--el-text-color-secondary);
}
.app-main {
  overflow-y: auto;
  padding: 24px 32px;
  background: var(--el-fill-color-blank);
}
</style>
