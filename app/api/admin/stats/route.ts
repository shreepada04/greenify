import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
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
      { count: totalUsers },
      { count: activeUsers },
      { count: newRegistrationsThisWeek },
      { count: pending },
      { data: approvedActs, error: approvedError },
      { count: rejectedTotal },
      { count: approvedToday },
      { count: rejectedToday },
      { count: rewardsRedeemed },
      { count: totalRewards },
      { count: activeRewards },
      { data: topUsersRaw },
      { data: recentVerificationsRaw },
      { data: recentActivityLogRaw },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'user').gte('updated_at', thirtyDaysAgo.toISOString()),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'user').gte('created_at', weekStart.toISOString()),
      supabase.from('activities').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('activities').select('type, quantity, points_earned, carbon_saved, location').eq('status', 'approved'),
      supabase.from('activities').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('activities').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('verified_at', today.toISOString()),
      supabase.from('activities').select('id', { count: 'exact', head: true }).eq('status', 'rejected').gte('verified_at', today.toISOString()),
      supabase.from('user_rewards').select('id', { count: 'exact', head: true }),
      supabase.from('rewards').select('id', { count: 'exact', head: true }),
      supabase.from('rewards').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('users').select('name, points, total_points_earned, activities_completed, level').eq('role', 'user').order('total_points_earned', { ascending: false }).limit(5),
      supabase.from('activities').select('id, title, status, points_earned, verified_at, rejection_reason, user_id, verified_by').not('verified_at', 'is', null).order('verified_at', { ascending: false }).limit(8),
      supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(10),
    ])

    const approvedActsList = approvedActs || []
    const approvedTotal = approvedActsList.length

    // Aggregate in JS
    const totalPointsAwarded = approvedActsList.reduce((acc, act) => acc + (act.points_earned || 0), 0)
    const rawCarbon = approvedActsList.reduce((acc, act) => acc + (Number(act.carbon_saved) || 0), 0)
    const carbonSaved = Math.round(rawCarbon * 10) / 10
    const totalRecycled = approvedActsList.reduce((acc, act) => acc + (act.type === 'recycling' ? (Number(act.quantity) || 1) : 0), 0)
    const engagementRate = totalUsers && totalUsers > 0 ? Math.round(((activeUsers || 0) / totalUsers) * 100) : 0

    // Trends
    const trendsMap: Record<string, number> = {}
    approvedActsList.forEach(act => {
      trendsMap[act.type] = (trendsMap[act.type] || 0) + 1
    })
    const activityTrends = Object.entries(trendsMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Location stats
    const locMap: Record<string, number> = {}
    approvedActsList.forEach(act => {
      const address = act.location?.address
      if (address) {
        const city = address.split(',')[0].trim()
        if (city) {
          locMap[city] = (locMap[city] || 0) + 1
        }
      }
    })
    const locationStats = Object.entries(locMap)
      .map(([city, activities]) => ({ city, activities }))
      .sort((a, b) => b.activities - a.activities)
      .slice(0, 5)

    // Top users mapping
    const topUsers = (topUsersRaw || []).map(u => ({
      name: u.name,
      points: u.total_points_earned ?? u.points ?? 0,
      activities: u.activities_completed ?? 0,
      level: u.level ?? 1,
    }))

    // Populate user details for recent verifications
    const recentVerificationsList = recentVerificationsRaw || []
    const allUserIds = new Set<string>()
    recentVerificationsList.forEach(v => {
      if (v.user_id) allUserIds.add(v.user_id)
      if (v.verified_by) allUserIds.add(v.verified_by)
    })
    
    const userIdsArray = Array.from(allUserIds)
    const usersMap: Record<string, string> = {}
    if (userIdsArray.length > 0) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIdsArray)
      if (userData) {
        userData.forEach(u => {
          usersMap[u.id] = u.name
        })
      }
    }

    const recentVerifications = recentVerificationsList.map(v => ({
      id: v.id,
      activityTitle: v.title,
      userName: v.user_id ? usersMap[v.user_id] || 'Unknown User' : 'Unknown User',
      adminName: v.verified_by ? usersMap[v.verified_by] || 'Admin' : 'Admin',
      action: v.status === 'approved' ? 'approved' : 'rejected',
      pointsAwarded: v.status === 'approved' ? v.points_earned : undefined,
      reason: v.rejection_reason,
      timestamp: v.verified_at,
    }))

    const recentActivityLog = (recentActivityLogRaw || []).map(log => ({
      id: log.id,
      eventType: log.event_type,
      actorName: log.actor_name,
      summary: log.summary,
      metadata: log.metadata,
      createdAt: log.created_at,
    }))

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      newRegistrationsThisWeek: newRegistrationsThisWeek || 0,
      pendingActivities: pending || 0,
      approvedActivities: approvedTotal || 0,
      rejectedActivities: rejectedTotal || 0,
      approvedToday: approvedToday || 0,
      rejectedToday: rejectedToday || 0,
      totalPointsAwarded,
      carbonSaved,
      totalRecycled,
      rewardsRedeemed: rewardsRedeemed || 0,
      totalRewards: totalRewards || 0,
      activeRewards: activeRewards || 0,
      engagementRate,
      topUsers,
      activityTrends,
      locationStats,
      recentVerifications,
      recentActivityLog,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
