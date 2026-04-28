<script setup>
/**
 * 管理员情绪看板：仅 admin 角色可访问
 * 展示聚合后的情绪数据，包括风险队列、情绪分布饼图、风险等级柱状图、趋势折线图、关键词排名等
 * 顶部筛选栏支持按关键词、情绪标签、风险等级、时间范围、处理状态过滤
 */

import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import EmotionBadge from '@/components/EmotionBadge.vue'
import MetricCard from '@/components/MetricCard.vue'
import TrendChart from '@/components/TrendChart.vue'
import { useMoodStore } from '@/stores/mood'
import { formatDate, riskText } from '@/utils'

const mood = useMoodStore()

/**
 * keywordRank: 计算当前筛选下出现频率最高的关键词排名
 * 遍历 filteredReports 中每条报告的 keywords 数组，用对象做计数器，再排序取前 8
 */
const keywordRank = computed(() => {
  const map = {}
  mood.filteredReports.forEach((report) => {
    report.keywords.forEach((keyword) => {
      map[keyword] = (map[keyword] || 0) + 1
    })
  })
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
})

// 隐私会话标题脱敏：长标题显示首2字+省略号+末2字，短标题显示"隐私会话"
function displayReportTitle(report) {
  if (!report.private) return report.title
  return report.title.length > 6 ? `${report.title.slice(0, 2)}...${report.title.slice(-2)}` : '隐私会话'
}

function displaySessionTitle(session) {
  if (!session.private) return session.title
  return session.title.length > 6 ? `${session.title.slice(0, 2)}...${session.title.slice(-2)}` : '隐私会话'
}
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

    <!-- 筛选栏：多个 select 和一个输入框，通过 Store 的 setFilters 更新条件 -->
    <section class="filter-bar dashboard-filter">
      <input
        :value="mood.filters.query"
        type="search"
        placeholder="搜索用户、标题、关键词或摘要"
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
      <select :value="mood.filters.range" @change="mood.setFilters({ range: $event.target.value })">
        <option value="all">全部时间</option>
        <option value="7d">最近 7 天</option>
        <option value="30d">最近 30 天</option>
      </select>
      <select :value="mood.filters.status" @change="mood.setFilters({ status: $event.target.value })">
        <option value="all">全部状态</option>
        <option value="pending">待跟进</option>
        <option value="following">跟进中</option>
        <option value="closed">已关闭</option>
      </select>
      <button class="ghost-btn compact" type="button" @click="mood.resetFilters">重置</button>
    </section>

    <!-- 指标卡片：从 Store 的 adminStats getter 获取实时统计 -->
    <section class="metric-grid">
      <MetricCard label="管理对象" :value="mood.adminStats.users" hint="当前筛选下的用户数" />
      <MetricCard label="待跟进" :value="mood.adminStats.pending" hint="需要管理员处理" />
      <MetricCard label="中高风险" :value="mood.adminStats.mediumRisk + mood.adminStats.highRisk" hint="优先进入队列" />
      <MetricCard label="跟进中" :value="mood.adminStats.following" hint="已有处理记录" />
    </section>

    <section class="dashboard-note">
      <strong>管理口径</strong>
      <p>管理端关注用户、风险和处理状态；图表来自筛选后的情绪报告，风险队列会优先展示未关闭的中高风险个案。</p>
    </section>

    <!-- 数据网格：各种图表和列表的组合布局 -->
    <section class="dashboard-grid">
      <!-- 风险队列：展示前 5 个需要优先关注的用户个案 -->
      <article class="analysis-card wide">
        <div class="card-title">
          <h2>近期风险队列</h2>
          <RouterLink class="text-link" to="/sessions">进入个案管理</RouterLink>
        </div>
        <div class="case-queue">
          <div v-if="!mood.userCases.length" class="empty-inline">当前筛选下没有待处理用户。</div>
          <article v-for="userCase in mood.userCases.slice(0, 5)" :key="userCase.ownerId" class="case-row">
            <div>
              <strong>{{ userCase.ownerName }}</strong>
              <span>{{ userCase.ownerGroup }} / {{ userCase.sessions.length }} 条会话 / 最近：{{ displaySessionTitle(userCase.latestSession) }}</span>
            </div>
            <EmotionBadge
              v-if="userCase.latestSession?.report"
              :label="userCase.latestSession.report.label"
              :risk="userCase.latestSession.report.riskLevel"
            />
            <span>{{ userCase.pending }} 待跟进</span>
            <span>{{ userCase.following }} 跟进中</span>
            <RouterLink class="ghost-btn compact" :to="`/sessions?user=${userCase.ownerId}`">查看</RouterLink>
          </article>
        </div>
      </article>

      <!-- 情绪分布饼图 -->
      <article class="analysis-card">
        <div class="card-title">
          <h2>情绪分布</h2>
          <span>mood mix</span>
        </div>
        <TrendChart :reports="mood.filteredReports" type="pie" />
      </article>

      <!-- 风险等级柱状图 -->
      <article class="analysis-card">
        <div class="card-title">
          <h2>风险等级</h2>
          <span>risk bars</span>
        </div>
        <TrendChart :reports="mood.filteredReports" type="bar" />
      </article>

      <!-- 情绪强度趋势折线图：按时间排序展示分数变化 -->
      <article class="analysis-card wide">
        <div class="card-title">
          <h2>情绪强度趋势</h2>
          <span>score / day</span>
        </div>
        <TrendChart :reports="mood.filteredReports" />
      </article>

      <!-- 高频触发词排名 -->
      <article class="analysis-card">
        <div class="card-title">
          <h2>高频触发词</h2>
          <span>keywords</span>
        </div>
        <div class="rank-list">
          <div v-if="!keywordRank.length" class="empty-inline">当前筛选下还没有关键词。</div>
          <div v-for="[keyword, count] in keywordRank" :key="keyword">
            <span>{{ keyword }}</span>
            <strong>{{ count }}</strong>
          </div>
        </div>
      </article>

      <!-- 最近报告列表：展示前 5 条 -->
      <article class="analysis-card wide">
        <div class="card-title">
          <h2>最近报告</h2>
          <span>latest reports</span>
        </div>
        <div class="report-table compact-table">
          <div v-if="!mood.filteredReports.length" class="empty-inline">
            当前筛选没有可展示的报告，放宽筛选或先完成一次对话即可生成数据。
          </div>
          <div v-for="report in mood.filteredReports.slice(0, 5)" :key="report.sessionId" class="table-row">
            <strong>{{ displayReportTitle(report) }}</strong>
            <EmotionBadge :label="report.label" :risk="report.riskLevel" />
            <span>{{ report.score }} 分</span>
            <span>{{ riskText(report.riskLevel) }}</span>
            <span>{{ formatDate(report.updatedAt) }}</span>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
