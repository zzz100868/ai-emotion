<script setup>
/**
 * 复盘详情页：独立展示单条会话的情绪报告
 * 内容包括：情绪强度、主要情绪、风险等级、复盘摘要、触发线索、可执行建议、回顾问题、对话依据
 * 支持复制报告文本和导出 Markdown 文件
 */

import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, Clipboard, Download, MessageCircle, RefreshCw } from 'lucide-vue-next'
import EmotionBadge from '@/components/EmotionBadge.vue'
import { useMoodStore } from '@/stores/mood'
import { downloadMarkdown, formatReportMarkdown } from '@/utils/reportExport'
import { formatDate, riskText } from '@/utils'

const route = useRoute()
const mood = useMoodStore()

/**
 * 查找要展示的会话，优先级：
 * 1. URL 参数中的 id（/reports/:id）
 * 2. 当前激活会话（从 ChatView 切换过来时）
 * 3. 任意一条有报告的可见会话（兜底，防止直接刷新页面时找不到）
 */
const session = computed(() => (
  mood.visibleSessions.find((item) => item.id === route.params.id) ||
  mood.activeSession ||
  mood.visibleSessions.find((item) => item.report)
))

// 当前会话的情绪报告对象
const report = computed(() => session.value?.report)

// 取最近 6 条消息作为"对话依据"展示
const evidenceMessages = computed(() => (session.value?.messages || []).slice(-6))

// 从报告关键词中提取前两个，用于生成个性化的反思问题
const topKeyword = computed(() => report.value?.keywords?.[0] || '当前状态')
const supportKeyword = computed(() => report.value?.keywords?.[1] || '行动计划')

// 根据关键词动态生成的 3 条反思问题，帮助用户自我复盘
const reflectionQuestions = computed(() => [
  `这次「${topKeyword.value}」最早是被哪件事触发的？`,
  `如果只做一件很小的事，什么能让今天变得更可控？`,
  `下次出现类似状态时，哪些提醒对你最有帮助？`,
])

// 复制报告 Markdown 到剪贴板
async function copyReport() {
  if (!session.value?.report) return
  await navigator.clipboard.writeText(formatReportMarkdown(session.value))
}

// 导出报告为 .md 文件下载
function exportReport() {
  if (!session.value?.report) return
  downloadMarkdown(session.value.title, formatReportMarkdown(session.value))
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
        <RouterLink class="ghost-btn compact" to="/chat">
          <ArrowLeft :size="16" />
          回到对话
        </RouterLink>
        <RouterLink v-if="session" class="ghost-btn compact" :to="`/chat`">
          <MessageCircle :size="16" />
          继续聊聊
        </RouterLink>
      </div>
    </header>

    <!-- 无报告时的空状态 -->
    <section v-if="!report" class="empty-result">
      <strong>当前会话还没有复盘报告</strong>
      <p>先回到对话页完成一次 AI 回复，系统会在对话结束后整理情绪报告。</p>
      <RouterLink class="primary-btn" to="/chat">开始对话</RouterLink>
    </section>

    <template v-else>
      <!-- 报告概览卡片：4 个核心指标 -->
      <section class="review-hero analysis-card">
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
          <strong>{{ formatDate(session.updatedAt) }}</strong>
        </div>
      </section>

      <!-- 报告详情网格 -->
      <section class="review-grid">
        <article class="analysis-card review-card">
          <h2>复盘摘要</h2>
          <p>{{ report.summary }}</p>
          <div class="keyword-list">
            <span v-for="keyword in report.keywords" :key="keyword">{{ keyword }}</span>
          </div>
        </article>

        <article class="analysis-card review-card">
          <h2>可能的触发线索</h2>
          <p>
            这次复盘里反复出现「{{ topKeyword }}」，说明它可能是当前情绪的主要入口。可以回看对话中第一次提到它的上下文。
          </p>
        </article>

        <article class="analysis-card review-card">
          <h2>可执行下一步</h2>
          <p>{{ report.suggestion }}</p>
          <p class="review-note">建议把它压缩成 15 分钟内能开始的一件小事，先降低行动阻力。</p>
        </article>

        <article class="analysis-card review-card">
          <h2>回顾问题</h2>
          <ul class="reflection-list">
            <li v-for="question in reflectionQuestions" :key="question">{{ question }}</li>
          </ul>
        </article>

        <!-- 对话依据：展示最近的几条消息作为报告的上下文支撑 -->
        <article class="analysis-card review-card wide">
          <div class="card-title">
            <h2>对话依据</h2>
            <span>最近 {{ evidenceMessages.length }} 条</span>
          </div>
          <div class="evidence-list">
            <div v-for="message in evidenceMessages" :key="message.id" :class="message.role">
              <span>{{ message.role === 'assistant' ? 'AI' : '我' }}</span>
              <p>{{ message.content }}</p>
            </div>
          </div>
        </article>

        <!-- 保存操作 -->
        <article class="analysis-card review-card">
          <h2>保存复盘</h2>
          <p>可以复制报告到笔记，也可以导出为 Markdown 文件，方便后续按周或按月回顾。</p>
          <div class="settings-actions">
            <button class="ghost-btn" type="button" @click="copyReport">
              <Clipboard :size="17" />
              复制报告
            </button>
            <button class="primary-btn" type="button" @click="exportReport">
              <Download :size="17" />
              导出 Markdown
            </button>
          </div>
        </article>
      </section>

      <section class="dashboard-note">
        <RefreshCw :size="17" />
        <p>
          如果你继续补充「{{ supportKeyword }}」相关内容，回到对话页重新生成回复后，复盘报告会随新的对话更新。
        </p>
      </section>
    </template>
  </div>
</template>
