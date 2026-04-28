import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const env = loadEnv()
const port = Number(env.MOODFLOW_API_PORT || 8787)

/**
 * loadEnv(): 加载环境变量
 * 1. 先复制当前进程已有的环境变量（process.env）
 * 2. 读取项目根目录的 .env.local 文件
 * 3. 按 KEY=VALUE 格式解析每一行，去除引号后合并到结果中
 * 4. 返回合并后的环境变量对象
 *
 * 项目中使用的环境变量：
 * - MOODFLOW_API_KEY: 大模型 API 密钥
 * - MOODFLOW_API_BASE_URL: 大模型 API 基础地址（默认 Moonshot）
 * - MOODFLOW_MODEL: 模型名称（默认 moonshot-v1-auto）
 * - MOODFLOW_API_PORT: 本地服务端口（默认 8787）
 */
function loadEnv() {
  const result = { ...process.env }
  const envPath = join(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return result

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '')
    result[key] = value
  }
  return result
}

// 发送 JSON 响应的通用函数：设置状态码、Content-Type 和 CORS 头
function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(data))
}

// 内置演示账号数据：用于模拟登录鉴权
const demoAccounts = [
  {
    username: 'admin',
    password: 'MoodFlow@2026Admin',
    token: 'mock-admin-token',
    user: { id: 'u_admin', name: '管理员', role: 'admin' },
  },
  {
    username: 'user',
    password: 'MoodFlow@2026Chen',
    token: 'mock-user-chen-token',
    user: { id: 'u_chen', name: '陈然', group: '求职支持', role: 'user' },
  },
  {
    username: 'lin',
    password: 'MoodFlow@2026Lin',
    token: 'mock-user-lin-token',
    user: { id: 'u_lin', name: '林溪', group: '学习规划', role: 'user' },
  },
  {
    username: 'zhou',
    password: 'MoodFlow@2026Zhou',
    token: 'mock-user-zhou-token',
    user: { id: 'u_zhou', name: '周宁', group: '重点观察', role: 'user' },
  },
]

/**
 * writeSse(res, payload): 写入 SSE 数据行
 * SSE 格式：每行以 "data: " 开头，以两个换行符结束
 */
function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

/**
 * readBody(req): 从请求流中读取完整的请求体并解析为 JSON
 * Node.js 的 http 请求是流式对象，需要逐段读取后拼接
 */
async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

/**
 * buildMessages(messages): 构建发给大模型的消息数组
 * - 截取最近 8 条消息（防止上下文过长导致 token 超限）
 * - 在最前面插入系统提示词（system prompt），定义 AI 的角色和行为边界
 */
function buildMessages(messages = []) {
  const recent = messages.slice(-8).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
  }))
  return [
    {
      role: 'system',
      content: [
        '你是 MoodFlow 的情绪复盘助手。',
        '你的任务是共情、澄清和帮助用户做行动拆解，但不要做医疗诊断，不要声称提供心理治疗。',
        '回复使用中文，语气温和，结构清晰，控制在 180 字以内。',
      ].join('\n'),
    },
    ...recent,
  ]
}

/**
 * extractJson(text): 从 AI 返回的文本中提取 JSON 对象
 * 使用正则匹配第一个 { ... } 块，然后 JSON.parse 解析
 */
function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object found in model response')
  return JSON.parse(match[0])
}

/**
 * handleChat(req, res): 处理 AI 对话流接口（/api/chat）
 * 核心逻辑：
 * 1. 检查 MOODFLOW_API_KEY 是否配置，未配置则返回 SSE 错误
 * 2. 读取请求体中的 messages 数组
 * 3. 向大模型 API 发起流式请求（stream=true）
 * 4. 将大模型的 SSE 响应逐段转发给前端
 * 5. 把 provider 的 data: {choices:[{delta:{content}}]} 格式转换为本项目的 data: {type:'delta', content} 格式
 */
