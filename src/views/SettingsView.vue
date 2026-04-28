<script setup>
/**
 * 系统设置页：所有角色均可访问
 * 展示当前账号信息、AI 服务健康状态检测、演示数据重置功能
 */

import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { RefreshCw, RotateCcw, ShieldCheck } from 'lucide-vue-next'
import { getSystemHealth } from '@/services/systemService'
import { useAuthStore } from '@/stores/auth'
import { useMoodStore } from '@/stores/mood'

const router = useRouter()
const auth = useAuthStore()
const mood = useMoodStore()

// health: 健康检查结果对象，格式 { ok, model, configured }
const health = ref(null)
// healthLoading: 是否正在检测中
const healthLoading = ref(false)
// healthError: 检测失败的错误信息
const healthError = ref('')

// 注销并跳转到登录页
function relogin() {
  auth.logout()
  router.push('/login')
}

// 调用后端 /api/health 接口检测 AI 服务状态
async function refreshHealth() {
  healthLoading.value = true
  healthError.value = ''
  try {
    health.value = await getSystemHealth()
  } catch (error) {
    healthError.value = error.message || '健康检查失败'
  } finally {
    healthLoading.value = false
  }
}

// 重置所有会话数据为内置样本，弹出确认框防止误操作
function confirmClearAll() {
  if (window.confirm('确定重置演示数据吗？当前本地会话会恢复为内置样本。')) {
    mood.clearAll()
  }
}

// 组件挂载后自动执行一次健康检查
onMounted(refreshHealth)
</script>

<template>
  <div class="page-stack">
    <header class="page-header">
      <div>
        <p class="eyebrow">Settings</p>
        <h1>系统设置</h1>
      </div>
      <p>管理账号状态、AI 服务接入和本地会话数据，保持演示环境和真实接口边界清晰。</p>
    </header>

    <section class="settings-grid">
      <!-- 账号信息卡片 -->
      <article class="analysis-card">
        <div class="settings-title">
          <h2>当前账号</h2>
          <ShieldCheck :size="20" />
        </div>
        <p>登录用户：{{ auth.user.name }} · {{ auth.user.role === 'admin' ? '管理员' : '普通用户' }}</p>
        <p>登录凭证：{{ auth.token ? '已签发本地 token' : '未登录' }}</p>
        <div class="settings-actions">
          <button class="ghost-btn" type="button" @click="relogin">重新登录</button>
        </div>
      </article>

      <!-- AI 服务状态卡片 -->
      <article class="analysis-card">
        <h2>AI 服务状态</h2>
        <p>模型调用能力由本地 API 代理检测；对话中的模式与速度控制已放在输入区，便于发送前调整。</p>
        <div class="health-row">
          <span>
            服务状态：
            <strong v-if="health">{{ health.configured ? '已配置模型密钥' : '未配置模型密钥' }}</strong>
            <strong v-else>{{ healthLoading ? '检查中...' : '未知' }}</strong>
          </span>
          <button class="icon-btn" type="button" title="刷新健康检查" @click="refreshHealth">
            <RefreshCw :size="16" />
          </button>
        </div>
        <p v-if="healthError" class="form-error">{{ healthError }}</p>
      </article>

      <!-- 演示数据重置卡片 -->
      <article class="analysis-card">
        <h2>演示数据</h2>
        <p>重置会话数据会恢复内置样本，方便反复演示看板和筛选功能。</p>
        <div class="settings-actions">
          <button class="primary-btn danger-solid" type="button" @click="confirmClearAll">
            <RotateCcw :size="17" />
            重置演示数据
          </button>
        </div>
      </article>
    </section>
  </div>
</template>
