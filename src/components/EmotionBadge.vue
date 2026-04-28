<script setup>
// 情绪标签组件：根据 label（情绪名）和 risk（风险等级）显示带样式的徽章

defineProps({
  label: { type: String, default: '平静' },
  risk: { type: String, default: 'low' },
})
</script>

<template>
  <span class="emotion-badge" :class="[`emotion-${label}`, `risk-${risk}`]">
    {{ label }}
  </span>
</template>
