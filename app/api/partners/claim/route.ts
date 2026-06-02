import { NextRequest, NextResponse } from 'next/server'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import Partner from '@/app/lib/models/Partner'
import PartnerClaim from '@/app/lib/models/PartnerClaim'
import User from '@/app/lib/models/User'
import { requireAuth } from '@/app/lib/jwt'

const COOLDOWN_HOURS = 24

export async function POST(request: NextRequest) {
  try {
    await dbConnectSimple()

    const currentUser = requireAuth(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { partnerId } = await request.json()
    if (!partnerId) {
      return NextResponse.json({ error: 'partnerId required' }, { status: 400 })
    }

    const partner = await Partner.findById(partnerId)
    if (!partner || !partner.active) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    const cooldownStart = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000)
    const recentClaim = await PartnerClaim.findOne({
      userId: currentUser.userId,
      partnerId: partner._id,
      claimedAt: { $gte: cooldownStart },
    })

    if (recentClaim) {
      return NextResponse.json(
        {
          error: `You can claim ${partner.name} points again in ${COOLDOWN_HOURS} hours`,
          nextClaimAt: new Date(recentClaim.claimedAt.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000),
        },
        { status: 429 }
      )
    }

    await PartnerClaim.create({
      userId: currentUser.userId,
      partnerId: partner._id,
      pointsEarned: partner.pointsReward,
      status: 'completed',
    })

    const user = await User.findById(currentUser.userId)
    if (user) {
      user.points += partner.pointsReward
      user.totalPointsEarned += partner.pointsReward
      user.level = Math.floor(user.totalPointsEarned / 100) + 1
      await user.save()
    }

    return NextResponse.json({
      message: `Earned ${partner.pointsReward} points from ${partner.name}!`,
      pointsAwarded: partner.pointsReward,
      newBalance: user?.points ?? 0,
      partner: { name: partner.name, websiteUrl: partner.websiteUrl },
    })
  } catch (error) {
    console.error('Partner claim error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
