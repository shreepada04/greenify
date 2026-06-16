import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    // Run primary counts and fetch approved activities in parallel
    const [
      { count: totalUsers },
      { count: totalActivities },
      { count: approvedCount },
      { data: approvedActs, error: approvedError },
      { count: activeRewards },
      { count: activeUsers },
      { data: recentUsers },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('activities').select('id', { count: 'exact', head: true }),
      supabase.from('activities').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('activities').select('type, quantity, points_earned, carbon_saved, verified_at, user_id, submitted_at').eq('status', 'approved'),
      supabase.from('rewards').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('users').select('created_at').gte('created_at', twelveMonthsAgo.toISOString()),
    ])

    if (approvedError || !approvedActs) {
      console.error('Approved activities fetch error:', approvedError)
      return NextResponse.json({ error: 'Failed to fetch platform stats' }, { status: 500 })
    }

    // Calculations in JS
    const approvedActivities = approvedCount || 0
    const totalCarbonSaved = approvedActs.reduce((acc, act) => acc + (Number(act.carbon_saved) || 0), 0)
    const totalPointsAwarded = approvedActs.reduce((acc, act) => acc + (act.points_earned || 0), 0)

    // Activity type stats
    const typeStats: Record<string, { count: number; totalPoints: number; totalCarbon: number }> = {}
    approvedActs.forEach(act => {
      if (!typeStats[act.type]) {
        typeStats[act.type] = { count: 0, totalPoints: 0, totalCarbon: 0 }
      }
      typeStats[act.type].count++
      typeStats[act.type].totalPoints += act.points_earned || 0
      typeStats[act.type].totalCarbon += Number(act.carbon_saved) || 0
    })
    const activityTypeStats = Object.entries(typeStats).map(([type, stats]) => ({
      _id: type,
      count: stats.count,
      totalPoints: stats.totalPoints,
      totalCarbon: stats.totalCarbon,
    })).sort((a, b) => b.count - a.count)

    // Monthly growth for users
    const userGrowthMap: Record<string, { year: number; month: number; newUsers: number }> = {}
    if (recentUsers) {
      recentUsers.forEach(u => {
        const date = new Date(u.created_at)
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`
        if (!userGrowthMap[key]) {
          userGrowthMap[key] = { year: date.getFullYear(), month: date.getMonth() + 1, newUsers: 0 }
        }
        userGrowthMap[key].newUsers++
      })
    }
    const userGrowth = Object.values(userGrowthMap)
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map(item => ({
        _id: { year: item.year, month: item.month },
        newUsers: item.newUsers,
      }))

    // Monthly growth for activities
    const actGrowthMap: Record<string, { year: number; month: number; activities: number; carbonSaved: number }> = {}
    approvedActs.forEach(act => {
      if (act.verified_at && new Date(act.verified_at) >= twelveMonthsAgo) {
        const date = new Date(act.verified_at)
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`
        if (!actGrowthMap[key]) {
          actGrowthMap[key] = { year: date.getFullYear(), month: date.getMonth() + 1, activities: 0, carbonSaved: 0 }
        }
        actGrowthMap[key].activities++
        actGrowthMap[key].carbonSaved += Number(act.carbon_saved) || 0
      }
    })
    const actGrowth = Object.values(actGrowthMap)
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map(item => ({
        _id: { year: item.year, month: item.month },
        activities: item.activities,
        carbonSaved: item.carbonSaved,
      }))

    // Top Performers (users with most points approved this month)
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const performersMap: Record<string, { userId: string; monthlyPoints: number; monthlyActivities: number; monthlyCarbon: number }> = {}
    approvedActs.forEach(act => {
      if (act.verified_at && new Date(act.verified_at) >= thisMonth) {
        const uid = act.user_id
        if (!performersMap[uid]) {
          performersMap[uid] = { userId: uid, monthlyPoints: 0, monthlyActivities: 0, monthlyCarbon: 0 }
        }
        performersMap[uid].monthlyPoints += act.points_earned || 0
        performersMap[uid].monthlyActivities++
        performersMap[uid].monthlyCarbon += Number(act.carbon_saved) || 0
      }
    })

    const performersArray = Object.values(performersMap)
      .sort((a, b) => b.monthlyPoints - a.monthlyPoints)
      .slice(0, 10)

    const topPerformers: any[] = []
    if (performersArray.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, total_points_earned, level')
        .in('id', performersArray.map(p => p.userId))

      if (usersData) {
        const uMap = new Map(usersData.map(u => [u.id, u]))
        performersArray.forEach(p => {
          const u = uMap.get(p.userId)
          if (u) {
            topPerformers.push({
              name: u.name,
              monthlyPoints: p.monthlyPoints,
              monthlyActivities: p.monthlyActivities,
              monthlyCarbon: p.monthlyCarbon,
              totalPoints: u.total_points_earned,
              level: u.level,
            })
          }
        })
      }
    }

    // Recent 10 approved activities
    const { data: recentActs } = await supabase
      .from('activities')
      .select('id, type, title, points_earned, carbon_saved, verified_at, user_id')
      .eq('status', 'approved')
      .order('verified_at', { ascending: false })
      .limit(10)

    const recentActivities: any[] = []
    if (recentActs && recentActs.length > 0) {
      const recentUserIds = Array.from(new Set(recentActs.map(a => a.user_id).filter(Boolean)))
      const recentUsersMap: Record<string, string> = {}
      if (recentUserIds.length > 0) {
        const { data: recentUsersList } = await supabase
          .from('users')
          .select('id, name')
          .in('id', recentUserIds)
        if (recentUsersList) {
          recentUsersList.forEach(u => {
            recentUsersMap[u.id] = u.name
          })
        }
      }

      recentActs.forEach(activity => {
        recentActivities.push({
          id: activity.id,
          type: activity.type,
          title: activity.title,
          pointsEarned: activity.points_earned,
          carbonSaved: activity.carbon_saved,
          verifiedAt: activity.verified_at,
          user: activity.user_id ? recentUsersMap[activity.user_id] || 'Unknown User' : 'Unknown User',
        })
      })
    }

    const overview = {
      totalUsers: totalUsers || 0,
      totalActivities: totalActivities || 0,
      approvedActivities,
      totalCarbonSaved,
      totalPointsAwarded,
      totalRewards: activeRewards || 0,
      activeUsers: activeUsers || 0,
      approvalRate: totalActivities && totalActivities > 0 ? Math.round((approvedActivities / totalActivities) * 100) : 0,
    }

    return NextResponse.json({
      overview,
      activityTypeStats,
      monthlyGrowth: {
        users: userGrowth,
        activities: actGrowth,
      },
      topPerformers,
      recentActivities,
    })
  } catch (error) {
    console.error('Get platform stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
