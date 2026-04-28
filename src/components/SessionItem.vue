<script setup>
// 会话列表单项组件：展示会话标题、更新时间、情绪图标，支持点击切换、重命名和删除

import { Pencil, Trash2 } from 'lucide-vue-next'
import { nextTick, ref } from 'vue'
import { formatDate } from '@/utils'

const props = defineProps({
  session: { type: Object, required: true },
  active: { type: Boolean, default: false },
  streaming: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: true },
  title: { type: String, required: true },
})

const emit = defineEmits(['select', 'rename', 'delete'])
const editing = ref(false)
const draftTitle = ref('')
const inputRef = ref(null)
const cancelled = ref(false)

// 根据会话报告的情绪标签返回对应图标字符
function sessionMoodIcon(session) {
  const label = session.report?.label
  return {
    焦虑: '☁',
    低落: '◐',
    平静: '♧',
    积极: '✦',
    愤怒: '◇',
  }[label] || '✎'
}

async function startRename() {
  editing.value = true
  cancelled.value = false
  draftTitle.value = props.session.title
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

function cancelRename() {
  cancelled.value = true
  editing.value = false
  draftTitle.value = ''
}

function saveRename() {
  if (!editing.value || cancelled.value) return
  emit('rename', props.session, draftTitle.value.trim())
  editing.value = false
  draftTitle.value = ''
}

function handleBlur() {
  if (cancelled.value) {
    cancelled.value = false
    return
  }
  saveRename()
}
</script>

<template>
  <button
    class="session-item"
    :class="{ active }"
    type="button"
    @click="emit('select', session.id)"
  >
    <span class="session-dot" :class="{ streaming }">{{ sessionMoodIcon(session) }}</span>
    <span v-if="editing" class="session-rename" @click.stop>
      <input
        ref="inputRef"
        v-model="draftTitle"
        maxlength="32"
        @blur="handleBlur"
        @keydown.enter.prevent="saveRename"
        @keydown.esc="cancelRename"
      />
    </span>
    <strong v-else>{{ title }}</strong>
    <span class="session-time">{{ streaming ? '生成中...' : formatDate(session.updatedAt) }}</span>
    <span v-if="!editing" class="session-actions-inline" @click.stop>
      <button type="button" title="重命名" :disabled="streaming" @click="startRename">
        <Pencil :size="14" />
      </button>
      <button
        type="button"
        title="删除"
        :disabled="!canDelete || streaming"
        @click="emit('delete', session)"
      >
        <Trash2 :size="14" />
      </button>
    </span>
  </button>
</template>
