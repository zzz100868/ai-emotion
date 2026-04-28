import { defineStore } from 'pinia'
import type { AdminStatus, EmotionReport, FilteredReport, Message, MoodFilters, Session, UserCase } from '@/types'
import { readJson, writeJson } from '@/adapters/localStorageAdapter'
import { analyzeEmotionReport, streamAssistantReply } from '@/services/aiService'
import { useAuthStore } from '@/stores/auth'
import { createId, todayOffset } from '@/utils'

const STORAGE_KEY = 'moodflow_sessions'

interface StreamController {
  abort: () => void
}

interface MoodState {
  sessions: Session[]
  activeSessionId: string | null
  streamingMap: Record<string, boolean>
  analyzingMap: Record<string, boolean>
  streamControllers: Record<string, StreamController>
  filters: MoodFilters
}

const defaultCaseMeta = {
  ownerId: 'u_demo',
  ownerName: '匿名用户',
  ownerGroup: '个人来访',
  channel: '用户端',
  adminStatus: 'pending' as AdminStatus,
  adminNote: '',
  assignee: '管理员',
}

const demoOwners = [
  { ownerId: 'u_chen', ownerName: '陈然', ownerGroup: '求职支持' },
  { ownerId: 'u_lin', ownerName: '林溪', ownerGroup: '学习规划' },
  { ownerId: 'u_zhou', ownerName: '周宁', ownerGroup: '重点观察' },
]

const managedOwnerIds = new Set(demoOwners.map((owner) => owner.ownerId))

const seedSessions: Session[] = [
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
      { id: createId('msg'), role: 'assistant', content: '被误解会让人很耗神。可以先把"我想表达什么"和"我希望对方怎么回应"分开写下来，避免情绪继续扩散。', createdAt: todayOffset(-8), status: 'done' },
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

function cloneSeedSessions(): Session[] {
  return JSON.parse(JSON.stringify(seedSessions)) as Session[]
}

function normalizeSession(session: Partial<Session>, index = 0): Session {
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
    adminStatus: 'pending' as AdminStatus,
    ...(session as Session),
    ...normalizedOwner,
    private: Boolean(session.private),
  } as Session
}

function readSessions(): Session[] {
  const sessions = readJson<Session[]>(STORAGE_KEY, cloneSeedSessions()).map(normalizeSession)
  writeJson(STORAGE_KEY, sessions)
  return sessions
}

function currentUser() {
  const auth = useAuthStore()
  return auth.user || { name: '', role: 'user' as const }
}

function canSeeSession(session: Session, user = currentUser()): boolean {
  if (user.role === 'admin') return managedOwnerIds.has(session.ownerId)
  return session.ownerId === user.id
}

export function statusText(status: AdminStatus): string {
  return ({
    pending: '待跟进',
    following: '跟进中',
    closed: '已关闭',
  } as const)[status] || '待跟进'
}

