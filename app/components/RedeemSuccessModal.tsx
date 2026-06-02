'use client'

import { X, Copy, ExternalLink, Wallet, Ticket } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface RedeemedVoucher {
  id: string
  voucherCode: string
  pointsSpent: number
  expiresAt: string
  reward: {
    title: string
    brand: string
    description?: string
    shopUrl?: string
    howToUse?: string
    discount?: string
  }
}

interface RedeemSuccessModalProps {
  voucher: RedeemedVoucher
  onClose: () => void
}

export default function RedeemSuccessModal({ voucher, onClose }: RedeemSuccessModalProps) {
  const router = useRouter()

  const copyCode = () => {
    navigator.clipboard.writeText(voucher.voucherCode)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-primary-500 to-green-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <Ticket className="h-10 w-10 mb-2 opacity-90" />
          <h2 className="text-2xl font-bold">Coupon Claimed!</h2>
          <p className="text-sm opacity-90 mt-1">{voucher.reward.brand}</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Reward</p>
            <p className="font-semibold text-gray-900 dark:text-white">{voucher.reward.title}</p>
            {voucher.reward.discount && (
              <p className="text-green-600 font-bold mt-1">{voucher.reward.discount}</p>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border-2 border-dashed border-primary-300 dark:border-primary-700">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Your coupon code</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xl font-bold text-primary-600 dark:text-primary-400 break-all">
                {voucher.voucherCode}
              </code>
              <button
                onClick={copyCode}
                className="flex-shrink-0 p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg hover:bg-primary-200"
                title="Copy code"
              >
                <Copy className="h-5 w-5 text-primary-600" />
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Expires {new Date(voucher.expiresAt).toLocaleDateString()} · {voucher.pointsSpent} points spent
          </p>

          {voucher.reward.howToUse && (
            <p className="text-sm text-gray-600 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <strong>How to use:</strong> {voucher.reward.howToUse}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {voucher.reward.shopUrl && (
              <a
                href={voucher.reward.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700"
              >
                <ExternalLink className="h-4 w-4" />
                Shop at {voucher.reward.brand}
              </a>
            )}
            <button
              onClick={() => {
                onClose()
                router.push(`/wallet?voucher=${voucher.id}`)
              }}
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-primary-600 text-primary-600 dark:text-primary-400 rounded-xl font-semibold hover:bg-primary-50 dark:hover:bg-primary-900/20"
            >
              <Wallet className="h-4 w-4" />
              View in My Wallet
            </button>
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 py-1">
              Continue browsing rewards
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
