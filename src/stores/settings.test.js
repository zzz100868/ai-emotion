import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from './settings'

function stubStorage() {
  const store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  })
}

describe('settings store', () => {
  beforeEach(() => {
    stubStorage()
    setActivePinia(createPinia())
  })

  it('persists user-facing chat settings', () => {
    const settings = useSettingsStore()

    settings.updateSetting('aiMode', 'local')
    settings.updateSetting('replySpeed', 'fast')

    expect(settings.useLocalOnly).toBe(true)
    expect(settings.streamDelay).toBe(18)
    expect(JSON.parse(localStorage.getItem('moodflow_settings'))).toMatchObject({
      aiMode: 'local',
      replySpeed: 'fast',
    })
  })
})
