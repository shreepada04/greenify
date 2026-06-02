import { NextRequest, NextResponse } from 'next/server'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import UserReward from '@/app/lib/models/UserReward'
import { verifyAccessToken } from '@/app/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    await dbConnectSimple()

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

    const query: Record<string, unknown> = { userId: currentUser.userId }
    if (status !== 'all') query.status = status

    const skip = (page - 1) * limit
    const vouchers = await UserReward.find(query)
      .populate(
        'rewardId',
        'title brand description category imageUrl shopUrl discountPercentage discountAmount termsAndConditions howToUse'
      )
      .sort({ redeemedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await UserReward.countDocuments(query)

    const transformedVouchers = vouchers.map((voucher: Record<string, unknown>) => {
      const reward = voucher.rewardId as Record<string, unknown> | null
      return {
        id: String(voucher._id),
        voucherCode: voucher.voucherCode,
        pointsSpent: voucher.pointsSpent,
        status: voucher.status,
        redeemedAt: voucher.redeemedAt,
        expiresAt: voucher.expiresAt,
        usedAt: voucher.usedAt,
        brand: voucher.brandSnapshot || reward?.brand,
        title: voucher.titleSnapshot || reward?.title,
        shopUrl: voucher.shopUrlSnapshot || reward?.shopUrl,
        discount:
          voucher.discountSnapshot ||
          (reward?.discountPercentage
            ? `${reward.discountPercentage}% OFF`
            : reward?.discountAmount
              ? `₹${reward.discountAmount} OFF`
              : null),
        reward: reward
          ? {
              title: reward.title,
              brand: reward.brand,
              description: reward.description,
              discountPercentage: reward.discountPercentage,
              discountAmount: reward.discountAmount,
              termsAndConditions: reward.termsAndConditions,
              imageUrl: reward.imageUrl,
              shopUrl: reward.shopUrl,
              howToUse: reward.howToUse,
              category: reward.category,
            }
          : {
              title: voucher.titleSnapshot,
              brand: voucher.brandSnapshot,
              description: '',
              termsAndConditions: '',
            },
        rewardId: reward,
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
