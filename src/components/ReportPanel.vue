<script setup lang="ts">
import { CopyDocument, Download, Expand } from '@element-plus/icons-vue'
import type { EmotionReport } from '@/types'
import EmotionBadge from '@/components/EmotionBadge.vue'
import { riskText } from '@/utils'

defineProps<{
  report?: EmotionReport | null
  analyzing?: boolean
  copied?: boolean
}>()

const emit = defineEmits<{
  copy: []
  download: []
  detail: []
}>()
</script>

<template>
  <aside class="insight-panel">
    <div class="insight-title">
      <div>
        <p class="eyebrow">心情小瓶</p>
        <h2>这一页的心情</h2>
      </div>
    </div>
    <div v-if="analyzing" class="soft-empty analyzing-state">
      正在把这段对话整理成结构化情绪报告...
    </div>
    <template v-else-if="report">
      <div class="report-actions">
        <el-button text size="small" :icon="CopyDocument" @click="emit('copy')">
          {{ copied ? '已复制' : '复制报告' }}
        </el-button>
        <el-button text size="small" :icon="Download" @click="emit('download')">
          导出 Markdown
        </el-button>
        <el-button text size="small" :icon="Expand" @click="emit('detail')">
          查看详情
        </el-button>
      </div>
      <el-progress
        type="circle"
        :percentage="report.score"
        :width="120"
        :stroke-width="8"
        class="score-progress"
      >
        <template #default="{ percentage }">
          <div class="score-ring-content">
            <strong>{{ percentage }}</strong>
            <span>情绪强度</span>
          </div>
        </template>
      </el-progress>
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
        <el-tag v-for="keyword in report.keywords" :key="keyword" size="small" type="info" effect="plain" round>
          {{ keyword }}
        </el-tag>
      </div>
      <p class="report-copy">{{ report.summary }}</p>
      <p class="report-copy suggestion">{{ report.suggestion }}</p>
    </template>
    <div v-else class="soft-empty">
      写完这一页后，我会把情绪、关键词和一个小建议轻轻放在这里。
    </div>
  </aside>
</template>

<style scoped>
.score-progress {
  display: flex;
  justify-content: center;
  margin: 16px 0;
}
.score-ring-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.score-ring-content strong {
  font-size: 24px;
  line-height: 1;
}
.score-ring-content span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
