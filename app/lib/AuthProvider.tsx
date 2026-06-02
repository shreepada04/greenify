'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  points: number
  totalPointsEarned: number
  level: number
  activitiesCompleted: number
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; message?: string }>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  refreshUser: () => Promise<User | null>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        return userData
      }
      setUser(null)
      return null
    } catch {
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        return true
      }
      setUser(null)
      return false
    } catch {
      setUser(null)
      return false
    }
  }

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; message?: string }> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const data = await response.json().catch(() => ({}))

      if (response.ok && data.user) {
        setUser(data.user)
        return { success: true, user: data.user }
      }

      return { success: false, message: data.error || 'Invalid email or password' }
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Login timed out. Is MongoDB running?'
          : 'Network error. Please try again.'
      return { success: false, message }
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      })
      if (response.ok) {
        const { user: newUser } = await response.json()
        setUser(newUser)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      /* ignore */
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, refreshToken, refreshUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
