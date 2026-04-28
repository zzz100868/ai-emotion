<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowDown, Plus, Promotion, Refresh, VideoPause } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import ChatMessage from '@/components/ChatMessage.vue'
import ReportPanel from '@/components/ReportPanel.vue'
import SessionItem from '@/components/SessionItem.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useScrollBottom } from '@/composables/useScrollBottom'
import { useSessionTitle } from '@/composables/useSessionTitle'
import type { Message, Session } from '@/types'
import { useMoodStore } from '@/stores/mood'
import { useSettingsStore } from '@/stores/settings'
import { downloadMarkdown, formatReportMarkdown } from '@/utils/reportExport'
import { ElMessageBox } from 'element-plus'

const mood = useMoodStore()
const settings = useSettingsStore()
const router = useRouter()

const { displayTitle } = useSessionTitle()
const { copied: msgCopied, copy: copyText } = useClipboard()
const { copied: reportCopied, copy: copyReportText } = useClipboard()
const { scrollRef, isNearBottom, hasUnreadBelow, updateScrollState, scrollBottom, handleMessagesChanged, resetScroll } = useScrollBottom()

const input = ref('')
const copiedMsgId = ref('')
const didInitialScroll = ref(false)

const active = computed(() => mood.activeSession)
const report = computed(() => active.value?.report)
const isAnalyzing = computed(() => Boolean(active.value && mood.analyzingMap?.[active.value.id]))

const quickPrompts = [
  '最近找实习压力很大，感觉自己的项目还不够完整。',
  '今天学习效率很低，明明想做项目但一直拖延。',
  '我想复盘一下最近的状态，并整理一个明天能执行的小计划。',
]

function send(): void {
  mood.sendMessage(input.value)
  input.value = ''
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    send()
  }
}

function usePrompt(prompt: string): void {
  input.value = prompt
}

function renameSession(session: Session, title: string): void {
  mood.renameSession(session.id, title)
}

async function confirmDeleteSession(session: Session): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `该会话的消息和报告会一起删除。`,
      `确定删除「${session.title}」吗？`,
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
    mood.deleteSession(session.id)
  } catch { /* cancelled */ }
}

async function copyMessage(message: Message): Promise<void> {
  if (!message.content) return
  await copyText(message.content)
  copiedMsgId.value = message.id
  setTimeout(() => { copiedMsgId.value = '' }, 1400)
}

async function copyReport(): Promise<void> {
  if (!active.value?.report) return
  await copyReportText(formatReportMarkdown(active.value as Session))
}

function downloadReport(): void {
  if (!active.value?.report) return
  downloadMarkdown(active.value.title, formatReportMarkdown(active.value as Session))
}

function openReportDetail(): void {
  if (!active.value?.report) return
  router.push(`/reports/${active.value.id}`)
}

onMounted(() => {
  scrollBottom('auto')
  didInitialScroll.value = true
})

watch(() => active.value?.id, () => {
  resetScroll()
  scrollBottom('auto')
})

watch(
  () => active.value?.messages.map((msg) => `${msg.id}:${msg.content}:${msg.status}`).join('|'),
  () => handleMessagesChanged(didInitialScroll.value),
)
</script>

<template>
  <div class="chat-grid">
    <aside class="session-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">最近的心事</p>
          <h2>我的心情页签</h2>
        </div>
        <el-button :icon="Plus" circle size="small" @click="mood.createSession" />
      </div>

      <SessionItem
        v-for="session in mood.orderedSessions"
        :key="session.id"
        :session="session"
        :title="displayTitle(session.title, session.private)"
        :active="session.id === active?.id"
        :streaming="Boolean(mood.streamingMap?.[session.id])"
        :can-delete="mood.visibleSessions.length > 1"
        @select="mood.selectSession"
        @rename="renameSession"
        @delete="confirmDeleteSession"
      />
    </aside>

    <section class="chat-panel">
      <header class="chat-header">
        <div>
          <p class="eyebrow">安静陪伴</p>
          <h1>{{ active ? displayTitle(active.title, active.private) : '新的情绪对话' }}</h1>
          <div class="chat-status">
            <el-tag size="small" effect="plain" round>{{ settings.aiMode === 'local' ? '本地模式' : '自动模式' }}</el-tag>
            <el-tag size="small" effect="plain" round>{{ isAnalyzing ? '分析报告中' : '逐字陪伴' }}</el-tag>
          </div>
        </div>
        <el-button :icon="Refresh" :disabled="Boolean(mood.streamingMap?.[active?.id ?? ''])" @click="mood.regenerate">
          重新生成
        </el-button>
      </header>

      <div ref="scrollRef" class="message-list" @scroll="updateScrollState">
        <div v-if="!active?.messages.length" class="empty-state">
          <h2>说说你现在的状态</h2>
          <p>像翻开一页日记那样，慢慢写就好。</p>
          <div class="prompt-strip">
            <el-button v-for="prompt in quickPrompts" :key="prompt" plain size="small" @click="usePrompt(prompt)">
              {{ prompt }}
            </el-button>
          </div>
        </div>

        <ChatMessage
          v-for="message in active?.messages"
          :key="message.id"
          :message="message"
          :copied="copiedMsgId === message.id"
          @copy="copyMessage"
          @retry="mood.regenerate"
        />

        <el-button v-if="hasUnreadBelow" class="scroll-bottom-btn" :icon="ArrowDown" size="small" circle @click="scrollBottom('smooth')" />
      </div>

      <form class="composer" @submit.prevent="send">
        <div class="composer-inner">
          <div class="composer-toolbar">
            <div class="composer-control">
              <span>AI 模式</span>
              <el-radio-group :model-value="settings.aiMode" size="small" @change="(val: string) => settings.updateSetting('aiMode', val)">
                <el-radio-button value="auto">自动</el-radio-button>
                <el-radio-button value="local">本地</el-radio-button>
              </el-radio-group>
            </div>
            <div class="composer-control">
              <span>回复</span>
              <el-radio-group :model-value="settings.replySpeed" size="small" @change="(val: string) => settings.updateSetting('replySpeed', val)">
                <el-radio-button value="slow">慢</el-radio-button>
                <el-radio-button value="normal">中</el-radio-button>
                <el-radio-button value="fast">快</el-radio-button>
              </el-radio-group>
            </div>
            <el-checkbox
              :model-value="Boolean(active?.private)"
              :disabled="!active"
              @change="(val: boolean) => active && mood.setSessionPrivate(active.id, val)"
            >
              隐私
            </el-checkbox>
          </div>
          <el-input
            v-model="input"
            type="textarea"
            maxlength="800"
            :rows="2"
            show-word-limit
            placeholder="输入你的状态，Enter 发送，Shift + Enter 换行"
            @keydown="handleKeydown"
          />
          <div class="composer-footer">
            <el-button
              v-if="!mood.streamingMap?.[active?.id ?? '']"
              type="primary"
              :icon="Promotion"
              native-type="submit"
              :disabled="!input.trim()"
            >
              发送
            </el-button>
            <el-button
              v-else
              type="danger"
              :icon="VideoPause"
              @click="active && mood.stopStreaming(active.id)"
            >
              停止
            </el-button>
          </div>
        </div>
      </form>
    </section>

    <ReportPanel
      :report="report"
      :analyzing="isAnalyzing"
      :copied="reportCopied"
      @copy="copyReport"
      @download="downloadReport"
      @detail="openReportDetail"
    />
  </div>
</template>
