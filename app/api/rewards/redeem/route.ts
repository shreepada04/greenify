import { NextRequest, NextResponse } from 'next/server'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import User from '@/app/lib/models/User'
import Reward from '@/app/lib/models/Reward'
import UserReward from '@/app/lib/models/UserReward'
import { verifyAccessToken } from '@/app/lib/jwt'

function buildDiscountLabel(reward: {
  discountPercentage?: number
  discountAmount?: number
}) {
  if (reward.discountPercentage) return `${reward.discountPercentage}% OFF`
  if (reward.discountAmount) return `₹${reward.discountAmount} OFF`
  return 'Special offer'
}

export async function POST(request: NextRequest) {
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

    const { rewardId } = await request.json()
    if (!rewardId) {
      return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 })
    }

    const user = await User.findById(currentUser.userId)
    const reward = await Reward.findById(rewardId)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }
    if (!reward.isActive || reward.validUntil < new Date()) {
      return NextResponse.json({ error: 'This reward is no longer available' }, { status: 400 })
    }
    if (reward.currentRedemptions >= reward.maxRedemptions) {
      return NextResponse.json({ error: 'This reward has reached its redemption limit' }, { status: 400 })
    }
    if (user.points < reward.pointsCost) {
      return NextResponse.json(
        { error: `Insufficient points. You need ${reward.pointsCost} points but have ${user.points}` },
        { status: 400 }
      )
    }

    const prefix = reward.couponPrefix || reward.brand.substring(0, 4).toUpperCase()
    const voucherCode =
      prefix +
      Date.now().toString(36).toUpperCase() +
      Math.random().toString(36).substr(2, 4).toUpperCase()

    const userReward = await UserReward.create({
      userId: user._id,
      rewardId: reward._id,
      pointsSpent: reward.pointsCost,
      voucherCode,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      brandSnapshot: reward.brand,
      titleSnapshot: reward.title,
      shopUrlSnapshot: reward.shopUrl || '',
      discountSnapshot: buildDiscountLabel(reward),
    })

    user.points -= reward.pointsCost
    await user.save()

    reward.currentRedemptions += 1
    await reward.save()

    return NextResponse.json({
      message: 'Reward redeemed successfully! View it in My Wallet.',
      voucher: {
        id: userReward._id.toString(),
        voucherCode: userReward.voucherCode,
        reward: {
          title: reward.title,
          brand: reward.brand,
          description: reward.description,
          shopUrl: reward.shopUrl,
          howToUse: reward.howToUse,
          discount: buildDiscountLabel(reward),
        },
        pointsSpent: userReward.pointsSpent,
        expiresAt: userReward.expiresAt,
        status: userReward.status,
        redeemedAt: userReward.redeemedAt,
      },
      userPoints: user.points,
      walletUrl: `/wallet?voucher=${userReward._id}`,
    })
  } catch (error) {
    console.error('Redeem reward error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
