<script setup>
/**
 * 图表组件：基于 ECharts 封装，支持三种图表类型
 * - line（默认）：情绪强度趋势折线图，带渐变面积填充
 * - pie：情绪分布饼图（环形图）
 * - bar：风险等级柱状图
 *
 * 使用方式：<TrendChart :reports="报告数组" type="pie|bar|line" />
 */

import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GraphicComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { graphic, init, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// 注册 ECharts 所需的模块（tree-shaking 模式下必须手动注册）
use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, GraphicComponent, CanvasRenderer])

const props = defineProps({
  // reports: 报告数组，每条报告需包含 { label, score, riskLevel, updatedAt }
  reports: { type: Array, default: () => [] },
  // type: 图表类型，'line' | 'bar' | 'pie'
  type: { type: String, default: 'line' },
})

// chartRef: 绑定到模板中 div 的 DOM 引用，ECharts 实例会挂载到这个 div 上
const chartRef = ref(null)
// chart: ECharts 实例对象，在 onMounted 中初始化
let chart = null

/**
 * option: ECharts 配置对象（计算属性）
 * 根据 props.type 和 props.reports 的变化自动重新计算
 */
const option = computed(() => {
  // 无数据时显示占位文字
  if (!props.reports.length) {
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

  // 柱状图：统计各风险等级的报告数量
  if (props.type === 'bar') {
    const levels = [
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
        // 统计每个风险等级对应的报告数量
        data: levels.map(([level]) => props.reports.filter((item) => item.riskLevel === level).length),
        itemStyle: { borderRadius: [6, 6, 2, 2] },
      }],
    }
  }

  // 饼图：统计各情绪标签的出现次数
  if (props.type === 'pie') {
    const map = props.reports.reduce((acc, item) => {
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

  // 默认折线图：按更新时间排序展示情绪强度分数变化趋势
  const sorted = [...props.reports].sort((a, b) => a.updatedAt - b.updatedAt)
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

// 渲染/重新渲染图表：若实例不存在则初始化，否则清空后设置新配置
function render() {
  if (!chartRef.value) return
  if (!chart) chart = init(chartRef.value)
  chart.clear()
  chart.setOption(option.value)
}

onMounted(() => {
  render()
  // 窗口大小变化时重新渲染，保证图表自适应容器宽度
  window.addEventListener('resize', render)
})

// 深度监听 option 变化：当 reports 数据或 type 改变时自动重绘
watch(option, render, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', render)
  // 销毁 ECharts 实例，释放内存
  chart?.dispose()
})
</script>

<template>
  <div ref="chartRef" class="chart-box" />
</template>