async function handleChat(req, res) {
  if (!env.MOODFLOW_API_KEY) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })
    writeSse(res, { type: 'error', message: 'MOODFLOW_API_KEY is not configured' })
    res.end()
    return
  }

  const body = await readBody(req)
  const baseUrl = (env.MOODFLOW_API_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = env.MOODFLOW_MODEL || 'moonshot-v1-auto'

  // 设置 SSE 响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  const providerResponse = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MOODFLOW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.7,
      messages: buildMessages(body.messages),
    }),
  })

  if (!providerResponse.ok || !providerResponse.body) {
    const text = await providerResponse.text()
    writeSse(res, { type: 'error', message: text || providerResponse.statusText })
    res.end()
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  // 读取大模型返回的流数据，逐行解析 SSE 格式
  for await (const chunk of providerResponse.body) {
    buffer += decoder.decode(chunk, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') {
        writeSse(res, { type: 'done' })
        res.end()
        return
      }
      try {
        const json = JSON.parse(data)
        const token = json.choices?.[0]?.delta?.content || ''
        if (token) writeSse(res, { type: 'delta', content: token })
      } catch {
        // 忽略 provider 发送的 keepalive 或非 JSON 片段
      }
    }
  }

  writeSse(res, { type: 'done' })
  res.end()
}

/**
 * handleAnalyze(req, res): 处理情绪分析接口（/api/analyze）
 * 与 handleChat 的区别：
 * - 非流式请求（stream=false），一次性返回完整结果
 * - 使用不同的 system prompt，要求模型只输出 JSON
 * - 取最近 10 条消息作为分析素材
 */
async function handleAnalyze(req, res) {
  if (!env.MOODFLOW_API_KEY) {
    sendJson(res, 503, { error: 'MOODFLOW_API_KEY is not configured' })
    return
  }

  const body = await readBody(req)
  const baseUrl = (env.MOODFLOW_API_BASE_URL || 'https://api.moonshot.cn/v1').replace(/\/$/, '')
  const model = env.MOODFLOW_MODEL || 'moonshot-v1-auto'

  // 将最近 10 条消息格式化为 "角色：内容" 的文本片段
  const transcript = (body.messages || [])
    .slice(-10)
    .map((message) => `${message.role === 'assistant' ? 'AI' : '用户'}：${message.content}`)
    .join('\n')

  const providerResponse = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MOODFLOW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0.2, // 低温度使输出更稳定、更遵循格式要求
      messages: [
        {
          role: 'system',
          content: [
            '你是情绪复盘数据分析器，只能输出一个 JSON 对象，不要输出 Markdown，不要输出解释。',
            '不要做医疗诊断。只根据对话做情绪倾向、关键词、风险提示和行动建议。',
            'JSON 字段：label, score, riskLevel, keywords, summary, suggestion。',
            'label 只能是：焦虑、低落、平静、积极、愤怒。',
            'score 是 0 到 100 的整数，riskLevel 只能是 low、medium、high。',
            'keywords 是 3 到 6 个中文短词数组，summary 和 suggestion 控制在 50 字以内。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: `请分析以下对话：\n${transcript}`,
        },
      ],
    }),
  })

  if (!providerResponse.ok) {
    const text = await providerResponse.text()
    sendJson(res, providerResponse.status, { error: text || providerResponse.statusText })
    return
  }

  const json = await providerResponse.json()
  const content = json.choices?.[0]?.message?.content || ''
  const report = extractJson(content)
  sendJson(res, 200, { report })
}

/**
 * handleLogin(req, res): 处理登录接口（/api/login）
 * 在 demoAccounts 数组中查找匹配的 username + password
 * 找到则返回 { token, user }，否则返回 401 错误
 */
async function handleLogin(req, res) {
  const body = await readBody(req)
  const account = demoAccounts.find((item) => (
    item.username === String(body.username || '').trim() &&
    item.password === String(body.password || '')
  ))

  if (!account) {
    sendJson(res, 401, { error: '账号或密码不正确' })
    return
  }

  sendJson(res, 200, {
    token: account.token,
    user: account.user,
  })
}

// 创建 HTTP 服务器并注册路由分发逻辑
const server = http.createServer(async (req, res) => {
  // 处理跨域预检请求（OPTIONS），允许所有来源的 POST 请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    res.end()
    return
  }

  try {
    // 路由分发：根据请求方法和路径匹配到对应的处理函数
    if (req.method === 'POST' && req.url === '/api/login') {
      await handleLogin(req, res)
      return
    }
    if (req.method === 'POST' && req.url === '/api/chat') {
      await handleChat(req, res)
      return
    }
    if (req.method === 'POST' && req.url === '/api/analyze') {
      await handleAnalyze(req, res)
      return
    }
    if (req.method === 'GET' && req.url === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        model: env.MOODFLOW_MODEL || 'moonshot-v1-auto',
        configured: Boolean(env.MOODFLOW_API_KEY),
      })
      return
    }
    sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Server error' })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`[MoodFlow API] http://127.0.0.1:${port}`)
})
