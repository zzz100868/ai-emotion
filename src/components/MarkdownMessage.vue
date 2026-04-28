<script setup>
// Markdown 渲染组件：将纯文本消息转为 HTML，流式输出时在末尾追加闪烁光标

import MarkdownIt from 'markdown-it'
import { computed } from 'vue'

const props = defineProps({
  content: { type: String, default: '' },
  streaming: { type: Boolean, default: false },
})

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const rendered = computed(() => md.render(props.content || ''))

// 流式输出时，在最后一个闭合标签前插入光标元素，模拟打字效果
const renderedWithCursor = computed(() => {
  if (!props.streaming) return rendered.value
  const cursor = '<span class="typing-cursor"></span>'
  const html = rendered.value || ''
  const closingTags = ['</p>', '</li>', '</blockquote>', '</h1>', '</h2>', '</h3>', '</h4>', '</h5>', '</h6>']
  const match = closingTags
    .map((tag) => ({ tag, index: html.lastIndexOf(tag) }))
    .filter((item) => item.index !== -1)
    .sort((a, b) => b.index - a.index)[0]

  if (!match) return `${html}${cursor}`
  return `${html.slice(0, match.index)}${cursor}${html.slice(match.index)}`
})
</script>

<template>
  <div
    class="markdown-message"
    :class="{ streaming }"
    v-html="renderedWithCursor"
  />
</template>
