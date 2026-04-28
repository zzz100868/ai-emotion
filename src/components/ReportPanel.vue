<script setup>
// 右侧情绪报告面板：展示当前会话的结构化报告，包括情绪强度、风险等级、关键词、摘要和建议
// 支持复制、导出 Markdown、跳转到详情页

import { Clipboard, Download, HeartPulse, PanelsTopLeft } from 'lucide-vue-next'
import EmotionBadge from '@/components/EmotionBadge.vue'
import { riskText } from '@/utils'

defineProps({
  report: { type: Object, default: null },
  analyzing: { type: Boolean, default: false },
  copied: { type: Boolean, default: false },
})

const emit = defineEmits(['copy', 'download', 'detail'])
</script>

<template>
  <aside class="insight-panel">
    <div class="insight-title">
      <div>
        <p class="eyebrow">心情小瓶</p>
        <h2>这一页的心情</h2>
      </div>
      <HeartPulse :size="24" />
    </div>
    <div v-if="analyzing" class="soft-empty analyzing-state">
      正在把这段对话整理成结构化情绪报告...
    </div>
    <template v-else-if="report">
      <div class="report-actions">
        <button class="ghost-btn compact" type="button" @click="emit('copy')">
          <Clipboard :size="15" />
          {{ copied ? '已复制' : '复制报告' }}
        </button>
        <button class="ghost-btn compact" type="button" @click="emit('download')">
          <Download :size="15" />
          导出 Markdown
        </button>
        <button class="ghost-btn compact" type="button" @click="emit('detail')">
          <PanelsTopLeft :size="15" />
          查看详情
        </button>
      </div>
      <div class="score-ring" :style="{ '--score-percent': `${report.score}%` }">
        <div class="score-ring-content">
          <strong>{{ report.score }}</strong>
          <span>情绪强度</span>
        </div>
      </div>
      <div class="report-grid">
        <div class="report-tile">
          <span>今天最靠近你的感受</span>
          <EmotionBadge :label="report.label" :risk="report.riskLevel" />
        </div>
        <div class="report-tile">
          <span>需要被多照看一点吗</span>
          <strong>{{ riskText(report.riskLevel) }}</strong>
        </div>
      </div>
      <div class="keyword-list">
        <span v-for="keyword in report.keywords" :key="keyword">{{ keyword }}</span>
      </div>
      <p class="report-copy">{{ report.summary }}</p>
      <p class="report-copy suggestion">{{ report.suggestion }}</p>
    </template>
    <div v-else class="soft-empty">
      写完这一页后，我会把情绪、关键词和一个小建议轻轻放在这里。
    </div>
  </aside>
</template>
