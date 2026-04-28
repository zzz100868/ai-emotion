import { describe, expect, it, beforeEach, vi } from 'vitest'
import { readJson, removeItem, writeJson } from './localStorageAdapter'

describe('localStorageAdapter', () => {
  beforeEach(() => {
    const store = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (key) => store.get(key) || null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    })
  })

  it('reads fallback when the key is empty or invalid', () => {
    expect(readJson('missing', { ok: true })).toEqual({ ok: true })

    localStorage.setItem('broken', '{')
    expect(readJson('broken', ['fallback'])).toEqual(['fallback'])
  })

  it('writes and removes JSON values', () => {
    writeJson('settings', { aiMode: 'local' })
    expect(readJson('settings', {})).toEqual({ aiMode: 'local' })

    removeItem('settings')
    expect(readJson('settings', null)).toBeNull()
  })
})
