'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/lib/AuthProvider'
import {
  Leaf, ArrowLeft, Wallet, Ticket, ShoppingBag, Copy, ExternalLink,
  CheckCircle, Clock, XCircle, History, Gift,
} from 'lucide-react'
import ThemeToggle from '@/app/components/ThemeToggle'
import { useToast } from '@/app/hooks/useToast'
import { ToastContainer } from '@/app/components/Toast'

interface WalletItem {
  id: string
  type: 'voucher' | 'partner'
  voucherCode?: string
  pointsSpent?: number
  pointsEarned?: number
  status?: string
  redeemedAt?: string
  claimedAt?: string
  expiresAt?: string
  usedAt?: string
  brand?: string
  title?: string
  description?: string
  imageUrl?: string
  shopUrl?: string
  discount?: string
  termsAndConditions?: string
}

function WalletContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('voucher')
  const { toasts, success, removeToast } = useToast()

  const [tab, setTab] = useState<'all' | 'vouchers' | 'partner'>('all')
  const [items, setItems] = useState<WalletItem[]>([])
  const [summary, setSummary] = useState({
    totalVouchers: 0,
    activeVouchers: 0,
    totalPartnerClaims: 0,
    totalPointsSpent: 0,
  })
  const [loadingWallet, setLoadingWallet] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    else if (user) fetchWallet()
  }, [user, loading, router])

  const fetchWallet = async () => {
    try {
      setLoadingWallet(true)
      const res = await fetch('/api/user/wallet', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setItems(data.timeline || [])
        setSummary(data.summary || {})
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingWallet(false)
    }
  }

  const markAsUsed = async (id: string) => {
    const res = await fetch(`/api/user/vouchers/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'used' }),
    })
    if (res.ok) {
      success('Marked as used', 'Coupon moved to your used history')
      fetchWallet()
    }
  }

  const filtered = items.filter((item) => {
    if (tab === 'vouchers') return item.type === 'voucher'
    if (tab === 'partner') return item.type === 'partner'
    return true
  })

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-primary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow border-b dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 gap-1">
              <ArrowLeft className="h-5 w-5" /> Dashboard
            </Link>
            <Leaf className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">My Wallet</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/rewards" className="text-sm font-medium text-primary-600 hover:underline">
              Get more coupons
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total coupons', value: summary.totalVouchers, icon: Ticket, color: 'primary' },
            { label: 'Active', value: summary.activeVouchers, icon: CheckCircle, color: 'green' },
            { label: 'Shop claims', value: summary.totalPartnerClaims, icon: ShoppingBag, color: 'purple' },
            { label: 'Points spent', value: summary.totalPointsSpent, icon: Gift, color: 'orange' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 shadow border border-white/20 dark:border-gray-700"
            >
              <s.icon className="h-6 w-6 text-primary-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'all' as const, name: 'All history', icon: History },
            { id: 'vouchers' as const, name: 'Coupons redeemed', icon: Ticket },
            { id: 'partner' as const, name: 'Shop & earn', icon: ShoppingBag },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.name}
            </button>
          ))}
        </div>

        {loadingWallet ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white/60 dark:bg-gray-800/60 rounded-2xl">
            <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No purchases yet</h3>
            <p className="text-gray-500 mt-2 mb-6">Redeem coupons from brands or claim shop points — they all appear here.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/rewards" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold">
                Browse brand coupons
              </Link>
              <Link href="/partners" className="px-6 py-3 border-2 border-primary-600 text-primary-600 rounded-xl font-semibold">
                Shop & earn
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border overflow-hidden transition-all ${
                  highlightId === item.id
                    ? 'border-primary-500 ring-2 ring-primary-300'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.brand || ''}
                        className="w-20 h-20 object-contain rounded-xl bg-gray-50 p-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            item.type === 'voucher'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {item.type === 'voucher' ? 'Coupon' : 'Shop & earn'}
                        </span>
                        {item.status && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                              item.status === 'active'
                                ? 'bg-blue-100 text-blue-800'
                                : item.status === 'used'
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{item.title}</h3>
                      <p className="text-sm text-gray-500">{item.brand}</p>
                      {item.discount && (
                        <p className="text-green-600 font-semibold mt-1">{item.discount}</p>
                      )}
                      {item.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{item.description}</p>
                      )}

                      {item.type === 'voucher' && item.voucherCode && (
                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                          <code className="bg-gray-100 dark:bg-gray-900 px-4 py-2 rounded-lg font-mono text-lg font-bold text-primary-600">
                            {item.voucherCode}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.voucherCode!)
                              success('Copied!', 'Coupon code copied')
                            }}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                        <span>
                          {item.type === 'voucher' ? 'Redeemed' : 'Claimed'}:{' '}
                          {new Date(
                            (item.redeemedAt || item.claimedAt) as string
                          ).toLocaleString()}
                        </span>
                        {item.expiresAt && (
                          <span>Expires: {new Date(item.expiresAt).toLocaleDateString()}</span>
                        )}
                        {item.pointsSpent != null && <span>{item.pointsSpent} pts spent</span>}
                        {item.pointsEarned != null && <span>+{item.pointsEarned} pts earned</span>}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {item.shopUrl && (
                          <a
                            href={item.shopUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open store
                          </a>
                        )}
                        {item.type === 'voucher' && item.status === 'active' && (
                          <button
                            onClick={() => markAsUsed(item.id)}
                            className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Mark as used
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}

export default function WalletPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      }
    >
      <WalletContent />
    </Suspense>
  )
}
