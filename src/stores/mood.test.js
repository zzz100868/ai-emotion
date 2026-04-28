import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMoodStore } from './mood'

function stubStorage() {
  const store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  })
}

describe('mood store', () => {
  beforeEach(() => {
    stubStorage()
    setActivePinia(createPinia())
  })

  it('creates, renames, and deletes sessions without deleting the final one', () => {
    const mood = useMoodStore()
    const initialCount = mood.sessions.length

    mood.createSession()
    expect(mood.sessions).toHaveLength(initialCount + 1)

    const createdId = mood.activeSessionId
    mood.renameSession(createdId, '新的复盘标题')
    expect(mood.activeSession.title).toBe('新的复盘标题')

    mood.setSessionPrivate(createdId, true)
    expect(mood.activeSession.private).toBe(true)

    mood.deleteSession(createdId)
    expect(mood.sessions).toHaveLength(initialCount)

    mood.sessions = mood.sessions.slice(0, 1)
    mood.deleteSession(mood.sessions[0].id)
    expect(mood.sessions).toHaveLength(1)
  })

  it('filters sessions by query and risk level', () => {
    const mood = useMoodStore()

    mood.setFilters({ query: '简历', risk: 'medium' })

    expect(mood.filteredSessions.length).toBeGreaterThan(0)
    expect(mood.filteredSessions.every((session) => (
      session.title.includes('简历') ||
      session.report?.summary.includes('简历') ||
      session.report?.keywords.includes('简历')
    ))).toBe(true)
    expect(mood.filteredSessions.every((session) => session.report?.riskLevel === 'medium')).toBe(true)
  })
})
