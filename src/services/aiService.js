import { useSettingsStore } from '@/stores/settings'

/**
 * 本地情绪规则表：用于无 API 密钥时的兜底分析
 * 每条规则包含：
 * - label: 情绪标签（焦虑、低落、愤怒、积极）
 * - words: 触发该情绪的关键词数组
 * - score: 该情绪的基础分数（用于计算风险等级）
 */
const emotionRules = [
  { label: '焦虑', words: ['焦虑', '压力', '担心', '害怕', '实习', '简历', '来不及', '迷茫'], score: 76 },
  { label: '低落', words: ['难过', '低落', '失败', '没人', '不行', '崩溃', '累'], score: 67 },
  { label: '愤怒', words: ['生气', '烦', '讨厌', '不公平', '气死'], score: 70 },
  { label: '积极', words: ['开心', '顺利', '完成', '进步', '喜欢', '期待'], score: 42 },
]

/**
 * detectEmotion(text):
 * 遍历 emotionRules，检查 text 中是否包含某个规则的关键词
 * 返回匹配到的规则对象，若无匹配则返回默认"平静"规则
 */
function detectEmotion(text) {
  const matched = emotionRules.find((rule) => rule.words.some((word) => text.includes(word)))
  return matched || { label: '平静', words: ['记录', '复盘', '计划'], score: 52 }
}

/**
 * extractKeywords(text):
 * 从预设候选词列表中筛选出 text 里出现过的词，最多返回 5 个
 * 若无匹配则返回默认通用关键词
 */
function extractKeywords(text) {
  const candidates = ['实习', '简历', '项目', 'Vue', '前端', '学习', '压力', '焦虑', '面试', '时间', '拖延', '状态', '睡眠']
  const matched = candidates.filter((word) => text.includes(word))
  return matched.length ? matched.slice(0, 5) : ['情绪记录', '自我复盘', '行动计划']
}

/**
 * createEmotionReport(text):
 * 纯本地生成情绪报告，不依赖网络请求
 * 返回对象结构：{ label, score, riskLevel, keywords, summary, suggestion }
 * - score 会加入小幅随机波动（±3）
 * - riskLevel: score>=82 为 high，>=68 为 medium，其余为 low
 * - summary 和 suggestion 根据情绪标签拼接固定模板
 */
