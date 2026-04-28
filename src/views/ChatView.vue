<script setup>
/**
 * AI 对话页：项目的核心页面，采用三栏布局
 * - 左侧：会话列表（可新建、切换、重命名、删除）
 * - 中间：聊天区域（消息展示、输入框、快捷提示词）
 * - 右侧：情绪报告面板（当前会话的结构化分析报告）
 */

import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ArrowDown, CircleStop, Gauge, Plus, RefreshCw, Send, Sparkles, Waves } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import ChatMessage from '@/components/ChatMessage.vue'
import ReportPanel from '@/components/ReportPanel.vue'
import SessionItem from '@/components/SessionItem.vue'
import { useMoodStore } from '@/stores/mood'
import { useSettingsStore } from '@/stores/settings'
import { downloadMarkdown, formatReportMarkdown } from '@/utils/reportExport'

// mood Store：操作会话数据和 AI 对话
const mood = useMoodStore()
// settings Store：控制 AI 模式和回复速度
const settings = useSettingsStore()
// Vue Router 实例，用于跳转到复盘详情页
const router = useRouter()

// input: 输入框绑定的文本内容（响应式 ref）
const input = ref('')
// scrollRef: 绑定到消息列表滚动容器的 DOM 引用，用于控制自动滚动
const scrollRef = ref(null)
// didInitialScroll: 标记是否已经执行过首次滚动，防止初始加载时滚动逻辑干扰
const didInitialScroll = ref(false)
// copiedId: 记录当前被复制了的消息 ID，用于显示"已复制"状态（1.4秒后清空）
const copiedId = ref('')
// reportCopied: 标记右侧报告面板是否显示"已复制"
const reportCopied = ref(false)
// isNearBottom: 标记用户当前是否已经在消息列表底部（距离底部 < 96px 视为在底部）
const isNearBottom = ref(true)
// hasUnreadBelow: 当用户不在底部且收到新消息时，显示"回到底部"按钮
const hasUnreadBelow = ref(false)

// active: 当前选中的会话对象（从 Store getter 计算得出，自动响应切换）
const active = computed(() => mood.activeSession)
// report: 当前会话已生成的情绪报告对象
const report = computed(() => active.value?.report)
// isAnalyzing: 当前会话是否正在生成情绪报告（AI 回复流结束后会单独调用分析接口）
const isAnalyzing = computed(() => Boolean(active.value && mood.analyzingMap?.[active.value.id]))

// 输入框下方的快捷提示词，点击后自动填入输入框
const quickPrompts = [
  '最近找实习压力很大，感觉自己的项目还不够完整。',
  '今天学习效率很低，明明想做项目但一直拖延。',
  '我想复盘一下最近的状态，并整理一个明天能执行的小计划。',
]

// 隐私会话标题脱敏：中间用省略号替代，只保留首尾各 2 个字
function displayTitle(title) {
  if (!active.value?.private) return title
  return title.length > 6 ? `${title.slice(0, 2)}···${title.slice(-2)}` : '隐私会话'
}

function displaySessionTitle(session) {
  if (!session.private) return session.title
  return session.title.length > 6 ? `${session.title.slice(0, 2)}···${session.title.slice(-2)}` : '隐私会话'
}

// 发送消息：调用 Store 的 sendMessage，然后清空输入框
function send() {
  mood.sendMessage(input.value)
  input.value = ''
}

// 键盘事件：Enter 发送，Shift+Enter 换行
function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    send()
  }
}

// 点击快捷提示词时填入输入框
function usePrompt(prompt) {
  input.value = prompt
}

// 将会话标题修改委托给 Store
function renameSession(session, title) {
  mood.renameSession(session.id, title)
}

// 删除会话前弹出确认框
function confirmDeleteSession(session) {
  if (window.confirm(`确定删除「${session.title}」吗？该会话的消息和报告会一起删除。`)) {
    mood.deleteSession(session.id)
  }
}

// 复制单条消息内容到剪贴板
async function copyMessage(message) {
  if (!message.content) return
  await navigator.clipboard.writeText(message.content)
  copiedId.value = message.id
  window.setTimeout(() => {
    if (copiedId.value === message.id) copiedId.value = ''
  }, 1400)
}

// 复制当前会话的完整报告 Markdown 到剪贴板
async function copyReport() {
  if (!active.value?.report) return
  await navigator.clipboard.writeText(formatReportMarkdown(active.value))
  reportCopied.value = true
  window.setTimeout(() => {
    reportCopied.value = false
  }, 1400)
}

// 下载当前会话的报告为 .md 文件
function downloadReport() {
  if (!active.value?.report) return
  downloadMarkdown(active.value.title, formatReportMarkdown(active.value))
}

// 跳转到复盘详情页
function openReportDetail() {
  if (!active.value?.report) return
  router.push(`/reports/${active.value.id}`)
}

// 检测当前滚动位置：若在底部则隐藏"回到底部"按钮
function updateScrollState() {
  if (!scrollRef.value) return
  const distance = scrollRef.value.scrollHeight - scrollRef.value.scrollTop - scrollRef.value.clientHeight
  isNearBottom.value = distance < 96
  if (isNearBottom.value) hasUnreadBelow.value = false
}

