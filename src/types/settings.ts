export type AiMode = 'auto' | 'local'
export type ReplySpeed = 'slow' | 'normal' | 'fast'

export interface AppSettings {
  aiMode: AiMode
  replySpeed: ReplySpeed
  theme: string
}

export interface HealthResult {
  ok: boolean
  model?: string
  configured: boolean
}
