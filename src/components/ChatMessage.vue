<script setup>
// 单条消息组件：根据 role 区分用户消息和 AI 回复，支持 Markdown 渲染、复制和重试

import { Clipboard, RefreshCw } from 'lucide-vue-next'
import MarkdownMessage from '@/components/MarkdownMessage.vue'

defineProps({
  message: { type: Object, required: true },
  copied: { type: Boolean, default: false },
})

const emit = defineEmits(['copy', 'retry'])
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
        <button
          type="button"
          :disabled="!message.content || message.status === 'streaming'"
          @click="emit('copy', message)"
        >
          <Clipboard :size="13" />
          {{ copied ? '已复制' : '复制' }}
        </button>
        <button
          v-if="message.status === 'error' || message.status === 'stopped'"
          type="button"
          @click="emit('retry')"
        >
          <RefreshCw :size="13" />
          重试
        </button>
      </div>
    </div>
  </article>
</template>
