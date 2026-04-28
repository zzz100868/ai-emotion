import { defineStore } from 'pinia'
import { readJson, writeJson } from '@/adapters/localStorageAdapter'

// localStorage 键名，保存用户的偏好设置
const STORAGE_KEY = 'moodflow_settings'

// 默认设置值
const defaultSettings = {
  aiMode: 'auto',      // AI 模式：auto（优先调用远程 AI）或 local（仅本地模拟）
  replySpeed: 'normal', // 回复速度：slow / normal / fast
  theme: 'warm',       // 主题（当前项目未做多主题切换，保留字段供后续扩展）
}

/**
 * 系统设置 Store（Pinia）
 *
 * state 说明：
 * - aiMode: 控制 AI 回复来源，'local' 时不请求远程接口，适合无网络或演示场景
 * - replySpeed: 控制流式回复的逐字延迟，影响"打字机"效果的快慢
 * - theme: 预留字段，当前未在 UI 中提供切换入口
 *
 * getters 说明：
 * - useLocalOnly: 布尔值，true 表示当前强制使用本地模拟 AI
 * - streamDelay: 数字，返回当前速度档位对应的毫秒延迟（slow=58, normal=38, fast=18）
 */
export const useSettingsStore = defineStore('settings', {
  state: () => readJson(STORAGE_KEY, defaultSettings),
  getters: {
    useLocalOnly(state) {
      return state.aiMode === 'local'
    },
    streamDelay(state) {
      return {
        slow: 58,
        normal: 38,
        fast: 18,
      }[state.replySpeed]
    },
  },
  actions: {
    // 更新单个设置项，并立即持久化到 localStorage
    updateSetting(key, value) {
      this[key] = value
      this.persist()
    },
    persist() {
      writeJson(STORAGE_KEY, {
        aiMode: this.aiMode,
        replySpeed: this.replySpeed,
        theme: this.theme,
      })
    },
    // 恢复默认设置并保存
    reset() {
      Object.assign(this, defaultSettings)
      this.persist()
    },
  },
})
