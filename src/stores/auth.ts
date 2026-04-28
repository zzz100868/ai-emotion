import { defineStore } from 'pinia'
import type { AuthState, LoginCredentials } from '@/types'
import { readJson, writeJson } from '@/adapters/localStorageAdapter'
import { loginWithPassword } from '@/services/authService'

const STORAGE_KEY = 'moodflow_auth'

const defaultState: AuthState = {
  user: { name: '郑绍君', role: 'admin' },
  token: '',
  isLoggedIn: false,
}

function readAuth(): AuthState {
  return readJson<AuthState>(STORAGE_KEY, defaultState)
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => readAuth(),

  actions: {
    async login(credentials: LoginCredentials) {
      const data = await loginWithPassword(credentials)
      this.user = data.user
      this.token = data.token
      this.isLoggedIn = true
      this.persist()
    },

    logout() {
      this.isLoggedIn = false
      this.token = ''
      this.persist()
    },

    persist() {
      writeJson(STORAGE_KEY, {
        user: this.user,
        token: this.token,
        isLoggedIn: this.isLoggedIn,
      })
    },
  },
})
