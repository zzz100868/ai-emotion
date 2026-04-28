import type { RiskLevel } from '@/types'

export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function todayOffset(day: number): number {
  const date = new Date()
  date.setDate(date.getDate() + day)
  date.setHours(10 + Math.abs(day), 30, 0, 0)
  return date.getTime()
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function riskText(level: RiskLevel): string {
  return ({
    low: '低风险',
    medium: '需关注',
    high: '高风险',
  } as const)[level] || '低风险'
}
