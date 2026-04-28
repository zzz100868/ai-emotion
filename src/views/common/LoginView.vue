<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Key, User as UserIcon } from '@element-plus/icons-vue'
import type { UserRole } from '@/types'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const error = ref('')

const form = reactive({
  username: 'admin',
  password: 'MoodFlow@2026Admin',
})

const demoAccounts = [
  { label: '管理员账号', username: 'admin', password: 'MoodFlow@2026Admin' },
  { label: '用户 陈然', username: 'user', password: 'MoodFlow@2026Chen' },
  { label: '用户 林溪', username: 'lin', password: 'MoodFlow@2026Lin' },
  { label: '用户 周宁', username: 'zhou', password: 'MoodFlow@2026Zhou' },
]

function roleHome(role: UserRole): string {
  return role === 'admin' ? '/dashboard' : '/chat'
}

function canAccessRedirect(role: UserRole, path: string): boolean {
  if (!path || path === '/403' || path === '/login') return false
  if (path.startsWith('/settings')) return true
  if (role === 'admin') return path.startsWith('/dashboard') || path.startsWith('/sessions')
  return path.startsWith('/chat') || path.startsWith('/reports')
}

function fillAccount(account: typeof demoAccounts[0]): void {
  form.username = account.username
  form.password = account.password
  error.value = ''
}

async function submitLogin(): Promise<void> {
  if (!form.username.trim() || !form.password) {
    error.value = '请输入账号和密码'
    return
  }

  loading.value = true
  error.value = ''
  try {
    await auth.login({
      username: form.username.trim(),
      password: form.password,
    })
    const redirect = String(route.query.redirect || '')
    router.push(canAccessRedirect(auth.user.role, redirect) ? redirect : roleHome(auth.user.role))
  } catch (err) {
    error.value = (err as Error).message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-hero">
      <p class="eyebrow">MoodFlow</p>
      <h1>AI 情绪对话与数据分析平台</h1>
      <p class="hero-copy">
        面向情绪记录和对话复盘的 AI 工作台，帮助你整理当下状态、沉淀会话报告，并从看板里观察长期变化。
      </p>
    </section>

    <aside class="login-panel">
      <h2>登录工作区</h2>
      <p>登录后会根据账号身份进入对应工作区，用户可进行情绪对话和复盘，管理员负责整体看板和会话管理。</p>
      <el-form class="login-form" @submit.prevent="submitLogin">
        <el-form-item label="账号">
          <el-input v-model="form.username" :prefix-icon="UserIcon" autocomplete="username" placeholder="admin / user / lin / zhou" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" :prefix-icon="Key" autocomplete="current-password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 16px" />
        <el-button type="primary" native-type="submit" :loading="loading" size="large" style="width: 100%">
          {{ loading ? '正在验证...' : '登录系统' }}
        </el-button>
      </el-form>

      <div class="login-actions account-shortcuts">
        <el-button
          v-for="account in demoAccounts"
          :key="account.username"
          plain
          size="small"
          @click="fillAccount(account)"
        >
          {{ account.label }}
        </el-button>
      </div>
      <div class="signal-list">
        <el-tag effect="plain" round>情绪对话</el-tag>
        <el-tag effect="plain" round>会话报告</el-tag>
        <el-tag effect="plain" round>趋势看板</el-tag>
        <el-tag effect="plain" round>角色权限</el-tag>
      </div>
    </aside>
  </main>
</template>
