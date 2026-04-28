<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <el-card shadow="never" class="metric-card">
    <span class="metric-label">{{ label }}</span>
    <strong class="metric-value">{{ value }}</strong>
    <small class="metric-hint">{{ hint }}</small>
  </el-card>
</template>

<style scoped>
.metric-card {
  text-align: center;
}
.metric-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px 16px;
}
.metric-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.metric-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
