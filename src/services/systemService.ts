import type { HealthResult } from '@/types'
import { httpClient } from '@/services/httpClient'

export function getSystemHealth(): Promise<HealthResult> {
  return httpClient.get('/health') as Promise<HealthResult>
}
