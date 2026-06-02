'use client'

import { SessionProvider } from 'next-auth/react'
import { AuthProvider } from '@/app/lib/AuthProvider'
import { ThemeProvider } from '@/app/lib/ThemeProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
