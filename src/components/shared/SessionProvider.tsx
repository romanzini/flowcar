'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface UserSession {
  id: string
  name: string
  email: string
  role: string
  tenantId: string
}

interface SessionContextValue {
  user: UserSession | null
  accessToken: string | null
  setSession: (token: string, user: UserSession) => void
  clearSession: () => void
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserSession | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('access_token')
    const userStr = sessionStorage.getItem('user')
    if (token) setAccessToken(token)
    if (userStr) {
      try {
        setUser(JSON.parse(userStr) as UserSession)
      } catch {
        // ignore
      }
    }
  }, [])

  const setSession = useCallback((token: string, userData: UserSession) => {
    sessionStorage.setItem('access_token', token)
    sessionStorage.setItem('user', JSON.stringify(userData))
    setAccessToken(token)
    setUser(userData)
  }, [])

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('user')
    setAccessToken(null)
    setUser(null)
  }, [])

  const authFetch = useCallback(
    async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
      let token = accessToken ?? sessionStorage.getItem('access_token')

      const headers = new Headers(init?.headers)
      if (token) headers.set('Authorization', `Bearer ${token}`)

      let res = await fetch(input, { ...init, headers, credentials: 'include' })

      // If 401, try refreshing once
      if (res.status === 401) {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })

        if (refreshRes.ok) {
          const data = await refreshRes.json()
          token = data.data?.accessToken ?? null
          if (token) {
            const userData: UserSession = data.data?.user
            setSession(token, userData)
            headers.set('Authorization', `Bearer ${token}`)
            res = await fetch(input, { ...init, headers, credentials: 'include' })
          }
        } else {
          clearSession()
          window.location.href = '/login'
        }
      }

      return res
    },
    [accessToken, setSession, clearSession]
  )

  return (
    <SessionContext.Provider value={{ user, accessToken, setSession, clearSession, authFetch }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
