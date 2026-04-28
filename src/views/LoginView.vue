<script setup>
/**
 * 登录页：系统的唯一入口
 * - 提供账号密码表单
 * - 预置 4 组演示账号快捷填充按钮（1 管理员 + 3 普通用户）
 * - 登录成功后根据角色跳转到对应首页，或跳回之前被拦截的页面
 */

import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Activity, KeyRound, ShieldCheck, Sparkles, UserRound } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// loading: 标记是否正在发送登录请求，用于禁用按钮和显示加载文案
const loading = ref(false)
// error: 登录失败的错误提示文字
const error = ref('')

// form: 登录表单数据对象（reactive 让 Vue 追踪其内部属性变化）
const form = reactive({
  username: 'admin',
  password: 'MoodFlow@2026Admin',
})

// 演示账号列表：管理员账号（admin）和 3 个普通用户（user/lin/zhou）
const demoAccounts = [
  { label: '管理员账号', username: 'admin', password: 'MoodFlow@2026Admin', icon: ShieldCheck },
  { label: '用户 陈然', username: 'user', password: 'MoodFlow@2026Chen', icon: Sparkles },
  { label: '用户 林溪', username: 'lin', password: 'MoodFlow@2026Lin', icon: Sparkles },
  { label: '用户 周宁', username: 'zhou', password: 'MoodFlow@2026Zhou', icon: Sparkles },
]

// 根据角色返回对应首页路径
function roleHome(role) {
  return role === 'admin' ? '/dashboard' : '/chat'
}

/**
 * 判断登录后的重定向地址是否对该角色可用
 * - 排除 403/login 等异常路径
 * - settings 页面所有角色通用
 * - admin 只能看 dashboard/sessions，user 只能看 chat/reports
 */
function canAccessRedirect(role, path) {
  if (!path || path === '/403' || path === '/login') return false
  if (path.startsWith('/settings')) return true
  if (role === 'admin') return path.startsWith('/dashboard') || path.startsWith('/sessions')
  return path.startsWith('/chat') || path.startsWith('/reports')
}

// 点击快捷账号按钮时，自动填充表单并清空之前的错误提示
function fillAccount(account) {
  form.username = account.username
  form.password = account.password
  error.value = ''
}

// 提交登录表单
async function submitLogin() {
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
    // 从 URL 查询参数读取被拦截前的目标路径
    const redirect = String(route.query.redirect || '')
    // 如果重定向路径对该角色可用则跳转过去，否则回角色首页
    router.push(canAccessRedirect(auth.user.role, redirect) ? redirect : roleHome(auth.user.role))
  } catch (err) {
    error.value = err.message || '登录失败'
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
      <Activity :size="30" />
      <h2>登录工作区</h2>
      <p>登录后会根据账号身份进入对应工作区，用户可进行情绪对话和复盘，管理员负责整体看板和会话管理。</p>
      <form class="login-form" @submit.prevent="submitLogin">
        <label>
          <span>账号</span>
          <div class="field-control">
            <UserRound :size="18" />
            <input v-model="form.username" autocomplete="username" placeholder="admin / user / lin / zhou" />
          </div>
        </label>
        <label>
          <span>密码</span>
          <div class="field-control">
            <KeyRound :size="18" />
            <input v-model="form.password" autocomplete="current-password" type="password" placeholder="请输入密码" />
          </div>
        </label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="primary-btn login-submit" type="submit" :disabled="loading">
          <ShieldCheck :size="19" />
          {{ loading ? '正在验证...' : '登录系统' }}
        </button>
      </form>

      <div class="login-actions account-shortcuts">
        <button
          v-for="account in demoAccounts"
          :key="account.username"
          class="ghost-btn compact"
          type="button"
          @click="fillAccount(account)"
        >
          <component :is="account.icon" :size="17" />
          {{ account.label }}
        </button>
      </div>
      <div class="signal-list">
        <span>情绪对话</span>
        <span>会话报告</span>
        <span>趋势看板</span>
        <span>角色权限</span>
      </div>
    </aside>
  </main>
</template>
