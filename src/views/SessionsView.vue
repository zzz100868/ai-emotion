<script setup>
/**
 * 会话管理页：仅 admin 可访问
 * 按用户聚合展示所有会话，支持展开查看单个用户的全部会话
 * 可执行操作：标记跟进、关闭/重新打开个案、写管理员备注、查看对话原文、删除会话
 */

import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Eye, MessageCircle, Trash2 } from 'lucide-vue-next'
import EmotionBadge from '@/components/EmotionBadge.vue'
import { statusText, useMoodStore } from '@/stores/mood'
import { formatDate, riskText } from '@/utils'

const route = useRoute()
const mood = useMoodStore()

// expandedUserId: 当前展开查看会话列表的用户 ID（空字符串表示全部收起）
const expandedUserId = ref('')
// expandedSessionId: 当前展开查看对话原文的会话 ID
const expandedSessionId = ref('')

// 从 URL 查询参数读取 user=xxx，如果有则自动展开该用户
const selectedUser = computed(() => String(route.query.user || ''))

watch(selectedUser, (id) => {
  if (id) expandedUserId.value = id
}, { immediate: true })

// 隐私会话标题脱敏
function displayTitle(session) {
  if (!session.private) return session.title
  return session.title.length > 6 ? `${session.title.slice(0, 2)}...${session.title.slice(-2)}` : '隐私会话'
}

function confirmDelete(session) {
  if (window.confirm(`确定删除「${session.title}」吗？该会话的消息和报告会一起删除。`)) {
    mood.deleteSession(session.id)
  }
}

// 切换用户折叠/展开状态
function toggleUser(id) {
  expandedUserId.value = expandedUserId.value === id ? '' : id
}

// 切换会话对话原文的折叠/展开状态
function toggleSession(id) {
  expandedSessionId.value = expandedSessionId.value === id ? '' : id
}
</script>