export const useMoodStore = defineStore('mood', {
  state: (): MoodState => ({
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
    activeSession(state): Session | undefined {
      const sessions = state.sessions.filter((session) => canSeeSession(session))
      return sessions.find((session) => session.id === state.activeSessionId) || sessions[0]
    },

    visibleSessions(state): Session[] {
      return state.sessions.filter((session) => canSeeSession(session))
    },

    orderedSessions(state): Session[] {
      return state.sessions.filter((session) => canSeeSession(session)).sort((a, b) => b.updatedAt - a.updatedAt)
    },

    isStreaming(state): boolean {
      return Boolean(state.activeSessionId && state.streamingMap[state.activeSessionId])
    },

    filteredSessions(state): Session[] {
      const now = Date.now()
      const ranges: Record<string, number> = {
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

    reports(state): FilteredReport[] {
      return state.sessions.filter((item) => item.report && canSeeSession(item)).map((item) => ({
        sessionId: item.id,
        title: item.title,
        private: Boolean(item.private),
        updatedAt: item.updatedAt,
        ...item.report!,
      }))
    },

    filteredReports(): FilteredReport[] {
      return this.filteredSessions.filter((item: Session) => item.report).map((item: Session) => ({
        sessionId: item.id,
        title: item.title,
        private: Boolean(item.private),
        updatedAt: item.updatedAt,
        ...item.report!,
      }))
    },

    stats(): { sessions: number; reports: number; average: number; mediumRisk: number; highRisk: number } {
      const reports = this.filteredReports
      const average = Math.round(reports.reduce((sum: number, item: FilteredReport) => sum + item.score, 0) / Math.max(reports.length, 1))
      return {
        sessions: this.filteredSessions.length,
        reports: reports.length,
        average,
        mediumRisk: reports.filter((item: FilteredReport) => item.riskLevel === 'medium').length,
        highRisk: reports.filter((item: FilteredReport) => item.riskLevel === 'high').length,
      }
    },

    adminStats(): { users: number; pending: number; following: number; highRisk: number; mediumRisk: number } {
      const sessions = this.filteredSessions
      const userIds = new Set(sessions.map((item: Session) => item.ownerId))
      const reports = sessions.filter((item: Session) => item.report)
      return {
        users: userIds.size,
        pending: sessions.filter((item: Session) => item.adminStatus === 'pending').length,
        following: sessions.filter((item: Session) => item.adminStatus === 'following').length,
        highRisk: reports.filter((item: Session) => item.report!.riskLevel === 'high').length,
        mediumRisk: reports.filter((item: Session) => item.report!.riskLevel === 'medium').length,
      }
    },

    riskQueue(): Session[] {
      const weight: Record<string, number> = { high: 3, medium: 2, low: 1 }
      return this.filteredSessions
        .filter((item: Session) => item.report && item.adminStatus !== 'closed')
        .sort((a: Session, b: Session) => {
          const riskDiff = (weight[b.report!.riskLevel] || 0) - (weight[a.report!.riskLevel] || 0)
          return riskDiff || b.updatedAt - a.updatedAt
        })
    },

    userCases(): UserCase[] {
      const weight: Record<string, number> = { high: 3, medium: 2, low: 1 }
      const map = new Map<string, UserCase>()
      this.filteredSessions.forEach((session: Session) => {
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
        item.riskWeight = Math.max(item.riskWeight, weight[session.report?.riskLevel || ''] || 0)
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
    init() {
      if (!this.activeSessionId && this.visibleSessions[0]) {
        this.activeSessionId = this.visibleSessions[0].id
      }
    },

    persist() {
      writeJson(STORAGE_KEY, this.sessions)
    },

    setFilters(filters: Partial<MoodFilters>) {
      this.filters = { ...this.filters, ...filters }
    },

    resetFilters() {
      this.filters = { query: '', risk: 'all', label: 'all', range: 'all', status: 'all' }
    },

    createSession() {
      const user = currentUser()
      const owner = user.role === 'admin' ? demoOwners[0] : {
        ownerId: user.id || 'u_current',
        ownerName: user.name || '当前用户',
        ownerGroup: user.group || '个人来访',
      }
      const session: Session = {
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

    selectSession(id: string) {
      this.activeSessionId = id
    },

    deleteSession(id: string) {
      if (this.visibleSessions.length <= 1) return
      this.sessions = this.sessions.filter((item) => item.id !== id)
      if (this.activeSessionId === id) {
        this.activeSessionId = this.visibleSessions[0]?.id || null
      }
      this.persist()
    },

    renameSession(id: string, title: string) {
      const session = this.sessions.find((item) => item.id === id)
      if (!session) return
      session.title = title || '未命名会话'
      session.updatedAt = Date.now()
      this.persist()
    },

    setSessionPrivate(id: string, value: boolean) {
      const session = this.sessions.find((item) => item.id === id)
      if (!session) return
      session.private = Boolean(value)
      this.persist()
    },

    setSessionStatus(id: string, status: AdminStatus) {
      const session = this.sessions.find((item) => item.id === id)
      if (!session) return
      session.adminStatus = status
      session.updatedAt = Date.now()
      this.persist()
    },

    updateAdminNote(id: string, note: string) {
      const session = this.sessions.find((item) => item.id === id)
      if (!session) return
      session.adminNote = note
      this.persist()
    },

    startAssistantStream(session: Session, text: string) {
      if (!session || this.streamingMap[session.id]) return
      const sessionId = session.id
      const assistantMessage: Message = {
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
        history: session.messages.filter((message) => message.id !== assistantMessage.id),
        onToken: (token: string) => {
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

    markStreamStopped(sessionId: string = this.activeSessionId!) {
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

    async sendMessage(content: string) {
      const text = content.trim()
      if (!text) return
      let session = this.activeSession
      if (!session) {
        this.createSession()
        session = this.activeSession
      }
      if (!session || this.streamingMap[session.id]) return
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

    stopStreaming(sessionId: string = this.activeSessionId!) {
      if (this.streamControllers[sessionId]) {
        this.streamControllers[sessionId].abort()
      }
      this.markStreamStopped(sessionId)
    },

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
