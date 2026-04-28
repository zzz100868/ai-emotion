import { httpClient } from '@/services/httpClient'

// 登录接口封装：向后端 /api/login 发送账号密码，返回 token 和用户信息
export function loginWithPassword(credentials) {
  return httpClient.post('/login', credentials)
}
