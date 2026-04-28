import { defineStore } from 'pinia'
import { readJson, writeJson } from '@/adapters/localStorageAdapter'
import { analyzeEmotionReport, streamAssistantReply } from '@/services/aiService'
import { useAuthStore } from '@/stores/auth'
import { createId, todayOffset } from '@/utils'

// localStorage 中保存所有会话数据的键名
const STORAGE_KEY = 'moodflow_sessions'

// 新建会话时使用的默认元信息模板
const defaultCaseMeta = {
  ownerId: 'u_demo',
  ownerName: '匿名用户',
  ownerGroup: '个人来访',
  channel: '用户端',
  adminStatus: 'pending',
  adminNote: '',
  assignee: '管理员',
}

// 演示用的虚拟用户列表（用于生成示例数据和管理端展示）
const demoOwners = [
  { ownerId: 'u_chen', ownerName: '陈然', ownerGroup: '求职支持' },
  { ownerId: 'u_lin', ownerName: '林溪', ownerGroup: '学习规划' },
  { ownerId: 'u_zhou', ownerName: '周宁', ownerGroup: '重点观察' },
]

// 用 Set 结构存储需要管理员关注的用户 ID，便于快速判断权限
const managedOwnerIds = new Set(demoOwners.map((owner) => owner.ownerId))

// 内置的 4 条示例会话数据，首次使用或重置数据时会恢复为这些样本
const seedSessions = [
  {
    id: createId('session'),
    title: '找实习压力复盘',
    private: false,
    ownerId: 'u_chen',
    ownerName: '陈然',
    ownerGroup: '求职支持',
    channel: '用户端',
    adminStatus: 'following',
    adminNote: '已建议先整理项目亮点，下一次关注投递反馈后的情绪变化。',
    assignee: '管理员',
    createdAt: todayOffset(-5),
    updatedAt: todayOffset(-5),
    messages: [
      { id: createId('msg'), role: 'user', content: '最近投简历没有回复，我担心自己的项目不够。', createdAt: todayOffset(-5), status: 'done' },
      { id: createId('msg'), role: 'assistant', content: '你的压力更多来自不确定性。可以先把项目亮点拆成技术点、业务点和结果点，再逐步优化投递节奏。', createdAt: todayOffset(-5), status: 'done' },
    ],
    report: {
      label: '焦虑',
      score: 74,
      riskLevel: 'medium',
      keywords: ['实习', '简历', '项目', '压力'],
      summary: '用户主要表达了求职反馈不足带来的焦虑和自我怀疑。',
      suggestion: '先完成一份项目亮点清单，再用小批量投递验证简历方向。',
    },
  },
  {
    id: createId('session'),
    title: '学习节奏调整',
    private: false,
    ownerId: 'u_lin',
    ownerName: '林溪',
    ownerGroup: '学习规划',
    channel: '用户端',
    adminStatus: 'closed',
    adminNote: '状态稳定，保留观察即可。',
    assignee: '管理员',
    createdAt: todayOffset(-2),
    updatedAt: todayOffset(-2),
    messages: [
      { id: createId('msg'), role: 'user', content: '最近学 Vue 和项目有点乱，不知道先补哪个。', createdAt: todayOffset(-2), status: 'done' },
      { id: createId('msg'), role: 'assistant', content: '可以把学习目标和项目目标合并：每次只补一个会马上用到的知识点。', createdAt: todayOffset(-2), status: 'done' },
    ],
    report: {
      label: '平静',
      score: 58,
      riskLevel: 'low',
      keywords: ['Vue', '项目', '学习节奏'],
      summary: '用户状态可控，主要困扰是任务优先级不清。',
      suggestion: '使用三天一个小迭代的方式推进项目，不要同时开太多支线。',
    },
  },
  {
    id: createId('session'),
    title: '连续失眠和低落',
    private: false,
    ownerId: 'u_zhou',
    ownerName: '周宁',
    ownerGroup: '重点观察',
    channel: '用户端',
    adminStatus: 'pending',
    adminNote: '',
    assignee: '管理员',
    createdAt: todayOffset(-1),
    updatedAt: todayOffset(-1),
    messages: [
      { id: createId('msg'), role: 'user', content: '这几天睡不好，白天也没什么力气，事情堆着就更烦。', createdAt: todayOffset(-1), status: 'done' },
      { id: createId('msg'), role: 'assistant', content: '你现在像是在疲惫和压力里循环。先把今晚目标降到一个很小的动作，例如洗漱后不再继续刷任务，把身体恢复放在第一位。', createdAt: todayOffset(-1), status: 'done' },
    ],
    report: {
      label: '低落',
      score: 86,
      riskLevel: 'high',
      keywords: ['失眠', '低落', '疲惫', '压力'],
      summary: '用户出现连续失眠、精力下降和压力堆积的描述，需要优先跟进。',
      suggestion: '建议管理员标记为待跟进，并提醒用户优先寻求现实支持或专业帮助。',
    },
  },
  {
    id: createId('session'),
    title: '人际沟通后的烦躁',
    private: false,
    ownerId: 'u_chen',
    ownerName: '陈然',
    ownerGroup: '日常陪伴',
    channel: '用户端',
    adminStatus: 'pending',
    adminNote: '',
    assignee: '管理员',
    createdAt: todayOffset(-8),
    updatedAt: todayOffset(-8),
    messages: [
      { id: createId('msg'), role: 'user', content: '和朋友聊完反而更烦，感觉我说什么都被误解。', createdAt: todayOffset(-8), status: 'done' },
      { id: createId('msg'), role: 'assistant', content: '被误解会让人很耗神。可以先把“我想表达什么”和“我希望对方怎么回应”分开写下来，避免情绪继续扩散。', createdAt: todayOffset(-8), status: 'done' },
    ],
    report: {
      label: '愤怒',
      score: 67,
      riskLevel: 'low',
      keywords: ['朋友', '误解', '烦躁'],
      summary: '用户主要表达了沟通受挫后的烦躁，风险较低。',
      suggestion: '引导用户复盘具体沟通场景，先稳定情绪再决定是否继续沟通。',
    },
  },
]

