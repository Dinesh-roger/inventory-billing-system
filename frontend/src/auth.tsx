import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import api from './api'
import type { Role } from './types'

export interface AuthUser { username: string; fullName: string; role: Role }
interface AuthCtx {
  user: AuthUser | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx>({ user: null, login: async () => {}, logout: () => {} })

function stored(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem('user') ?? 'null') } catch { return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(stored())

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password })
    const u: AuthUser = { username: data.username, fullName: data.fullName, role: data.role }
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
export const SHOP_NAME = import.meta.env.VITE_SHOP_NAME ?? 'Our Shop'