<template>
  <div class="page-stack">
    <header class="page-header">
      <div>
        <p class="eyebrow">Case Admin</p>
        <h1>用户会话管理</h1>
      </div>
    </header>

    <!-- 筛选栏：与 DashboardView 共用同一套 filters，数据实时联动 -->
    <section class="filter-bar">
      <input
        :value="mood.filters.query"
        type="search"
        placeholder="搜索用户、标题、关键词、摘要或备注"
        @input="mood.setFilters({ query: $event.target.value })"
      />
      <select :value="mood.filters.label" @change="mood.setFilters({ label: $event.target.value })">
        <option value="all">全部情绪</option>
        <option value="焦虑">焦虑</option>
        <option value="低落">低落</option>
        <option value="平静">平静</option>
        <option value="积极">积极</option>
        <option value="愤怒">愤怒</option>
      </select>
      <select :value="mood.filters.risk" @change="mood.setFilters({ risk: $event.target.value })">
        <option value="all">全部风险</option>
        <option value="low">低风险</option>
        <option value="medium">需关注</option>
        <option value="high">高风险</option>
      </select>
      <select :value="mood.filters.status" @change="mood.setFilters({ status: $event.target.value })">
        <option value="all">全部状态</option>
        <option value="pending">待跟进</option>
        <option value="following">跟进中</option>
        <option value="closed">已关闭</option>
      </select>
      <select :value="mood.filters.range" @change="mood.setFilters({ range: $event.target.value })">
        <option value="all">全部时间</option>
        <option value="7d">最近 7 天</option>
        <option value="30d">最近 30 天</option>
      </select>
      <button class="ghost-btn compact" type="button" @click="mood.resetFilters">重置筛选</button>
    </section>

    <section class="session-table case-table">
      <!-- 无数据时的空状态提示 -->
      <div v-if="!mood.userCases.length" class="empty-result">
        <strong>没有匹配的用户</strong>
        <p>可以放宽关键词、风险、状态或时间范围筛选，再查看用户会话。</p>
        <button class="ghost-btn compact" type="button" @click="mood.resetFilters">清空筛选</button>
      </div>

      <!-- 遍历 userCases：每个用户一个卡片，内部可展开该用户的所有会话 -->
      <article v-for="userCase in mood.userCases" :key="userCase.ownerId" class="session-card case-card user-case-card">
        <div class="session-card-head">
          <div class="case-identity">
            <strong>{{ userCase.ownerName }}</strong>
            <span>
              {{ userCase.ownerGroup }} / {{ userCase.channel }} / {{ userCase.sessions.length }} 条会话 /
              最近 {{ formatDate(userCase.latestAt) }}
            </span>
          </div>
          <div class="session-actions">
            <span class="case-status" :class="{ 'status-pending': userCase.pending, 'status-following': userCase.following && !userCase.pending }">
              {{ userCase.pending ? `${userCase.pending} 条待跟进` : userCase.following ? `${userCase.following} 条跟进中` : '暂无待处理' }}
            </span>
            <button class="ghost-btn compact" type="button" @click="toggleUser(userCase.ownerId)">
              <Eye :size="15" />
              {{ expandedUserId === userCase.ownerId ? '收起会话' : '查看会话' }}
            </button>
          </div>
        </div>

        <div class="session-meta">
          <span>{{ userCase.highRisk }} 条高风险</span>
          <span>{{ userCase.mediumRisk }} 条需关注</span>
          <span>{{ userCase.sessions.reduce((sum, session) => sum + session.messages.length, 0) }} 条消息</span>
        </div>

        <!-- 展开后显示该用户的所有会话详情 -->
        <div v-if="expandedUserId === userCase.ownerId" class="user-session-list">
          <article v-for="session in userCase.sessions" :key="session.id" class="managed-session">
            <div class="session-card-head">
              <div class="case-identity">
                <strong>{{ displayTitle(session) }}</strong>
                <span>{{ formatDate(session.updatedAt) }} / {{ session.messages.length }} 条消息</span>
              </div>
              <span class="case-status" :class="`status-${session.adminStatus}`">{{ statusText(session.adminStatus) }}</span>
            </div>

            <div class="session-meta">
              <EmotionBadge v-if="session.report" :label="session.report.label" :risk="session.report.riskLevel" />
              <span v-if="session.report">{{ session.report.score }} 分</span>
              <span v-if="session.report">{{ riskText(session.report.riskLevel) }}</span>
              <span>负责人：{{ session.assignee }}</span>
            </div>

            <p>{{ session.report?.summary || '该会话还没有生成情绪报告。' }}</p>

            <!-- 操作按钮组：根据当前状态动态显示可用操作 -->
            <div class="session-actions">
              <button
                v-if="session.adminStatus !== 'following' && session.adminStatus !== 'closed'"
                class="ghost-btn compact"
                type="button"
                @click="mood.setSessionStatus(session.id, 'following')"
              >
                标记跟进
              </button>
              <button
                v-if="session.adminStatus !== 'closed'"
                class="ghost-btn compact"
                type="button"
                @click="mood.setSessionStatus(session.id, 'closed')"
              >
                关闭个案
              </button>
              <button
                v-if="session.adminStatus === 'closed'"
                class="ghost-btn compact"
                type="button"
                @click="mood.setSessionStatus(session.id, 'pending')"
              >
                重新打开
              </button>
              <button class="ghost-btn compact" type="button" @click="toggleSession(session.id)">
                <MessageCircle :size="15" />
                {{ expandedSessionId === session.id ? '收起对话' : '查看对话' }}
              </button>
              <button
                class="ghost-btn compact danger"
                type="button"
                :disabled="mood.sessions.length <= 1 || mood.streamingMap?.[session.id]"
                @click="confirmDelete(session)"
              >
                <Trash2 :size="15" />
                删除
              </button>
            </div>

            <!-- 报告详情与管理员备注 -->
            <div class="report-detail case-detail">
              <div v-if="session.report">
                <span>关键词</span>
                <strong>{{ session.report.keywords.join(' / ') }}</strong>
              </div>
              <div v-if="session.report">
                <span>建议</span>
                <strong>{{ session.report.suggestion }}</strong>
              </div>
              <label>
                <span>管理员备注</span>
                <textarea
                  :value="session.adminNote"
                  rows="3"
                  placeholder="记录已联系、待观察、需要转介等处理情况"
                  @input="mood.updateAdminNote(session.id, $event.target.value)"
                />
              </label>
            </div>

            <!-- 展开后显示该会话的完整对话原文 -->
            <div v-if="expandedSessionId === session.id" class="conversation-audit">
              <div v-if="!session.messages.length" class="empty-inline">这条会话还没有消息。</div>
              <article v-for="message in session.messages" :key="message.id" :class="message.role">
                <span>{{ message.role === 'assistant' ? 'AI 回复' : '用户消息' }}</span>
                <p>{{ message.content || '正在生成...' }}</p>
              </article>
            </div>
          </article>
        </div>
      </article>
    </section>
  </div>
</template>