// 深拷贝示例数据，避免直接修改原始常量
function cloneSeedSessions() {
  return JSON.parse(JSON.stringify(seedSessions))
}

// 从 localStorage 读取会话列表，首次访问时用示例数据初始化并回写
function readSessions() {
  const sessions = readJson(STORAGE_KEY, cloneSeedSessions()).map(normalizeSession)
  writeJson(STORAGE_KEY, sessions)
  return sessions
}

/**
 * 规范化会话数据：补全缺失的 owner 信息和元字段
 * 同时处理旧数据格式的兼容（如 u_local_xxx 或「用户 N」这类遗留 ID）
 */
function normalizeSession(session, index = 0) {
  const owner = demoOwners[index % demoOwners.length]
  const hasLegacyOwner = /^u_local_\d+$/.test(session.ownerId || '') || /^用户\s*\d+$/.test(session.ownerName || '')
  const normalizedOwner = hasLegacyOwner ? owner : {
    ownerId: session.ownerId || owner.ownerId,
    ownerName: session.ownerName || owner.ownerName,
    ownerGroup: session.ownerGroup || owner.ownerGroup,
  }
  return {
    ...defaultCaseMeta,
    ...normalizedOwner,
    channel: '用户端',
    adminStatus: 'pending',
    ...session,
    ...normalizedOwner,
    private: Boolean(session.private),
  }
}

// 获取当前登录用户的信息（从 auth Store 跨 Store 读取）
function currentUser() {
  const auth = useAuthStore()
  return auth.user || {}
}

// 判断当前用户是否有权限查看某条会话
// admin 只能看 managedOwnerIds 里的用户，普通用户只能看自己的
function canSeeSession(session, user = currentUser()) {
  if (user.role === 'admin') return managedOwnerIds.has(session.ownerId)
  return session.ownerId === user.id
}

// 将英文状态码翻译为中文显示文本
function statusText(status) {
  return {
    pending: '待跟进',
    following: '跟进中',
    closed: '已关闭',
  }[status] || '待跟进'
}

