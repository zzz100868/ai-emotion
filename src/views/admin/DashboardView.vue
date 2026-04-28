<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import EmotionBadge from '@/components/EmotionBadge.vue'
import FilterBar from '@/components/FilterBar.vue'
import MetricCard from '@/components/MetricCard.vue'
import TrendChart from '@/components/TrendChart.vue'
import { useSessionTitle } from '@/composables/useSessionTitle'
import { useMoodStore } from '@/stores/mood'
import { formatDate, riskText } from '@/utils'

const mood = useMoodStore()
const { displayTitle } = useSessionTitle()

const keywordRank = computed(() => {
  const map: Record<string, number> = {}
  mood.filteredReports.forEach((report) => {
    report.keywords.forEach((keyword) => {
      map[keyword] = (map[keyword] || 0) + 1
    })
  })
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
})
</script>

<template>
  <div class="page-stack">
    <header class="page-header">
      <div>
        <p class="eyebrow">Admin Overview</p>
        <h1>管理员总览</h1>
      </div>
      <p>聚合用户端产生的情绪报告，优先识别高风险个案、待跟进记录和近期情绪变化。</p>
    </header>

    <FilterBar />

    <section class="metric-grid">
      <MetricCard label="管理对象" :value="mood.adminStats.users" hint="当前筛选下的用户数" />
      <MetricCard label="待跟进" :value="mood.adminStats.pending" hint="需要管理员处理" />
      <MetricCard label="中高风险" :value="mood.adminStats.mediumRisk + mood.adminStats.highRisk" hint="优先进入队列" />
      <MetricCard label="跟进中" :value="mood.adminStats.following" hint="已有处理记录" />
    </section>

    <el-alert type="info" :closable="false" style="margin-bottom: 18px">
      <template #title>
        <strong>管理口径</strong> — 管理端关注用户、风险和处理状态；图表来自筛选后的情绪报告，风险队列会优先展示未关闭的中高风险个案。
      </template>
    </el-alert>

    <section class="dashboard-grid">
      <el-card shadow="never" class="wide">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <h2 style="margin: 0; font-size: 16px">近期风险队列</h2>
            <RouterLink to="/sessions">
              <el-button text size="small">进入个案管理</el-button>
            </RouterLink>
          </div>
        </template>
        <div class="case-queue">
          <div v-if="!mood.userCases.length" class="empty-inline">当前筛选下没有待处理用户。</div>
          <article v-for="userCase in mood.userCases.slice(0, 5)" :key="userCase.ownerId" class="case-row">
            <div>
              <strong>{{ userCase.ownerName }}</strong>
              <span>{{ userCase.ownerGroup }} / {{ userCase.sessions.length }} 条会话 / 最近：{{ userCase.latestSession ? displayTitle(userCase.latestSession.title, userCase.latestSession.private) : '' }}</span>
            </div>
            <EmotionBadge
              v-if="userCase.latestSession?.report"
              :label="userCase.latestSession.report.label"
              :risk="userCase.latestSession.report.riskLevel"
            />
            <span>{{ userCase.pending }} 待跟进</span>
            <span>{{ userCase.following }} 跟进中</span>
            <RouterLink :to="`/sessions?user=${userCase.ownerId}`">
              <el-button text size="small">查看</el-button>
            </RouterLink>
          </article>
        </div>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <h2 style="margin: 0; font-size: 16px">情绪分布</h2>
            <span style="color: var(--el-text-color-secondary); font-size: 12px">mood mix</span>
          </div>
        </template>
        <TrendChart :reports="mood.filteredReports" type="pie" />
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <h2 style="margin: 0; font-size: 16px">风险等级</h2>
            <span style="color: var(--el-text-color-secondary); font-size: 12px">risk bars</span>
          </div>
        </template>
        <TrendChart :reports="mood.filteredReports" type="bar" />
      </el-card>

      <el-card shadow="never" class="wide">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <h2 style="margin: 0; font-size: 16px">情绪强度趋势</h2>
            <span style="color: var(--el-text-color-secondary); font-size: 12px">score / day</span>
          </div>
        </template>
        <TrendChart :reports="mood.filteredReports" />
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <h2 style="margin: 0; font-size: 16px">高频触发词</h2>
            <span style="color: var(--el-text-color-secondary); font-size: 12px">keywords</span>
          </div>
        </template>
        <div class="rank-list">
          <div v-if="!keywordRank.length" class="empty-inline">当前筛选下还没有关键词。</div>
          <div v-for="[keyword, count] in keywordRank" :key="keyword" style="display: flex; justify-content: space-between; padding: 6px 0">
            <span>{{ keyword }}</span>
            <strong>{{ count }}</strong>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="wide">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <h2 style="margin: 0; font-size: 16px">最近报告</h2>
            <span style="color: var(--el-text-color-secondary); font-size: 12px">latest reports</span>
          </div>
        </template>
        <el-table :data="mood.filteredReports.slice(0, 5)" stripe style="width: 100%">
          <el-table-column prop="title" label="标题">
            <template #default="{ row }">
              {{ displayTitle(row.title, row.private) }}
            </template>
          </el-table-column>
          <el-table-column label="情绪" width="90">
            <template #default="{ row }">
              <EmotionBadge :label="row.label" :risk="row.riskLevel" />
            </template>
          </el-table-column>
          <el-table-column prop="score" label="分数" width="70" />
          <el-table-column label="风险" width="80">
            <template #default="{ row }">
              {{ riskText(row.riskLevel) }}
            </template>
          </el-table-column>
          <el-table-column label="时间" width="120">
            <template #default="{ row }">
              {{ formatDate(row.updatedAt) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </section>
  </div>
</template>
