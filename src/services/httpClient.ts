import axios from 'axios'

export const httpClient = axios.create({
  baseURL: '/api',
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
})

httpClient.interceptors.request.use((config) => {
  let token = ''
  try {
    const raw = localStorage.getItem('moodflow_auth')
    token = raw ? (JSON.parse(raw)?.token as string) : ''
  } catch {
    token = ''
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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
