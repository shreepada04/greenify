'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthProvider'

export function useAdminGuard() {
  const { user, loading, refreshUser } = useAuth()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function verify() {
      if (loading) return

      if (user?.role === 'admin') {
        if (!cancelled) setReady(true)
        return
      }

      const me = await refreshUser()
      if (cancelled) return

      if (me?.role === 'admin') {
        setReady(true)
      } else {
        setReady(false)
        router.replace('/admin')
      }
    }

    verify()
    return () => {
      cancelled = true
    }
  }, [user, loading, router, refreshUser])

  return {
    user: user?.role === 'admin' ? user : null,
    loading: loading || !ready,
    isAdmin: ready && user?.role === 'admin',
  }
}
