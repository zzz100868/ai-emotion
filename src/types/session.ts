export type EmotionLabel = '焦虑' | '低落' | '平静' | '积极' | '愤怒'
export type RiskLevel = 'low' | 'medium' | 'high'
export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'done' | 'streaming' | 'error' | 'stopped'
export type AdminStatus = 'pending' | 'following' | 'closed'

export interface EmotionReport {
  label: EmotionLabel
  score: number
  riskLevel: RiskLevel
  keywords: string[]
  summary: string
  suggestion: string
  source?: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: number
  status: MessageStatus
}

export interface Session {
  id: string
  title: string
  private: boolean
  ownerId: string
  ownerName: string
  ownerGroup: string
  channel: string
  adminStatus: AdminStatus
  adminNote: string
  assignee: string
  createdAt: number
  updatedAt: number
  messages: Message[]
  report: EmotionReport | null
}

export interface MoodFilters {
  query: string
  risk: RiskLevel | 'all'
  label: EmotionLabel | 'all'
  range: '7d' | '30d' | 'all'
  status: AdminStatus | 'all'
}

export interface FilteredReport extends EmotionReport {
  sessionId: string
  title: string
  private: boolean
  updatedAt: number
}

export interface UserCase {
  ownerId: string
  ownerName: string
  ownerGroup: string
  channel: string
  sessions: Session[]
  latestAt: number
  riskWeight: number
  pending: number
  following: number
  highRisk: number
  mediumRisk: number
  latestSession?: Session
}
