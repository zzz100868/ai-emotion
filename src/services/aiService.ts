import type { EmotionLabel, EmotionReport, Message, RiskLevel } from '@/types'
import { useSettingsStore } from '@/stores/settings'

interface EmotionRule {
  label: EmotionLabel
  words: string[]
  score: number
}

const emotionRules: EmotionRule[] = [
  { label: '焦虑', words: ['焦虑', '压力', '担心', '害怕', '实习', '简历', '来不及', '迷茫'], score: 76 },
  { label: '低落', words: ['难过', '低落', '失败', '没人', '不行', '崩溃', '累'], score: 67 },
  { label: '愤怒', words: ['生气', '烦', '讨厌', '不公平', '气死'], score: 70 },
  { label: '积极', words: ['开心', '顺利', '完成', '进步', '喜欢', '期待'], score: 42 },
]

const defaultEmotion: EmotionRule = { label: '平静', words: ['记录', '复盘', '计划'], score: 52 }

function detectEmotion(text: string): EmotionRule {
  return emotionRules.find((rule) => rule.words.some((word) => text.includes(word))) || defaultEmotion
}

function extractKeywords(text: string): string[] {
  const candidates = ['实习', '简历', '项目', 'Vue', '前端', '学习', '压力', '焦虑', '面试', '时间', '拖延', '状态', '睡眠']
  const matched = candidates.filter((word) => text.includes(word))
  return matched.length ? matched.slice(0, 5) : ['情绪记录', '自我复盘', '行动计划']
}

export function createEmotionReport(text: string): EmotionReport {
  const emotion = detectEmotion(text)
  const keywords = extractKeywords(text)
  const riskLevel: RiskLevel = emotion.score >= 82 ? 'high' : emotion.score >= 68 ? 'medium' : 'low'
  const labelText = emotion.label === '积极' ? '积极状态' : emotion.label

  return {
    label: emotion.label,
    score: emotion.score + Math.floor(Math.random() * 8) - 3,
    riskLevel,
    keywords,
    summary: `本次对话主要围绕「${keywords.slice(0, 3).join('、')}」展开，情绪倾向为${labelText}，整体表达较为清晰。`,
    suggestion: emotion.label === '焦虑'
      ? '把问题拆成一个今天能完成的小动作，比如整理一段项目亮点或投递 3 个岗位。'
      : emotion.label === '低落'
        ? '先降低任务密度，记录一个已经完成的小进展，避免把短期反馈等同于能力判断。'
        : emotion.label === '积极'
          ? '保持当前节奏，把有效做法记录下来，方便后续复用。'
          : '可以继续用简短日记记录触发情绪的事件、想法和下一步行动。',
  }
}

function normalizeReport(report: Partial<EmotionReport> | null, fallbackText: string): EmotionReport {
  const fallback = createEmotionReport(fallbackText)
  const labels: EmotionLabel[] = ['焦虑', '低落', '平静', '积极', '愤怒']
  const risks: RiskLevel[] = ['low', 'medium', 'high']
  const score = Number(report?.score)
  return {
    label: labels.includes(report?.label as EmotionLabel) ? report!.label as EmotionLabel : fallback.label,
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : fallback.score,
    riskLevel: risks.includes(report?.riskLevel as RiskLevel) ? report!.riskLevel as RiskLevel : fallback.riskLevel,
    keywords: Array.isArray(report?.keywords) && report!.keywords.length
      ? report!.keywords.map((item) => String(item).slice(0, 12)).slice(0, 6)
      : fallback.keywords,
    summary: report?.summary ? String(report.summary).slice(0, 90) : fallback.summary,
    suggestion: report?.suggestion ? String(report.suggestion).slice(0, 110) : fallback.suggestion,
    source: report?.source || 'kimi',
  }
}

export async function analyzeEmotionReport({ userText, messages }: { userText: string; messages: Message[] }): Promise<EmotionReport> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    if (!response.ok) throw new Error(`Analyze failed: ${response.status}`)
    const data = await response.json()
    return normalizeReport(data.report, userText)
  } catch {
    return {
      ...createEmotionReport(userText),
      source: 'local',
    }
  }
}

interface TypewriterOptions {
  onToken: (token: string) => void
  onDone: () => void
  delay?: number
}

interface TypewriterController {
  push: (content: string) => void
  finish: () => void
  abort: () => void
}

