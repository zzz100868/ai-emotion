<script setup lang="ts">
import { onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useHealthCheck } from '@/composables/useHealthCheck'
import { useAuthStore } from '@/stores/auth'
import { useMoodStore } from '@/stores/mood'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const auth = useAuthStore()
const mood = useMoodStore()
const { health, loading: healthLoading, error: healthError, refresh: refreshHealth } = useHealthCheck()

function relogin(): void {
  auth.logout()
  router.push('/login')
}

async function confirmClearAll(): Promise<void> {
  try {
    await ElMessageBox.confirm('当前本地会话会恢复为内置样本。', '确定重置演示数据吗？', {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      type: 'warning',
    })
    mood.clearAll()
  } catch {
    // cancelled
  }
}

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
      <el-card shadow="never">
        <template #header>当前账号</template>
        <p>登录用户：{{ auth.user.name }} · {{ auth.user.role === 'admin' ? '管理员' : '普通用户' }}</p>
        <p>登录凭证：{{ auth.token ? '已签发本地 token' : '未登录' }}</p>
        <el-button style="margin-top: 12px" @click="relogin">重新登录</el-button>
      </el-card>

      <el-card shadow="never">
        <template #header>AI 服务状态</template>
        <p>模型调用能力由本地 API 代理检测；对话中的模式与速度控制已放在输入区，便于发送前调整。</p>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px">
          <span>
            服务状态：
            <strong v-if="health">{{ health.configured ? '已配置模型密钥' : '未配置模型密钥' }}</strong>
            <strong v-else>{{ healthLoading ? '检查中...' : '未知' }}</strong>
          </span>
          <el-button :icon="Refresh" circle size="small" @click="refreshHealth" />
        </div>
        <el-alert v-if="healthError" :title="healthError" type="error" show-icon :closable="false" style="margin-top: 8px" />
      </el-card>

      <el-card shadow="never">
        <template #header>演示数据</template>
        <p>重置会话数据会恢复内置样本，方便反复演示看板和筛选功能。</p>
        <el-button type="danger" style="margin-top: 12px" @click="confirmClearAll">
          重置演示数据
        </el-button>
      </el-card>
    </section>
  </div>
</template>