// 滚动到消息列表底部
async function scrollBottom(behavior = 'smooth') {
  await nextTick()
  if (!scrollRef.value) return
  scrollRef.value.scrollTo({
    top: scrollRef.value.scrollHeight,
    behavior,
  })
  hasUnreadBelow.value = false
  window.setTimeout(updateScrollState, 80)
}

// 消息变化时的滚动策略：
// - 若用户已在底部，自动跟随滚动
// - 若用户向上翻阅历史消息，显示"回到底部"提示，避免打断阅读
async function handleMessagesChanged() {
  if (!didInitialScroll.value) return
  if (isNearBottom.value) {
    await scrollBottom('smooth')
    return
  }
  hasUnreadBelow.value = true
}

// 组件挂载后执行首次滚动（无动画），并标记初始化完成
onMounted(() => {
  scrollBottom('auto')
  didInitialScroll.value = true
})

// 监听激活会话变化：切换会话后自动滚动到底部
watch(() => active.value?.id, () => {
  isNearBottom.value = true
  hasUnreadBelow.value = false
  scrollBottom('auto')
})

/**
 * 深度监听消息内容变化：
 * 将 messages 数组中每条消息的 id、content、status 拼接成一个字符串
 * 当任意消息的内容或状态改变时，这个字符串会变，从而触发 watch 回调
 * 实现效果：AI 逐字输出时自动保持底部跟随
 */
watch(
  () => active.value?.messages.map((msg) => `${msg.id}:${msg.content}:${msg.status}`).join('|'),
  handleMessagesChanged,
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
        <button class="icon-btn" type="button" title="新建会话" @click="mood.createSession">
          <Plus :size="18" />
        </button>
      </div>

      <SessionItem
        v-for="session in mood.orderedSessions"
        :key="session.id"
        :session="session"
        :title="displaySessionTitle(session)"
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
          <h1>{{ active ? displayTitle(active.title) : '新的情绪对话' }}</h1>
          <div class="chat-status">
            <span><Sparkles :size="14" /> {{ settings.aiMode === 'local' ? '本地模式' : '自动模式' }}</span>
            <span><Waves :size="14" /> {{ isAnalyzing ? '分析报告中' : '逐字陪伴' }}</span>
          </div>
        </div>
        <div class="chat-tools">
          <button class="ghost-btn compact" type="button" :disabled="mood.streamingMap?.[active?.id]" @click="mood.regenerate">
            <RefreshCw :size="17" />
            重新生成
          </button>
        </div>
      </header>

      <div ref="scrollRef" class="message-list" @scroll="updateScrollState">
        <div v-if="!active?.messages.length" class="empty-state">
          <h2>说说你现在的状态</h2>
          <p>像翻开一页日记那样，慢慢写就好。</p>
          <div class="prompt-strip">
            <button v-for="prompt in quickPrompts" :key="prompt" type="button" @click="usePrompt(prompt)">
              {{ prompt }}
            </button>
          </div>
        </div>

        <ChatMessage
          v-for="message in active?.messages"
          :key="message.id"
          :message="message"
          :copied="copiedId === message.id"
          @copy="copyMessage"
          @retry="mood.regenerate"
        />

        <button v-if="hasUnreadBelow" class="scroll-bottom-btn" type="button" @click="scrollBottom('smooth')">
          <ArrowDown :size="15" />
          回到底部
        </button>
      </div>

      <form class="composer" @submit.prevent="send">
        <div class="composer-inner">
          <div class="composer-toolbar">
            <div class="composer-control">
              <Gauge :size="16" />
              <span>AI 模式</span>
              <div class="mini-segmented" aria-label="AI 模式">
                <button
                  type="button"
                  :class="{ active: settings.aiMode === 'auto' }"
                  @click="settings.updateSetting('aiMode', 'auto')"
                >
                  自动
                </button>
                <button
                  type="button"
                  :class="{ active: settings.aiMode === 'local' }"
                  @click="settings.updateSetting('aiMode', 'local')"
                >
                  本地
                </button>
              </div>
            </div>
            <div class="composer-control">
              <span>回复</span>
              <div class="mini-segmented" aria-label="回复速度">
                <button
                  v-for="item in [
                    { value: 'slow', label: '慢' },
                    { value: 'normal', label: '中' },
                    { value: 'fast', label: '快' },
                  ]"
                  :key="item.value"
                  type="button"
                  :class="{ active: settings.replySpeed === item.value }"
                  @click="settings.updateSetting('replySpeed', item.value)"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
            <label class="composer-privacy">
              <input
                type="checkbox"
                :checked="Boolean(active?.private)"
                :disabled="!active"
                @change="mood.setSessionPrivate(active.id, $event.target.checked)"
              />
              隐私
            </label>
          </div>
          <textarea
            v-model="input"
            maxlength="800"
            rows="2"
            placeholder="输入你的状态，Enter 发送，Shift + Enter 换行"
            @keydown="handleKeydown"
          />
          <div class="composer-footer">
            <span>{{ input.length }}/800</span>
            <button v-if="!mood.streamingMap?.[active?.id]" class="primary-btn send-btn" type="submit" :disabled="!input.trim()">
              <Send :size="18" />
              发送
            </button>
            <button v-else class="primary-btn send-btn stop" type="button" @click="mood.stopStreaming(active.id)">
              <CircleStop :size="18" />
              停止
            </button>
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
