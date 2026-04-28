import axios from 'axios'

// 基于 axios 的 HTTP 客户端，所有业务请求都通过它发出
export const httpClient = axios.create({
  baseURL: '/api',
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：自动从 localStorage 读取 token 并附加到请求头
httpClient.interceptors.request.use((config) => {
  let token = ''
  try {
    const raw = localStorage.getItem('moodflow_auth')
    token = raw ? JSON.parse(raw)?.token : ''
  } catch {
    token = ''
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一提取 response.data；若 401 则触发全局未授权事件，由 AppShell 处理登出
httpClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || '请求失败'
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('moodflow:unauthorized'))
    }
    return Promise.reject(new Error(message))
  },
)