/**
 * 核心 Store：管理所有情绪对话会话、AI 流式回复、筛选条件和统计数据
 *
 * state 说明：
 * - sessions: 所有会话数组，每条会话包含 messages（消息列表）和 report（情绪报告）
 * - activeSessionId: 当前在界面上选中的会话 ID
 * - streamingMap: 以会话 ID 为键的对象，值为 true 表示该会话正在接收 AI 流式回复
 * - analyzingMap: 以会话 ID 为键的对象，值为 true 表示该会话正在生成情绪报告
 * - streamControllers: 以会话 ID 为键，保存 AbortController 实例，用于中断流式请求
 * - filters: 管理端看板的筛选条件（关键词、风险等级、情绪标签、时间范围、处理状态）
 */
export const useMoodStore = defineStore('mood', {
  state: () => ({
    sessions: readSessions(),
    activeSessionId: null,
    streamingMap: {},
    analyzingMap: {},
    streamControllers: {},
    filters: {
      query: '',
      risk: 'all',
      label: 'all',
      range: 'all',
      status: 'all',
    },
  }),
  getters: {
    // 当前激活的会话对象。如果没有匹配的，返回第一个可见会话作为兜底
    activeSession(state) {
      const sessions = state.sessions.filter((session) => canSeeSession(session))
      return sessions.find((session) => session.id === state.activeSessionId) || sessions[0]
    },
    // 当前用户有权限查看的全部会话数组（不排序）
    visibleSessions(state) {
      return state.sessions.filter((session) => canSeeSession(session))
    },
    // 按更新时间倒序排列的可见会话（最新的排在最前面）
    orderedSessions(state) {
      return state.sessions.filter((session) => canSeeSession(session)).sort((a, b) => b.updatedAt - a.updatedAt)
    },
    // 当前激活会话是否正在流式输出中（用于 UI 显示"停止"按钮或加载状态）
    isStreaming(state) {
      return Boolean(state.activeSessionId && state.streamingMap[state.activeSessionId])
    },
    /**
     * 经过多维度筛选后的会话列表：
     * 1. 权限过滤（只看自己/管理员看指定用户）
     * 2. 关键词搜索（匹配用户名、分组、标题、关键词、摘要、备注）
     * 3. 情绪标签筛选
     * 4. 风险等级筛选
     * 5. 时间范围筛选（7天/30天）
     * 6. 处理状态筛选
     * 最后按更新时间倒序排列
     */
    filteredSessions(state) {
      const now = Date.now()
      const ranges = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      }
      const user = currentUser()
      return [...state.sessions]
        .filter((session) => canSeeSession(session, user))
        .filter((session) => {
          const text = `${session.ownerName} ${session.ownerGroup} ${session.title} ${session.report?.keywords?.join(' ') || ''} ${session.report?.summary || ''} ${session.adminNote || ''}`
          const matchQuery = !state.filters.query || text.toLowerCase().includes(state.filters.query.toLowerCase())
          const matchRisk = state.filters.risk === 'all' || session.report?.riskLevel === state.filters.risk
          const matchLabel = state.filters.label === 'all' || session.report?.label === state.filters.label
          const matchRange = state.filters.range === 'all' || now - session.updatedAt <= ranges[state.filters.range]
          const matchStatus = state.filters.status === 'all' || session.adminStatus === state.filters.status
          return matchQuery && matchRisk && matchLabel && matchRange && matchStatus
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
    },
    // 从全部可见会话中提取所有已生成的报告，平铺为数组
    reports(state) {
      return state.sessions.filter((item) => item.report && canSeeSession(item)).map((item) => ({
        sessionId: item.id,
        title: item.title,
        private: Boolean(item.private),
        updatedAt: item.updatedAt,
        ...item.report,
      }))
    },
    // 在筛选结果基础上提取报告（用于看板图表和报表展示）
    filteredReports() {
      return this.filteredSessions.filter((item) => item.report).map((item) => ({
        sessionId: item.id,
        title: item.title,
        private: Boolean(item.private),
        updatedAt: item.updatedAt,
        ...item.report,
      }))
    },
    // 基于 filteredReports 的统计数字：会话总数、报告数、平均情绪强度、中高风险数量
    stats() {
      const reports = this.filteredReports
      const average = Math.round(reports.reduce((sum, item) => sum + item.score, 0) / Math.max(reports.length, 1))
      return {
        sessions: this.filteredSessions.length,
        reports: reports.length,
        average,
        mediumRisk: reports.filter((item) => item.riskLevel === 'medium').length,
        highRisk: reports.filter((item) => item.riskLevel === 'high').length,
      }
    },
    // 管理端专用统计：当前筛选下的用户数、待跟进数、跟进中数、高中风险数
    adminStats() {
      const sessions = this.filteredSessions
      const userIds = new Set(sessions.map((item) => item.ownerId))
      const reports = sessions.filter((item) => item.report)
      return {
        users: userIds.size,
        pending: sessions.filter((item) => item.adminStatus === 'pending').length,
        following: sessions.filter((item) => item.adminStatus === 'following').length,
        highRisk: reports.filter((item) => item.report.riskLevel === 'high').length,
        mediumRisk: reports.filter((item) => item.report.riskLevel === 'medium').length,
      }
    },
    /**
     * 风险队列：按风险权重排序的待处理会话列表
     * 排序规则：高风险(3) > 中风险(2) > 低风险(1)，同等级按更新时间倒序
     * 用于管理端优先展示需要关注的个案
     */
    riskQueue() {
      const weight = { high: 3, medium: 2, low: 1 }
      return this.filteredSessions
        .filter((item) => item.report && item.adminStatus !== 'closed')
        .sort((a, b) => {
          const riskDiff = (weight[b.report.riskLevel] || 0) - (weight[a.report.riskLevel] || 0)
          return riskDiff || b.updatedAt - a.updatedAt
        })
    },
    /**
     * 用户个案聚合：将筛选后的会话按 ownerId 分组
     * 每组统计：会话列表、最近更新时间、最高风险权重、待跟进数、跟进中数、风险数
     * 最后按风险权重和最近时间倒序排列
     */
    userCases() {
      const weight = { high: 3, medium: 2, low: 1 }
      const map = new Map()
      this.filteredSessions.forEach((session) => {
        const item = map.get(session.ownerId) || {
          ownerId: session.ownerId,
          ownerName: session.ownerName,
          ownerGroup: session.ownerGroup,
          channel: session.channel,
          sessions: [],
          latestAt: 0,
          riskWeight: 0,
          pending: 0,
          following: 0,
          highRisk: 0,
          mediumRisk: 0,
        }
        item.sessions.push(session)
        item.latestAt = Math.max(item.latestAt, session.updatedAt)
        item.riskWeight = Math.max(item.riskWeight, weight[session.report?.riskLevel] || 0)
        if (session.adminStatus === 'pending') item.pending += 1
        if (session.adminStatus === 'following') item.following += 1
        if (session.report?.riskLevel === 'high') item.highRisk += 1
        if (session.report?.riskLevel === 'medium') item.mediumRisk += 1
        map.set(session.ownerId, item)
      })
      return [...map.values()]
        .map((item) => ({
          ...item,
          sessions: item.sessions.sort((a, b) => b.updatedAt - a.updatedAt),
          latestSession: item.sessions.sort((a, b) => b.updatedAt - a.updatedAt)[0],
        }))
        .sort((a, b) => b.riskWeight - a.riskWeight || b.latestAt - a.latestAt)
    },
  },
  actions: {
    // 初始化：若没有任何选中的会话，默认选中第一个可见会话
    init() {
      if (!this.activeSessionId && this.visibleSessions[0]) {
        this.activeSessionId = this.visibleSessions[0].id
      }
    },
    // 将当前所有会话数据持久化到 localStorage
    persist() {
      writeJson(STORAGE_KEY, this.sessions)
    },
    // 更新筛选条件：传入的对象会与现有条件合并（而不是覆盖全部）
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    },
    // 重置所有筛选条件为默认值
    resetFilters() {
      this.filters = {
        query: '',
        risk: 'all',
        label: 'all',
        range: 'all',
        status: 'all',
      }
    },
    /**
     * 创建一条新会话：
     * - 普通用户：owner 设为当前登录用户
     * - 管理员：默认使用 demoOwners 第一个用户作为占位
     * 创建后自动插入 sessions 数组头部，并设为当前激活会话
     */
    createSession() {
      const user = currentUser()
      const owner = user.role === 'admin' ? demoOwners[0] : {
        ownerId: user.id || 'u_current',
        ownerName: user.name || '当前用户',
        ownerGroup: user.group || '个人来访',
      }
      const session = {
        id: createId('session'),
        title: '新的情绪对话',
        private: false,
        ...defaultCaseMeta,
        ...owner,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        report: null,
      }
      this.sessions.unshift(session)
      this.activeSessionId = session.id
      this.persist()
    },
    // 切换当前激活的会话
    selectSession(id) {
      this.activeSessionId = id
    },
    // 删除指定会话：至少保留一条可见会话，防止删空
    deleteSession(id) {
      if (this.visibleSessions.length <= 1) return
      this.sessions = this.sessions.filter((item) => item.id !== id)
      if (this.activeSessionId === id) {
        this.activeSessionId = this.visibleSessions[0]?.id || null
      }
      this.persist()
    },
    // 重命名会话标题，并更新修改时间
    renameSession(id, title) {
      const session = this.sessions.find((item) => item.id === id)
      if (!session) return
      session.title = title || '未命名会话'
      session.updatedAt = Date.now()
      this.persist()
    },
    // 设置会话的隐私标记（private=true 时标题会被脱敏显示）
    setSessionPrivate(id, value) {
      const session = this.sessions.find((item) => item.id === id)
      if (!session) return
      session.private = Boolean(value)
      this.persist()
    },
    // 更新会话的处理状态（pending/following/closed）并刷新时间戳
    setSessionStatus(id, status) {
      const session = this.sessions.find((item) => item.id === id)
      if (!session) return
      session.adminStatus = status
      session.updatedAt = Date.now()
      this.persist()
    },
    // 更新管理员对该会话的备注文字
    updateAdminNote(id, note) {
      const session = this.sessions.find((item) => item.id === id)
      if (!session) return
      session.adminNote = note
      this.persist()
    },
    /**
     * 启动 AI 流式回复：这是整个对话最核心的逻辑
     * 执行流程：
     * 1. 在当前会话的 messages 末尾插入一条 status='streaming' 的 assistant 占位消息
     * 2. 调用 streamAssistantReply 开始接收逐字返回的 token
     * 3. 每收到一个 token，更新该消息的 content（Vue 的响应式会自动触发 UI 重绘）
     * 4. 流结束后，将消息状态改为 'done'，并调用 analyzeEmotionReport 生成结构化情绪报告
     * 5. 如果出错，将消息状态改为 'error' 并显示友好提示
     */
    startAssistantStream(session, text) {
      if (!session || this.streamingMap[session.id]) return
      const sessionId = session.id
      const assistantMessage = {
        id: createId('msg'),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: 'streaming',
      }
      session.messages.push(assistantMessage)
      session.updatedAt = Date.now()
      session.report = null
      this.streamingMap[sessionId] = true
      this.persist()

      this.streamControllers[sessionId] = streamAssistantReply({
        userText: text,
        // 过滤掉刚插入的占位消息，只把历史消息传给 AI
        history: session.messages.filter((message) => message.id !== assistantMessage.id),
        // 每收到一个字就更新消息内容
        onToken: (token) => {
          const target = this.sessions.find((item) => item.id === sessionId)
          if (!target || !this.streamingMap[sessionId]) return
          const messageIndex = target.messages.findIndex((message) => message.id === assistantMessage.id)
          if (messageIndex !== -1) {
            const targetMessage = target.messages[messageIndex]
            target.messages.splice(messageIndex, 1, {
              ...targetMessage,
              content: targetMessage.content + token,
            })
          }
        },
        // 流正常结束：标记消息完成，生成情绪报告，清理状态
        onDone: async () => {
          const target = this.sessions.find((item) => item.id === sessionId)
          if (!target) return
          const messageIndex = target.messages.findIndex((message) => message.id === assistantMessage.id)
          if (messageIndex !== -1) {
            target.messages.splice(messageIndex, 1, {
              ...target.messages[messageIndex],
              status: 'done',
            })
          }
          this.analyzingMap[sessionId] = true
          target.report = await analyzeEmotionReport({ userText: text, messages: target.messages })
          target.updatedAt = Date.now()
          delete this.streamingMap[sessionId]
          delete this.analyzingMap[sessionId]
          delete this.streamControllers[sessionId]
          this.persist()
        },
        // 流异常中断：标记消息为 error 并给出兜底文案
        onError: () => {
          if (!this.streamingMap[sessionId]) return
          const target = this.sessions.find((item) => item.id === sessionId)
          if (!target) return
          const messageIndex = target.messages.findIndex((message) => message.id === assistantMessage.id)
          if (messageIndex !== -1) {
            target.messages.splice(messageIndex, 1, {
              ...target.messages[messageIndex],
              status: 'error',
              content: '这次回复被中断了。你可以重新生成，或换一种方式描述当前状态。',
            })
          }
          delete this.streamingMap[sessionId]
          delete this.analyzingMap[sessionId]
          delete this.streamControllers[sessionId]
          this.persist()
        },
      })
    },
    /**
     * 将正在流式输出的消息标记为已停止
     * 从 messages 数组末尾往前找，定位到最近一条 status='streaming' 的 assistant 消息
     * 将其状态改为 'stopped'，并清理 streamingMap / analyzingMap / streamControllers
     */
    markStreamStopped(sessionId = this.activeSessionId) {
      const target = this.sessions.find((item) => item.id === sessionId)
      if (!target) return
      const messageIndex = [...target.messages].reverse().findIndex((message) => (
        message.role === 'assistant' && message.status === 'streaming'
      ))
      if (messageIndex === -1) return
      const actualIndex = target.messages.length - 1 - messageIndex
      target.messages.splice(actualIndex, 1, {
        ...target.messages[actualIndex],
        status: 'stopped',
        content: target.messages[actualIndex].content || '已停止生成。',
      })
      delete this.streamingMap[sessionId]
      delete this.analyzingMap[sessionId]
      delete this.streamControllers[sessionId]
      this.persist()
    },
    /**
     * 发送用户消息：
     * 1. 检查内容非空
     * 2. 若当前没有激活会话，自动创建一条新会话
     * 3. 若该会话已有 AI 在回复中，则拒绝发送（避免并发）
     * 4. 若是该会话的第一条消息，自动用内容前 16 个字作为标题
     * 5. 将用户消息 push 到 messages 数组，然后启动 AI 流式回复
     */
    async sendMessage(content) {
      const text = content.trim()
      if (!text) return
      let session = this.activeSession
      if (!session) {
        this.createSession()
        session = this.activeSession
      }
      if (this.streamingMap[session.id]) return
      if (session.messages.length === 0) {
        session.title = text.slice(0, 16)
      }

      session.messages.push({
        id: createId('msg'),
        role: 'user',
        content: text,
        createdAt: Date.now(),
        status: 'done',
      })
      this.startAssistantStream(session, text)
    },
    // 中断当前会话的 AI 流式回复：先调用 abort() 终止网络请求，再标记消息状态
    stopStreaming(sessionId = this.activeSessionId) {
      if (this.streamControllers[sessionId]) {
        this.streamControllers[sessionId].abort()
      }
      this.markStreamStopped(sessionId)
    },
    /**
     * 重新生成 AI 回复：
     * 1. 找到该会话最后一条用户消息
     * 2. 删除该消息之后的所有 assistant 回复（包括 error 状态的）
     * 3. 基于这条用户消息重新调用 startAssistantStream
     */
    regenerate() {
      const session = this.activeSession
      if (!session || this.streamingMap[session.id]) return
      const lastUser = [...session.messages].reverse().find((item) => item.role === 'user')
      if (!lastUser) return
      const lastUserIndex = session.messages.findLastIndex((item) => item.id === lastUser.id)
      session.messages = session.messages
        .slice(0, lastUserIndex + 1)
        .filter((item) => item.status !== 'error')
      this.startAssistantStream(session, lastUser.content)
    },
    // 重置所有数据：恢复为内置示例会话，清空所有流式状态和筛选条件
    clearAll() {
      this.sessions = cloneSeedSessions().map(normalizeSession)
      this.activeSessionId = this.visibleSessions[0]?.id || null
      this.streamingMap = {}
      this.analyzingMap = {}
      this.streamControllers = {}
      this.resetFilters()
      this.persist()
    },
  },
})

export { statusText }
