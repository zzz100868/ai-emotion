<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { useFilterBar } from '@/composables/useFilterBar'

const { filters, setFilters, resetFilters } = useFilterBar()
</script>

<template>
  <section class="filter-bar">
    <el-input
      :model-value="filters.query"
      :prefix-icon="Search"
      placeholder="搜索用户、标题、关键词或摘要"
      clearable
      @input="(val: string) => setFilters({ query: val })"
    />
    <el-select :model-value="filters.label" @change="(val: string) => setFilters({ label: val as any })">
      <el-option label="全部情绪" value="all" />
      <el-option label="焦虑" value="焦虑" />
      <el-option label="低落" value="低落" />
      <el-option label="平静" value="平静" />
      <el-option label="积极" value="积极" />
      <el-option label="愤怒" value="愤怒" />
    </el-select>
    <el-select :model-value="filters.risk" @change="(val: string) => setFilters({ risk: val as any })">
      <el-option label="全部风险" value="all" />
      <el-option label="低风险" value="low" />
      <el-option label="需关注" value="medium" />
      <el-option label="高风险" value="high" />
    </el-select>
    <el-select :model-value="filters.range" @change="(val: string) => setFilters({ range: val as any })">
      <el-option label="全部时间" value="all" />
      <el-option label="最近 7 天" value="7d" />
      <el-option label="最近 30 天" value="30d" />
    </el-select>
    <el-select :model-value="filters.status" @change="(val: string) => setFilters({ status: val as any })">
      <el-option label="全部状态" value="all" />
      <el-option label="待跟进" value="pending" />
      <el-option label="跟进中" value="following" />
      <el-option label="已关闭" value="closed" />
    </el-select>
    <el-button @click="resetFilters">重置</el-button>
  </section>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 18px;
}
.filter-bar .el-input {
  max-width: 280px;
}
.filter-bar .el-select {
  width: 130px;
}
</style>
