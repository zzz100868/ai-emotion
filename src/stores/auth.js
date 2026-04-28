import { defineStore } from 'pinia'
import { readJson, writeJson } from '@/adapters/localStorageAdapter'
import { loginWithPassword } from '@/services/authService'

// localStorage 中保存登录状态的键名
const STORAGE_KEY = 'moodflow_auth'

// 默认用户信息，当 localStorage 中没有数据或解析失败时作为兜底
const defaultUser = {
  name: '郑绍君',
  role: 'admin',
}

/**
 * 从 localStorage 读取认证信息
 * 返回结构：{ user: Object, token: String, isLoggedIn: Boolean }
 * 若读取失败则返回默认值（未登录状态）
 */
function readAuth() {
  return readJson(STORAGE_KEY, { user: defaultUser, token: '', isLoggedIn: false })
}

/**
 * 认证状态 Store（Pinia）
 *
 * state 包含三个属性：
 * - user: 当前用户信息对象，格式 { id, name, role, group? }
 * - token: 登录成功后后端返回的凭证字符串
 * - isLoggedIn: 布尔值，标记当前是否已登录
 */
export const useAuthStore = defineStore('auth', {
  state: () => readAuth(),

  actions: {
    /**
     * 登录方法：
     * 1. 调用 authService.loginWithPassword 向后端发送账号密码
     * 2. 后端验证成功后返回 { token, user }
     * 3. 将数据写入当前 Store 状态，并持久化到 localStorage
     */
    async login(credentials) {
      const data = await loginWithPassword(credentials)
      this.user = data.user
      this.token = data.token
      this.isLoggedIn = true
      this.persist()
    },

    /**
     * 注销方法：
     * 将 isLoggedIn 设为 false，token 清空，并更新 localStorage
     * 注意：这里不会删除 localStorage 中的记录，只是标记为未登录
     */
    logout() {
      this.isLoggedIn = false
      this.token = ''
      this.persist()
    },

    /**
     * 持久化：将当前 state 中的 user/token/isLoggedIn 同步写入 localStorage
     * 这样页面刷新后登录状态不会丢失
     */
    persist() {
      writeJson(STORAGE_KEY, {
        user: this.user,
        token: this.token,
        isLoggedIn: this.isLoggedIn,
      })
    },
  },
})
