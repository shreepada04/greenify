import { NextRequest, NextResponse } from 'next/server'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import Activity from '@/app/lib/models/Activity'
import User from '@/app/lib/models/User'
import UserReward from '@/app/lib/models/UserReward'
import { verifyAccessToken } from '@/app/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    await dbConnectSimple()

    const accessToken = request.cookies.get('accessToken')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = verifyAccessToken(accessToken)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const [totalUsers, pending, approved, rejected, rewardsRedeemed] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Activity.countDocuments({ status: 'pending' }),
      Activity.countDocuments({ status: 'approved' }),
      Activity.countDocuments({ status: 'rejected' }),
      UserReward.countDocuments(),
    ])

    return NextResponse.json({
      totalUsers,
      pendingActivities: pending,
      approvedActivities: approved,
      rejectedActivities: rejected,
      rewardsRedeemed,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
