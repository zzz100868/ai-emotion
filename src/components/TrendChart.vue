<script setup lang="ts">
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GraphicComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { graphic, init, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts } from 'echarts/core'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { FilteredReport } from '@/types'

use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, GraphicComponent, CanvasRenderer])

const props = defineProps<{
  reports?: FilteredReport[]
  type?: 'line' | 'bar' | 'pie'
}>()

const chartRef = ref<HTMLDivElement | null>(null)
let chart: ECharts | null = null

const option = computed(() => {
  const reports = props.reports || []
  if (!reports.length) {
    return {
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: '暂无可视化数据',
          fill: '#a8a29e',
          fontSize: 14,
          fontFamily: 'Plus Jakarta Sans',
        },
      },
    }
  }

  if (props.type === 'bar') {
    const levels: [string, string][] = [
      ['low', '低风险'],
      ['medium', '需关注'],
      ['high', '高风险'],
    ]
    return {
      grid: { left: 42, right: 18, top: 24, bottom: 30 },
      tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.06)', textStyle: { color: '#1c1917' } },
      xAxis: {
        type: 'category',
        data: levels.map((item) => item[1]),
        axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } },
        axisLabel: { color: '#78716c', fontFamily: 'Plus Jakarta Sans' },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#78716c', fontFamily: 'Plus Jakarta Sans' },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)' } },
      },
      color: ['#8a9a8a'],
      series: [{
        type: 'bar',
        barWidth: 32,
        data: levels.map(([level]) => reports.filter((item) => item.riskLevel === level).length),
        itemStyle: { borderRadius: [6, 6, 2, 2] },
      }],
    }
  }

  if (props.type === 'pie') {
    const map = reports.reduce<Record<string, number>>((acc, item) => {
      acc[item.label] = (acc[item.label] || 0) + 1
      return acc
    }, {})
    return {
      tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.06)', textStyle: { color: '#1c1917' } },
      color: ['#b85c42', '#6b8f71', '#5a7a8a', '#b4882e', '#6a9a7a'],
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        data: Object.entries(map).map(([name, value]) => ({ name, value })),
        label: { color: '#57534e', fontFamily: 'Plus Jakarta Sans' },
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      }],
    }
  }

  const sorted = [...reports].sort((a, b) => a.updatedAt - b.updatedAt)
  return {
    grid: { left: 36, right: 18, top: 28, bottom: 28 },
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.06)', textStyle: { color: '#1c1917' } },
    xAxis: {
      type: 'category',
      data: sorted.map((item) => new Date(item.updatedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })),
      axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } },
      axisLabel: { color: '#78716c', fontFamily: 'Plus Jakarta Sans' },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: '#78716c', fontFamily: 'Plus Jakarta Sans' },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)' } },
    },
    color: ['#b85c42'],
    series: [{
      type: 'line',
      smooth: true,
      symbolSize: 7,
      lineStyle: { width: 2.5 },
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(184, 92, 66, .15)' },
          { offset: 1, color: 'rgba(184, 92, 66, 0)' },
        ]),
      },
      data: sorted.map((item) => item.score),
    }],
  }
})

function render(): void {
  if (!chartRef.value) return
  if (!chart) chart = init(chartRef.value)
  chart.clear()
  chart.setOption(option.value)
}

onMounted(() => {
  render()
  window.addEventListener('resize', render)
})

watch(option, render, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', render)
  chart?.dispose()
})
</script>

<template>
  <div ref="chartRef" class="chart-box" />
</template>
