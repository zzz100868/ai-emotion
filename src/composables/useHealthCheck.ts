import { ref } from 'vue'
import type { HealthResult } from '@/types'
import { getSystemHealth } from '@/services/systemService'

export function useHealthCheck() {
  const health = ref<HealthResult | null>(null)
  const loading = ref(false)
  const error = ref('')

  async function refresh(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      health.value = await getSystemHealth()
    } catch (err) {
      error.value = (err as Error).message || '健康检查失败'
    } finally {
      loading.value = false
    }
  }

  return { health, loading, error, refresh }
}
