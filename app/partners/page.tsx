'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/lib/AuthProvider'
import {
  Leaf, ArrowLeft, ExternalLink, ShoppingBag, Star, Clock, Gift, Sparkles,
} from 'lucide-react'
import ThemeToggle from '@/app/components/ThemeToggle'
import { useToast } from '@/app/hooks/useToast'
import { ToastContainer } from '@/app/components/Toast'

interface Partner {
  id: string
  name: string
  slug: string
  description: string
  logoUrl: string
  brandColor: string
  websiteUrl: string
  category: string
  pointsReward: number
  actionLabel: string
  featured: boolean
  lastClaimedAt: string | null
}

export default function PartnersPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toasts, success, error, removeToast } = useToast()
  const [partners, setPartners] = useState<Partner[]>([])
  const [claiming, setClaiming] = useState<string | null>(null)
  const [userPoints, setUserPoints] = useState(0)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    else if (user) {
      setUserPoints(user.points || 0)
      fetchPartners()
    }
  }, [user, loading, router])

  const fetchPartners = async () => {
    const res = await fetch('/api/partners', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setPartners(data.partners || [])
    }
  }

  const handleClaim = async (partner: Partner) => {
    setClaiming(partner.id)
    try {
      const res = await fetch('/api/partners/claim', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId: partner.id }),
      })
      const data = await res.json()
      if (res.ok) {
        success('Points Earned! 🎉', `${data.message} — saved to My Wallet`)
        setUserPoints(data.newBalance)
        fetchPartners()
        window.open(partner.websiteUrl, '_blank', 'noopener,noreferrer')
        setTimeout(() => router.push('/wallet'), 1500)
      } else {
        error('Claim Failed', data.error || 'Could not claim points')
      }
    } catch {
      error('Claim Failed', 'Something went wrong')
    } finally {
      setClaiming(null)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-primary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 flex items-center gap-1">
              <ArrowLeft className="h-5 w-5" /> Dashboard
            </Link>
            <Leaf className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Shop & Earn</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 px-4 py-2 rounded-full">
              <Star className="h-4 w-4 text-yellow-600" />
              <span className="font-bold text-yellow-800 dark:text-yellow-300">{userPoints} pts</span>
            </div>
            <Link
              href="/wallet"
              className="text-sm font-semibold text-primary-600 hover:underline"
            >
              My Wallet
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 px-4 py-2 rounded-full mb-4">
            <Sparkles className="h-4 w-4 text-primary-600" />
            <span className="text-sm font-medium">Microsoft Rewards-style partner program</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Earn Points from Top Brands
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Visit partner stores, complete your purchase, then claim eco points here.
            Redeem them for vouchers on the Rewards page.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-2xl shadow-xl border border-white/20 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-shadow"
            >
              {partner.featured && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold text-center py-1">
                  FEATURED PARTNER
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center bg-white shadow p-2"
                    style={{ borderLeft: `4px solid ${partner.brandColor}` }}
                  >
                    <img
                      src={partner.logoUrl}
                      alt={partner.name}
                      className="max-h-10 max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{partner.name}</h3>
                    <span className="text-xs text-gray-500 capitalize">{partner.category}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{partner.description}</p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-primary-600">+{partner.pointsReward}</span>
                  <span className="text-sm text-gray-500">eco points</span>
                </div>
                {partner.lastClaimedAt && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                    <Clock className="h-3 w-3" />
                    Last claimed {new Date(partner.lastClaimedAt).toLocaleDateString()}
                  </p>
                )}
                <button
                  onClick={() => handleClaim(partner)}
                  disabled={claiming === partner.id}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ backgroundColor: partner.brandColor }}
                >
                  {claiming === partner.id ? (
                    'Claiming...'
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" />
                      {partner.actionLabel}
                      <ExternalLink className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/rewards"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-green-500 text-white rounded-full font-semibold hover:scale-105 transition-transform"
          >
            <Gift className="h-5 w-5" />
            Redeem Points for Vouchers
          </Link>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}
