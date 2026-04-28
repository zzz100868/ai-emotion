<script setup lang="ts">
import { CopyDocument, RefreshRight } from '@element-plus/icons-vue'
import type { Message } from '@/types'
import MarkdownMessage from '@/components/MarkdownMessage.vue'

defineProps<{
  message: Message
  copied?: boolean
}>()

const emit = defineEmits<{
  copy: [message: Message]
  retry: []
}>()
</script>

<template>
  <article class="message-row" :class="message.role">
    <div
      class="avatar"
      :class="`avatar-${message.role}`"
      :aria-label="message.role === 'user' ? '我' : 'AI'"
    >
      {{ message.role === 'user' ? '我' : 'AI' }}
    </div>
    <div class="message-bubble">
      <MarkdownMessage :content="message.content || '正在生成...'" :streaming="message.status === 'streaming'" />
      <div class="message-actions" @click.stop>
        <el-button
          text
          size="small"
          :icon="CopyDocument"
          :disabled="!message.content || message.status === 'streaming'"
          @click="emit('copy', message)"
        >
          {{ copied ? '已复制' : '复制' }}
        </el-button>
        <el-button
          v-if="message.status === 'error' || message.status === 'stopped'"
          text
          size="small"
          :icon="RefreshRight"
          @click="emit('retry')"
        >
          重试
        </el-button>
      </div>
    </div>
  </article>
</template>