function createTypewriter({ onToken, onDone, delay = 42 }: TypewriterOptions): TypewriterController {
  const queue: string[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  let ended = false
  let aborted = false

  function stopTimer(): void {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function tick(): void {
    if (aborted) return
    const token = queue.shift()
    if (token) {
      onToken(token)
    }
    if (queue.length > 0) {
      timer = setTimeout(tick, delay)
      return
    }
    timer = null
    if (ended) {
      onDone()
    }
  }

  return {
    push(content: string) {
      if (aborted || !content) return
      queue.push(...Array.from(content))
      if (!timer) {
        timer = setTimeout(tick, delay)
      }
    },
    finish() {
      ended = true
      if (!timer && queue.length === 0) {
        onDone()
      }
    },
    abort() {
      aborted = true
      queue.length = 0
      stopTimer()
    },
  }
}

interface StreamReplyOptions {
  userText: string
  history: Message[]
  onToken: (token: string) => void
  onDone: () => void
  onError: () => void
}

interface StreamController {
  abort: () => void
}

interface MockStreamOptions {
  userText: string
  onToken: (token: string) => void
  onDone: () => void
  onError: () => void
  delay?: number
}

function streamMockAssistantReply({ userText, onToken, onDone, onError, delay = 46 }: MockStreamOptions): StreamController {
  const emotion = detectEmotion(userText)
  const keywords = extractKeywords(userText)
  const reply = [
    `我先帮你把这段状态拆开看：你提到的关键词是 ${keywords.slice(0, 3).join('、')}。`,
    emotion.label === '焦虑'
      ? '这里面最明显的是不确定性带来的焦虑，不一定代表你能力不够，更像是目标太大、反馈太慢，让大脑一直处在等待状态。'
      : emotion.label === '低落'
        ? '这段表达里有一些消耗感。这个时候不适合立刻逼自己做很大的决定，先把问题缩小会更有效。'
        : emotion.label === '积极'
          ? '能看到你现在有一些正向能量，可以趁状态还在，把有效经验沉淀下来。'
          : '你现在的状态相对平稳，适合做一次结构化复盘。',
    '建议你先做一个很小的下一步：写下"当前事实、我的判断、今天能做的一件事"。这样能把情绪从脑子里搬到纸面上，压力会更可控。',
  ].join('\n\n')

  const typewriter = createTypewriter({ onToken, onDone, delay })
  typewriter.push(reply)
  typewriter.finish()

  return {
    abort() {
      typewriter.abort()
      onError()
    },
  }
}

async function streamRealAssistantReply({ messages, signal, onToken }: {
  messages: Message[]
  signal: AbortSignal
  onToken: (token: string) => void
}): Promise<void> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ messages }),
  })

  if (!response.ok || !response.body) {
    throw new Error(`AI service unavailable: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''

    for (const event of events) {
      const line = event.split('\n').find((item) => item.startsWith('data:'))
      if (!line) continue
      const payload = JSON.parse(line.slice(5).trim())
      if (payload.type === 'error') {
        throw new Error(payload.message || 'AI provider error')
      }
      if (payload.type === 'delta') {
        onToken(payload.content)
      }
      if (payload.type === 'done') {
        return
      }
    }
  }
}

export function streamAssistantReply({ userText, history, onToken, onDone, onError }: StreamReplyOptions): StreamController {
  const settings = useSettingsStore()
  let aborted = false
  let fallbackController: StreamController | null = null
  const controller = new AbortController()
  const typewriter = createTypewriter({ onToken, onDone, delay: settings.streamDelay || 38 })

  if (settings.useLocalOnly) {
    return streamMockAssistantReply({
      userText,
      onToken,
      onDone,
      onError,
      delay: settings.streamDelay || 38,
    })
  }

  streamRealAssistantReply({
    messages: history,
    signal: controller.signal,
    onToken: (token: string) => typewriter.push(token),
  }).then(() => {
    if (!aborted) typewriter.finish()
  }).catch(() => {
    if (aborted) return
    typewriter.abort()
    fallbackController = streamMockAssistantReply({
      userText,
      onToken,
      onDone,
      onError,
      delay: settings.streamDelay || 46,
    })
  })

  return {
    abort() {
      aborted = true
      controller.abort()
      typewriter.abort()
      if (fallbackController) {
        fallbackController.abort()
      } else {
        onError()
      }
    },
  }
}
