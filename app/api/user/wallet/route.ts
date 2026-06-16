import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = verifyAccessToken(accessToken)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user rewards (vouchers) and partner claims in parallel
    const [vouchersResult, partnerClaimsResult] = await Promise.all([
      supabase
        .from('user_rewards')
        .select('*, reward:rewards(*)')
        .eq('user_id', currentUser.userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('partner_claims')
        .select('*, partner:partners(*)')
        .eq('user_id', currentUser.userId)
        .order('claimed_at', { ascending: false }),
    ])

    const { data: vouchers, error: vouchersError } = vouchersResult
    const { data: partnerClaims, error: claimsError } = partnerClaimsResult

    if (vouchersError || claimsError) {
      console.error('Wallet fetch error:', vouchersError || claimsError)
      return NextResponse.json({ error: 'Failed to retrieve wallet history' }, { status: 500 })
    }

    const now = new Date()

    const voucherHistory = (vouchers || []).map((v: any) => {
      const reward = v.reward || {}
      
      // Compute status dynamically
      const status = v.is_redeemed
        ? 'used'
        : (new Date(v.expires_at) > now ? 'active' : 'expired')

      const discount = reward.discount_percentage
        ? `${reward.discount_percentage}% OFF`
        : reward.discount_amount
          ? `₹${reward.discount_amount} OFF`
          : 'Special offer'

      return {
        id: v.id,
        type: 'voucher' as const,
        voucherCode: v.voucher_code,
        pointsSpent: v.points_spent,
        status,
        redeemedAt: v.created_at,
        expiresAt: v.expires_at,
        usedAt: v.redeemed_at, // mapped to redeemed_at in the user_rewards table
        brand: reward.brand,
        title: reward.title,
        description: reward.description,
        imageUrl: reward.image_url,
        shopUrl: reward.shop_url,
        discount,
        termsAndConditions: reward.terms_and_conditions,
        category: reward.category,
      }
    })

    const partnerHistory = (partnerClaims || []).map((c: any) => {
      const partner = c.partner || {}
      return {
        id: c.id,
        type: 'partner' as const,
        pointsEarned: c.points_earned,
        status: c.status,
        claimedAt: c.claimed_at,
        brand: partner.name,
        title: `Shop & Earn — ${partner.name}`,
        description: `Earned ${c.points_earned} points from partner visit`,
        imageUrl: partner.logo_url,
        shopUrl: partner.website_url,
        category: partner.category,
      }
    })

    const timeline = [...voucherHistory, ...partnerHistory].sort((a, b) => {
      const dateA = new Date(
        (a.type === 'voucher' ? a.redeemedAt : a.claimedAt) as string
      ).getTime()
      const dateB = new Date(
        (b.type === 'voucher' ? b.redeemedAt : b.claimedAt) as string
      ).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      timeline,
      vouchers: voucherHistory,
      partnerClaims: partnerHistory,
      summary: {
        totalVouchers: voucherHistory.length,
        activeVouchers: voucherHistory.filter((v) => v.status === 'active').length,
        totalPartnerClaims: partnerHistory.length,
        totalPointsSpent: voucherHistory.reduce(
          (s, v) => s + (Number(v.pointsSpent) || 0),
          0
        ),
      },
    })
  } catch (error) {
    console.error('Wallet history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
