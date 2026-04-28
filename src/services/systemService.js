import { httpClient } from '@/services/httpClient'

// 系统健康检查：用于设置页检测 AI 服务是否已配置密钥
export function getSystemHealth() {
  return httpClient.get('/health')
}
