'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Redirect legacy /vouchers URL to unified wallet */
export default function VouchersRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/wallet')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
    </div>
  )
}
