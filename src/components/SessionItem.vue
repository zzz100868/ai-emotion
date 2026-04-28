<script setup lang="ts">
import { Delete, Edit } from '@element-plus/icons-vue'
import { nextTick, ref } from 'vue'
import type { Session } from '@/types'
import { formatDate } from '@/utils'

const props = defineProps<{
  session: Session
  active?: boolean
  streaming?: boolean
  canDelete?: boolean
  title: string
}>()

const emit = defineEmits<{
  select: [id: string]
  rename: [session: Session, title: string]
  delete: [session: Session]
}>()

const editing = ref(false)
const draftTitle = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const cancelled = ref(false)

function sessionMoodIcon(session: Session): string {
  const label = session.report?.label
  return ({
    焦虑: '☁',
    低落: '◐',
    平静: '♧',
    积极: '✦',
    愤怒: '◇',
  } as Record<string, string>)[label || ''] || '✎'
}

async function startRename(): Promise<void> {
  editing.value = true
  cancelled.value = false
  draftTitle.value = props.session.title
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

function cancelRename(): void {
  cancelled.value = true
  editing.value = false
  draftTitle.value = ''
}

function saveRename(): void {
  if (!editing.value || cancelled.value) return
  emit('rename', props.session, draftTitle.value.trim())
  editing.value = false
  draftTitle.value = ''
}

function handleBlur(): void {
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
      <el-input
        ref="inputRef"
        v-model="draftTitle"
        maxlength="32"
        size="small"
        @blur="handleBlur"
        @keydown.enter.prevent="saveRename"
        @keydown.esc="cancelRename"
      />
    </span>
    <strong v-else>{{ title }}</strong>
    <span class="session-time">{{ streaming ? '生成中...' : formatDate(session.updatedAt) }}</span>
    <span v-if="!editing" class="session-actions-inline" @click.stop>
      <el-button text size="small" :icon="Edit" :disabled="streaming" circle @click="startRename" />
      <el-button
        text
        size="small"
        :icon="Delete"
        :disabled="!canDelete || streaming"
        circle
        @click="emit('delete', session)"
      />
    </span>
  </button>
</template>
