import type { Session } from '@/types'
import { riskText } from '@/utils'

export function formatReportMarkdown(session: Session): string {
  if (!session?.report) return ''
  const item = session.report
  return [
    `# ${session.title} 情绪报告`,
    '',
    `- 情绪：${item.label}`,
    `- 情绪强度：${item.score}`,
    `- 风险等级：${riskText(item.riskLevel)}`,
    `- 关键词：${item.keywords.join('、')}`,
    '',
    '## 摘要',
    item.summary,
    '',
    '## 建议',
    item.suggestion,
  ].join('\n')
}

export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename || 'moodflow-report'}.md`
  link.click()
  URL.revokeObjectURL(url)
}
