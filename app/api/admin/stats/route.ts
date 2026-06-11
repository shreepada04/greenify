import { NextRequest, NextResponse } from 'next/server'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import Activity from '@/app/lib/models/Activity'
import User from '@/app/lib/models/User'
import UserReward from '@/app/lib/models/UserReward'
import Reward from '@/app/lib/models/Reward'
import AdminAuditLog from '@/app/lib/models/AdminAuditLog'
import { verifyAccessToken } from '@/app/lib/jwt'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

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

    const today = startOfToday()
    const weekStart = startOfWeek()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      activeUsers,
      newRegistrationsThisWeek,
      pending,
      approvedTotal,
      rejectedTotal,
      approvedToday,
      rejectedToday,
      rewardsRedeemed,
      totalRewards,
      activeRewards,
      pointsAgg,
      carbonAgg,
      recycledAgg,
      topUsers,
      activityTrends,
      locationStats,
      recentVerifications,
      recentActivityLog,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', updatedAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ role: 'user', createdAt: { $gte: weekStart } }),
      Activity.countDocuments({ status: 'pending' }),
      Activity.countDocuments({ status: 'approved' }),
      Activity.countDocuments({ status: 'rejected' }),
      Activity.countDocuments({ status: 'approved', verifiedAt: { $gte: today } }),
      Activity.countDocuments({ status: 'rejected', verifiedAt: { $gte: today } }),
      UserReward.countDocuments(),
      Reward.countDocuments(),
      Reward.countDocuments({ isActive: true }),
      Activity.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$pointsEarned' } } },
      ]),
      Activity.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$carbonSaved' } } },
      ]),
      Activity.aggregate([
        { $match: { status: 'approved', type: 'recycling' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$quantity', 1] } } } },
      ]),
      User.find({ role: 'user' })
        .sort({ totalPointsEarned: -1 })
        .limit(5)
        .select('name points totalPointsEarned activitiesCompleted level')
        .lean(),
      Activity.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Activity.aggregate([
        { $match: { status: 'approved', 'location.address': { $exists: true, $ne: '' } } },
        {
          $group: {
            _id: {
              $arrayElemAt: [{ $split: ['$location.address', ','] }, 0],
            },
            activities: { $sum: 1 },
          },
        },
        { $sort: { activities: -1 } },
        { $limit: 5 },
      ]),
      Activity.find({ verifiedAt: { $exists: true } })
        .sort({ verifiedAt: -1 })
        .limit(8)
        .populate('userId', 'name')
        .populate('verifiedBy', 'name')
        .select('title status pointsEarned verifiedAt rejectionReason userId verifiedBy')
        .lean(),
      AdminAuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ])

    const totalPointsAwarded = pointsAgg[0]?.total ?? 0
    const carbonSaved = Math.round((carbonAgg[0]?.total ?? 0) * 10) / 10
    const totalRecycled = recycledAgg[0]?.total ?? 0
    const engagementRate =
      totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0

    return NextResponse.json({
      totalUsers,
      activeUsers,
      newRegistrationsThisWeek,
      pendingActivities: pending,
      approvedActivities: approvedTotal,
      rejectedActivities: rejectedTotal,
      approvedToday,
      rejectedToday,
      totalPointsAwarded,
      carbonSaved,
      totalRecycled,
      rewardsRedeemed,
      totalRewards,
      activeRewards,
      engagementRate,
      topUsers: topUsers.map((u) => ({
        name: u.name,
        points: u.totalPointsEarned ?? u.points ?? 0,
        activities: u.activitiesCompleted ?? 0,
        level: u.level ?? 1,
      })),
      activityTrends: activityTrends.map((t) => ({
        type: t._id,
        count: t.count,
      })),
      locationStats: locationStats.map((l) => ({
        city: l._id || 'Unknown',
        activities: l.activities,
      })),
      recentVerifications: recentVerifications.map((v: any) => ({
        id: v._id.toString(),
        activityTitle: v.title,
        userName: (v.userId as { name?: string })?.name || 'Unknown User',
        adminName: (v.verifiedBy as { name?: string })?.name || 'Admin',
        action: v.status === 'approved' ? 'approved' : 'rejected',
        pointsAwarded: v.status === 'approved' ? v.pointsEarned : undefined,
        reason: v.rejectionReason,
        timestamp: v.verifiedAt,
      })),
      recentActivityLog: recentActivityLog.map((log: any) => ({
        id: log._id.toString(),
        eventType: log.eventType,
        actorName: log.actorName,
        summary: log.summary,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
