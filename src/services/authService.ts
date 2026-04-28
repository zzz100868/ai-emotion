import type { LoginCredentials, LoginResponse } from '@/types'
import { httpClient } from '@/services/httpClient'

export function loginWithPassword(credentials: LoginCredentials): Promise<LoginResponse> {
  return httpClient.post('/login', credentials) as Promise<LoginResponse>
}
