import { describe, expect, it } from 'vitest'
import { createEmotionReport } from './aiService'

describe('createEmotionReport', () => {
  it('creates a structured local fallback report', () => {
    const report = createEmotionReport('最近找实习压力很大，担心简历没有回复')

    expect(report.label).toBe('焦虑')
    expect(report.keywords).toContain('实习')
    expect(report.riskLevel).toBeTypeOf('string')
    expect(report.summary.length).toBeGreaterThan(0)
  })
})
