import { defineStore } from 'pinia'
import type { AiMode, AppSettings, ReplySpeed } from '@/types'
import { readJson, writeJson } from '@/adapters/localStorageAdapter'

const STORAGE_KEY = 'moodflow_settings'

const defaultSettings: AppSettings = {
  aiMode: 'auto',
  replySpeed: 'normal',
  theme: 'warm',
}

const speedDelayMap: Record<ReplySpeed, number> = {
  slow: 58,
  normal: 38,
  fast: 18,
}

export const useSettingsStore = defineStore('settings', {
  state: (): AppSettings => readJson<AppSettings>(STORAGE_KEY, defaultSettings),

  getters: {
    useLocalOnly(state): boolean {
      return state.aiMode === 'local'
    },
    streamDelay(state): number {
      return speedDelayMap[state.replySpeed]
    },
  },

  actions: {
    updateSetting(key: keyof AppSettings, value: AiMode | ReplySpeed | string) {
      (this as Record<string, unknown>)[key] = value
      this.persist()
    },

    persist() {
      writeJson(STORAGE_KEY, {
        aiMode: this.aiMode,
        replySpeed: this.replySpeed,
        theme: this.theme,
      })
    },

    reset() {
      Object.assign(this, defaultSettings)
      this.persist()
    },
  },
})
