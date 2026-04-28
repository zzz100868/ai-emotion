<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, CopyDocument, Download } from '@element-plus/icons-vue'
import EmotionBadge from '@/components/EmotionBadge.vue'
import { useClipboard } from '@/composables/useClipboard'
import type { Session } from '@/types'
import { useMoodStore } from '@/stores/mood'
import { downloadMarkdown, formatReportMarkdown } from '@/utils/reportExport'
import { formatDate, riskText } from '@/utils'

const route = useRoute()
const mood = useMoodStore()
const { copy } = useClipboard()

const session = computed(() => (
  mood.visibleSessions.find((item) => item.id === route.params.id) ||
  mood.activeSession ||
  mood.visibleSessions.find((item) => item.report)
))

const report = computed(() => session.value?.report)
const evidenceMessages = computed(() => (session.value?.messages || []).slice(-6))
const topKeyword = computed(() => report.value?.keywords?.[0] || '当前状态')
const supportKeyword = computed(() => report.value?.keywords?.[1] || '行动计划')

const reflectionQuestions = computed(() => [
  `这次「${topKeyword.value}」最早是被哪件事触发的？`,
  `如果只做一件很小的事，什么能让今天变得更可控？`,
  `下次出现类似状态时，哪些提醒对你最有帮助？`,
])

async function copyReport(): Promise<void> {
  if (!session.value?.report) return
  await copy(formatReportMarkdown(session.value as Session))
}

function exportReport(): void {
  if (!session.value?.report) return
  downloadMarkdown(session.value.title, formatReportMarkdown(session.value as Session))
}
</script>

<template>
  <div class="page-stack report-detail-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Review Detail</p>
        <h1>{{ session?.private ? '隐私复盘' : session?.title || '复盘详情' }}</h1>
      </div>
      <div class="report-detail-actions">
        <RouterLink to="/chat">
          <el-button :icon="ArrowLeft">回到对话</el-button>
        </RouterLink>
      </div>
    </header>

    <section v-if="!report" class="empty-result">
      <strong>当前会话还没有复盘报告</strong>
      <p>先回到对话页完成一次 AI 回复，系统会在对话结束后整理情绪报告。</p>
      <RouterLink to="/chat">
        <el-button type="primary">开始对话</el-button>
      </RouterLink>
    </section>

    <template v-else>
      <section class="review-hero">
        <el-card shadow="never">
          <div class="review-hero-grid">
            <div>
              <span>情绪强度</span>
              <strong>{{ report.score }}</strong>
            </div>
            <div>
              <span>主要情绪</span>
              <EmotionBadge :label="report.label" :risk="report.riskLevel" />
            </div>
            <div>
              <span>关注级别</span>
              <strong>{{ riskText(report.riskLevel) }}</strong>
            </div>
            <div>
              <span>更新时间</span>
              <strong>{{ formatDate(session!.updatedAt) }}</strong>
            </div>
          </div>
        </el-card>
      </section>

      <section class="review-grid">
        <el-card shadow="never">
          <template #header>复盘摘要</template>
          <p>{{ report.summary }}</p>
          <div class="keyword-list" style="margin-top: 12px">
            <el-tag v-for="keyword in report.keywords" :key="keyword" size="small" effect="plain" round>{{ keyword }}</el-tag>
          </div>
        </el-card>

        <el-card shadow="never">
          <template #header>可能的触发线索</template>
          <p>
            这次复盘里反复出现「{{ topKeyword }}」，说明它可能是当前情绪的主要入口。可以回看对话中第一次提到它的上下文。
          </p>
        </el-card>

        <el-card shadow="never">
          <template #header>可执行下一步</template>
          <p>{{ report.suggestion }}</p>
          <p style="color: var(--el-text-color-secondary); margin-top: 8px; font-size: 13px">
            建议把它压缩成 15 分钟内能开始的一件小事，先降低行动阻力。
          </p>
        </el-card>

        <el-card shadow="never">
          <template #header>回顾问题</template>
          <ul style="padding-left: 20px">
            <li v-for="question in reflectionQuestions" :key="question" style="margin: 8px 0; line-height: 1.6">
              {{ question }}
            </li>
          </ul>
        </el-card>

        <el-card shadow="never" class="wide">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>对话依据</span>
              <span style="color: var(--el-text-color-secondary); font-size: 13px">最近 {{ evidenceMessages.length }} 条</span>
            </div>
          </template>
          <div class="evidence-list">
            <div v-for="message in evidenceMessages" :key="message.id" :class="message.role">
              <span>{{ message.role === 'assistant' ? 'AI' : '我' }}</span>
              <p>{{ message.content }}</p>
            </div>
          </div>
        </el-card>

        <el-card shadow="never">
          <template #header>保存复盘</template>
          <p>可以复制报告到笔记，也可以导出为 Markdown 文件，方便后续按周或按月回顾。</p>
          <div style="display: flex; gap: 8px; margin-top: 12px">
            <el-button :icon="CopyDocument" @click="copyReport">复制报告</el-button>
            <el-button type="primary" :icon="Download" @click="exportReport">导出 Markdown</el-button>
          </div>
        </el-card>
      </section>

      <el-alert type="info" :closable="false" style="margin-top: 18px">
        <template #title>
          如果你继续补充「{{ supportKeyword }}」相关内容，回到对话页重新生成回复后，复盘报告会随新的对话更新。
        </template>
      </el-alert>
    </template>
  </div>
</template>
