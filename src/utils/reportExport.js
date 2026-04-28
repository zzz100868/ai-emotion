import { riskText } from '@/utils'

// 将单条会话的情绪报告格式化为 Markdown 文本，便于复制或导出
export function formatReportMarkdown(session) {
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

// 触发浏览器下载 Markdown 文件
export function downloadMarkdown(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename || 'moodflow-report'}.md`
  link.click()
  URL.revokeObjectURL(url)
}