export function createEmotionReport(text) {
  const emotion = detectEmotion(text)
  const keywords = extractKeywords(text)
  const riskLevel = emotion.score >= 82 ? 'high' : emotion.score >= 68 ? 'medium' : 'low'
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

/**
 * normalizeReport(report, fallbackText):
 * 对 AI 返回的报告进行字段校验和裁剪，防止模型输出非法值导致前端报错
 * - label 必须在预设列表中，否则使用 fallback
 * - score 限定在 0~100 整数范围
 * - riskLevel 必须是 low/medium/high 之一
 * - keywords 最多保留 6 个，每个最多 12 字
 * - summary 和 suggestion 限制长度，防止溢出
 */
function normalizeReport(report, fallbackText) {
  const fallback = createEmotionReport(fallbackText)
  const labels = ['焦虑', '低落', '平静', '积极', '愤怒']
  const risks = ['low', 'medium', 'high']
  const score = Number(report?.score)
  return {
    label: labels.includes(report?.label) ? report.label : fallback.label,
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : fallback.score,
    riskLevel: risks.includes(report?.riskLevel) ? report.riskLevel : fallback.riskLevel,
    keywords: Array.isArray(report?.keywords) && report.keywords.length
      ? report.keywords.map((item) => String(item).slice(0, 12)).slice(0, 6)
      : fallback.keywords,
    summary: report?.summary ? String(report.summary).slice(0, 90) : fallback.summary,
    suggestion: report?.suggestion ? String(report.suggestion).slice(0, 110) : fallback.suggestion,
    source: report?.source || 'kimi',
  }
}

/**
 * analyzeEmotionReport({ userText, messages }):
 * 调用服务端 /api/analyze 接口，让大模型生成结构化情绪报告
 * - messages: 当前会话的完整消息数组，后端会取最近 10 条做分析
 * - 若接口请求失败（无密钥、网络错误等），自动降级到 createEmotionReport
 * 返回规范化后的报告对象
 */
export async function analyzeEmotionReport({ userText, messages }) {
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

/**
 * createTypewriter({ onToken, onDone, delay }):
 * 打字机效果控制器，用于将一段文字按固定延迟逐字"播放"
 *
 * 参数说明：
 * - onToken: 每输出一个字符时调用的回调函数
 * - onDone: 全部字符输出完毕时调用的回调函数
 * - delay: 每个字符之间的间隔毫秒数
 *
 * 返回对象方法：
 * - push(content): 将一段字符串加入输出队列
 * - finish(): 标记输入结束，队列清空后自动调用 onDone
 * - abort(): 立即清空队列并停止计时器，不再触发任何回调
 */
function createTypewriter({ onToken, onDone, delay = 42 }) {
  const queue = []
  let timer = null
  let ended = false
  let aborted = false

  function stopTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function tick() {
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
    push(content) {
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

/**
 * streamMockAssistantReply({ userText, onToken, onDone, onError, delay }):
 * 本地模拟 AI 回复：不请求任何接口，根据关键词匹配拼接一段固定文案
 * 再通过 createTypewriter 逐字输出，营造"正在思考"的视觉效果
 * 适合演示环境或未配置 API 密钥时使用
 */
function streamMockAssistantReply({ userText, onToken, onDone, onError, delay = 46 }) {
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
    '建议你先做一个很小的下一步：写下“当前事实、我的判断、今天能做的一件事”。这样能把情绪从脑子里搬到纸面上，压力会更可控。',
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

/**
 * streamRealAssistantReply({ messages, signal, onToken }):
 * 请求真实大模型接口（SSE 流式传输）
 *
 * 参数说明：
 * - messages: 当前会话的历史消息数组（不含正在生成的占位消息）
 * - signal: AbortController.signal，用于外部取消请求
 * - onToken: 每收到一个有效字符时调用的回调
 *
 * 实现细节：
 * 1. 向 /api/chat 发送 POST 请求
 * 2. 使用 ReadableStream.getReader() 读取响应流
 * 3. 按 SSE 格式解析 data: 开头的行，提取 JSON 中的 content 字段
 * 4. 遇到 type='done' 或数据流结束时退出
 */
async function streamRealAssistantReply({ messages, signal, onToken }) {
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

/**
 * streamAssistantReply({ userText, history, onToken, onDone, onError }):
 * 对外暴露的统一 AI 回复入口
 *
 * 执行逻辑：
 * 1. 读取 settings.aiMode，若为 'local' 直接走本地模拟回复
 * 2. 否则先尝试请求真实 AI 接口
 * 3. 真实接口返回的 token 先进入一个 typewriter 做延迟输出（避免一次性刷出全部内容）
 * 4. 若真实接口请求失败，自动降级到本地模拟回复
 *
 * 返回值：{ abort() } 对象，调用 abort() 可中断整个流程
 */
export function streamAssistantReply({ userText, history, onToken, onDone, onError }) {
  const settings = useSettingsStore()
  let aborted = false
  let fallbackController = null
  const controller = new AbortController()
  const typewriter = createTypewriter({ onToken, onDone, delay: settings.streamDelay || 38 })

  // 本地模式：直接走模拟回复，不发起网络请求
  if (settings.useLocalOnly) {
    return streamMockAssistantReply({
      userText,
      onToken,
      onDone,
      onError,
      delay: settings.streamDelay || 38,
    })
  }

  // 尝试请求真实 AI
  streamRealAssistantReply({
    messages: history,
    signal: controller.signal,
    onToken: (token) => typewriter.push(token),
  }).then(() => {
    if (!aborted) typewriter.finish()
  }).catch(() => {
    if (aborted) return
    typewriter.abort()
    // 降级到本地模拟回复
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
