<script setup lang="ts">
import type { EmotionLabel, RiskLevel } from '@/types'

defineProps<{
  label?: EmotionLabel
  risk?: RiskLevel
}>()

const tagType: Record<string, 'danger' | 'warning' | 'success' | 'info' | ''> = {
  焦虑: 'warning',
  低落: 'danger',
  平静: 'info',
  积极: 'success',
  愤怒: 'danger',
}
</script>

<template>
  <el-tag
    :type="tagType[label || '平静'] || 'info'"
    size="small"
    :effect="risk === 'high' ? 'dark' : 'light'"
    round
  >
    {{ label || '平静' }}
  </el-tag>
</template>
