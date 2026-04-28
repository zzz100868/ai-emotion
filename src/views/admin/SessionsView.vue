<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChatLineSquare, Delete, View } from '@element-plus/icons-vue'
import EmotionBadge from '@/components/EmotionBadge.vue'
import FilterBar from '@/components/FilterBar.vue'
import { useSessionTitle } from '@/composables/useSessionTitle'
import type { Session } from '@/types'
import { statusText, useMoodStore } from '@/stores/mood'
import { formatDate, riskText } from '@/utils'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const mood = useMoodStore()
const { displayTitle } = useSessionTitle()

const expandedUserId = ref('')
const expandedSessionId = ref('')

const selectedUser = computed(() => String(route.query.user || ''))

watch(selectedUser, (id) => {
  if (id) expandedUserId.value = id
}, { immediate: true })

async function confirmDelete(session: Session): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `该会话的消息和报告会一起删除。`,
      `确定删除「${session.title}」吗？`,
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
    mood.deleteSession(session.id)
  } catch { /* cancelled */ }
}

function toggleUser(id: string): void {
  expandedUserId.value = expandedUserId.value === id ? '' : id
}

function toggleSession(id: string): void {
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

    <FilterBar />

    <section class="session-table case-table">
      <div v-if="!mood.userCases.length" class="empty-result">
        <strong>没有匹配的用户</strong>
        <p>可以放宽关键词、风险、状态或时间范围筛选，再查看用户会话。</p>
        <el-button @click="mood.resetFilters">清空筛选</el-button>
      </div>

      <el-card v-for="userCase in mood.userCases" :key="userCase.ownerId" shadow="never" style="margin-bottom: 16px">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px">
            <div>
              <strong>{{ userCase.ownerName }}</strong>
              <span style="color: var(--el-text-color-secondary); margin-left: 8px; font-size: 13px">
                {{ userCase.ownerGroup }} / {{ userCase.channel }} / {{ userCase.sessions.length }} 条会话 /
                最近 {{ formatDate(userCase.latestAt) }}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px">
              <el-tag v-if="userCase.pending" type="warning" size="small">{{ userCase.pending }} 条待跟进</el-tag>
              <el-tag v-else-if="userCase.following" type="success" size="small">{{ userCase.following }} 条跟进中</el-tag>
              <el-tag v-else size="small" type="info">暂无待处理</el-tag>
              <el-button :icon="View" size="small" @click="toggleUser(userCase.ownerId)">
                {{ expandedUserId === userCase.ownerId ? '收起会话' : '查看会话' }}
              </el-button>
            </div>
          </div>
        </template>

        <div style="display: flex; gap: 16px; font-size: 13px; color: var(--el-text-color-secondary)">
          <span>{{ userCase.highRisk }} 条高风险</span>
          <span>{{ userCase.mediumRisk }} 条需关注</span>
          <span>{{ userCase.sessions.reduce((sum: number, s: Session) => sum + s.messages.length, 0) }} 条消息</span>
        </div>

        <div v-if="expandedUserId === userCase.ownerId" style="margin-top: 16px">
          <el-card v-for="session in userCase.sessions" :key="session.id" shadow="never" style="margin-bottom: 12px">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center">
                <div>
                  <strong>{{ displayTitle(session.title, session.private) }}</strong>
                  <span style="color: var(--el-text-color-secondary); margin-left: 8px; font-size: 13px">
                    {{ formatDate(session.updatedAt) }} / {{ session.messages.length }} 条消息
                  </span>
                </div>
                <el-tag :type="session.adminStatus === 'pending' ? 'warning' : session.adminStatus === 'following' ? 'success' : 'info'" size="small">
                  {{ statusText(session.adminStatus) }}
                </el-tag>
              </div>
            </template>

            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 8px">
              <EmotionBadge v-if="session.report" :label="session.report.label" :risk="session.report.riskLevel" />
              <span v-if="session.report" style="font-size: 13px">{{ session.report.score }} 分</span>
              <span v-if="session.report" style="font-size: 13px">{{ riskText(session.report.riskLevel) }}</span>
              <span style="font-size: 13px; color: var(--el-text-color-secondary)">负责人：{{ session.assignee }}</span>
            </div>

            <p>{{ session.report?.summary || '该会话还没有生成情绪报告。' }}</p>

            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0">
              <el-button
                v-if="session.adminStatus !== 'following' && session.adminStatus !== 'closed'"
                size="small"
                @click="mood.setSessionStatus(session.id, 'following')"
              >
                标记跟进
              </el-button>
              <el-button
                v-if="session.adminStatus !== 'closed'"
                size="small"
                @click="mood.setSessionStatus(session.id, 'closed')"
              >
                关闭个案
              </el-button>
              <el-button
                v-if="session.adminStatus === 'closed'"
                size="small"
                @click="mood.setSessionStatus(session.id, 'pending')"
              >
                重新打开
              </el-button>
              <el-button :icon="ChatLineSquare" size="small" @click="toggleSession(session.id)">
                {{ expandedSessionId === session.id ? '收起对话' : '查看对话' }}
              </el-button>
              <el-button
                :icon="Delete"
                size="small"
                type="danger"
                plain
                :disabled="mood.sessions.length <= 1 || Boolean(mood.streamingMap?.[session.id])"
                @click="confirmDelete(session)"
              >
                删除
              </el-button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px">
              <div v-if="session.report">
                <span style="font-size: 12px; color: var(--el-text-color-secondary)">关键词</span>
                <div class="keyword-list" style="margin-top: 4px">
                  <el-tag v-for="kw in session.report.keywords" :key="kw" size="small" effect="plain" round>{{ kw }}</el-tag>
                </div>
              </div>
              <div v-if="session.report">
                <span style="font-size: 12px; color: var(--el-text-color-secondary)">建议</span>
                <p style="margin: 4px 0 0">{{ session.report.suggestion }}</p>
              </div>
              <div>
                <span style="font-size: 12px; color: var(--el-text-color-secondary)">管理员备注</span>
                <el-input
                  :model-value="session.adminNote"
                  type="textarea"
                  :rows="2"
                  placeholder="记录已联系、待观察、需要转介等处理情况"
                  style="margin-top: 4px"
                  @input="(val: string) => mood.updateAdminNote(session.id, val)"
                />
              </div>
            </div>

            <div v-if="expandedSessionId === session.id" style="margin-top: 12px; border-top: 1px solid var(--el-border-color-lighter); padding-top: 12px">
              <div v-if="!session.messages.length" class="empty-inline">这条会话还没有消息。</div>
              <article v-for="message in session.messages" :key="message.id" :class="message.role" style="margin-bottom: 8px">
                <el-tag :type="message.role === 'assistant' ? 'success' : 'info'" size="small" style="margin-bottom: 4px">
                  {{ message.role === 'assistant' ? 'AI 回复' : '用户消息' }}
                </el-tag>
                <p style="margin: 0; line-height: 1.6">{{ message.content || '正在生成...' }}</p>
              </article>
            </div>
          </el-card>
        </div>
      </el-card>
    </section>
  </div>
</template>
