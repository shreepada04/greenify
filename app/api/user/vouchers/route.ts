import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 })
    }

    const currentUser = verifyAccessToken(accessToken)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    let queryBuilder = supabase
      .from('user_rewards')
      .select('*, reward:rewards(*)', { count: 'exact' })
      .eq('user_id', currentUser.userId)

    const now = new Date().toISOString()
    if (status === 'active') {
      queryBuilder = queryBuilder.eq('is_redeemed', false).gt('expires_at', now)
    } else if (status === 'used') {
      queryBuilder = queryBuilder.eq('is_redeemed', true)
    } else if (status === 'expired') {
      queryBuilder = queryBuilder.eq('is_redeemed', false).lte('expires_at', now)
    }

    const skip = (page - 1) * limit
    const { data: vouchers, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1)

    if (error || !vouchers) {
      console.error('Vouchers query error:', error)
      return NextResponse.json({ error: 'Failed to retrieve vouchers' }, { status: 500 })
    }

    const total = count || 0
    const nowTime = new Date()

    const transformedVouchers = vouchers.map((voucher: any) => {
      const reward = voucher.reward || {}
      
      // Compute status dynamically
      const computedStatus = voucher.is_redeemed
        ? 'used'
        : (new Date(voucher.expires_at) > nowTime ? 'active' : 'expired')

      const discount = reward.discount_percentage
        ? `${reward.discount_percentage}% OFF`
        : reward.discount_amount
          ? `₹${reward.discount_amount} OFF`
          : 'Special offer'

      return {
        id: voucher.id,
        voucherCode: voucher.voucher_code,
        pointsSpent: voucher.points_spent,
        status: computedStatus,
        redeemedAt: voucher.created_at,
        expiresAt: voucher.expires_at,
        usedAt: voucher.redeemed_at, // mapped to redeemed_at column in table
        brand: reward.brand,
        title: reward.title,
        shopUrl: reward.shop_url,
        discount,
        reward: {
          title: reward.title,
          brand: reward.brand,
          description: reward.description,
          discountPercentage: reward.discount_percentage,
          discountAmount: reward.discount_amount,
          termsAndConditions: reward.terms_and_conditions,
          imageUrl: reward.image_url,
          shopUrl: reward.shop_url,
          howToUse: reward.howToUse,
          category: reward.category,
        },
        rewardId: reward.id,
      }
    })

    return NextResponse.json({
      vouchers: transformedVouchers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get vouchers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
