import { NextRequest, NextResponse } from 'next/server'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import UserReward from '@/app/lib/models/UserReward'
import PartnerClaim from '@/app/lib/models/PartnerClaim'
import { verifyAccessToken } from '@/app/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    await dbConnectSimple()

    const accessToken = request.cookies.get('accessToken')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = verifyAccessToken(accessToken)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [vouchers, partnerClaims] = await Promise.all([
      UserReward.find({ userId: currentUser.userId })
        .populate('rewardId', 'title brand description category imageUrl shopUrl discountPercentage discountAmount termsAndConditions')
        .sort({ redeemedAt: -1 })
        .limit(100)
        .lean(),
      PartnerClaim.find({ userId: currentUser.userId })
        .populate('partnerId', 'name slug logoUrl brandColor websiteUrl category pointsReward')
        .sort({ claimedAt: -1 })
        .limit(100)
        .lean(),
    ])

    const voucherHistory = vouchers.map((v: Record<string, unknown>) => {
      const reward = v.rewardId as Record<string, unknown> | null
      return {
        id: String(v._id),
        type: 'voucher' as const,
        voucherCode: v.voucherCode,
        pointsSpent: v.pointsSpent,
        status: v.status,
        redeemedAt: v.redeemedAt,
        expiresAt: v.expiresAt,
        usedAt: v.usedAt,
        brand: v.brandSnapshot || reward?.brand,
        title: v.titleSnapshot || reward?.title,
        description: reward?.description,
        imageUrl: reward?.imageUrl,
        shopUrl: v.shopUrlSnapshot || reward?.shopUrl,
        discount:
          v.discountSnapshot ||
          (reward?.discountPercentage
            ? `${reward.discountPercentage}% OFF`
            : reward?.discountAmount
              ? `₹${reward.discountAmount} OFF`
              : null),
        termsAndConditions: reward?.termsAndConditions,
        category: reward?.category,
      }
    })

    const partnerHistory = partnerClaims.map((c: Record<string, unknown>) => {
      const partner = c.partnerId as Record<string, unknown> | null
      return {
        id: String(c._id),
        type: 'partner' as const,
        pointsEarned: c.pointsEarned,
        status: c.status,
        claimedAt: c.claimedAt,
        brand: partner?.name,
        title: `Shop & Earn — ${partner?.name}`,
        description: `Earned ${c.pointsEarned} points from partner visit`,
        imageUrl: partner?.logoUrl,
        shopUrl: partner?.websiteUrl,
        category: partner?.category,
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
