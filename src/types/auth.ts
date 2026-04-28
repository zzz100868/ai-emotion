export type UserRole = 'admin' | 'user'

export interface User {
  id?: string
  name: string
  role: UserRole
  group?: string
}

export interface AuthState {
  user: User
  token: string
  isLoggedIn: boolean
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}
