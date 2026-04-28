import { describe, expect, it } from 'vitest'
import { formatReportMarkdown } from './reportExport'

describe('formatReportMarkdown', () => {
  it('formats a report into portable markdown', () => {
    const markdown = formatReportMarkdown({
      title: '学习节奏调整',
      report: {
        label: '平静',
        score: 58,
        riskLevel: 'low',
        keywords: ['Vue', '项目'],
        summary: '任务优先级不清。',
        suggestion: '先做一个小迭代。',
      },
    })

    expect(markdown).toContain('# 学习节奏调整 情绪报告')
    expect(markdown).toContain('- 风险等级：低风险')
    expect(markdown).toContain('- 关键词：Vue、项目')
    expect(markdown).toContain('## 建议')
  })
})
