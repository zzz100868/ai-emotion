<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed } from 'vue'

const props = defineProps<{
  content?: string
  streaming?: boolean
}>()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const rendered = computed(() => md.render(props.content || ''))

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
