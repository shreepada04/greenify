import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    const currentUser = requireAuth(request)
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user data from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.userId)
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user's activities from Supabase
    const { data: userActs, error: actsError } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', currentUser.userId)

    if (actsError || !userActs) {
      console.error('User stats activities fetch error:', actsError)
      return NextResponse.json({ error: 'Failed to retrieve activity stats' }, { status: 500 })
    }

    // JS processing for metrics
    const totalActivities = userActs.length
    const approvedActivitiesList = userActs.filter(a => a.status === 'approved')
    const approvedActivities = approvedActivitiesList.length
    const pendingActivities = userActs.filter(a => a.status === 'pending').length
    const rejectedActivities = userActs.filter(a => a.status === 'rejected').length

    const totalCarbonSaved = approvedActivitiesList.reduce((acc, act) => acc + (Number(act.carbon_saved) || 0), 0)

    const recentActivitiesRaw = [...userActs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    // Calculate activity breakdown
    const breakdownMap: Record<string, { count: number; points: number; carbon: number }> = {}
    approvedActivitiesList.forEach(act => {
      if (!breakdownMap[act.type]) {
        breakdownMap[act.type] = { count: 0, points: 0, carbon: 0 }
      }
      breakdownMap[act.type].count++
      breakdownMap[act.type].points += act.points_earned || 0
      breakdownMap[act.type].carbon += Number(act.carbon_saved) || 0
    })
    const activityBreakdown = Object.entries(breakdownMap).map(([type, stats]) => ({
      _id: type,
      count: stats.count,
      points: stats.points,
      carbon: stats.carbon,
    }))

    // Calculate monthly progress (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const progressMap: Record<string, { year: number; month: number; activities: number; points: number; carbon: number }> = {}
    approvedActivitiesList.forEach(act => {
      const date = new Date(act.created_at)
      if (date >= sixMonthsAgo) {
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`
        if (!progressMap[key]) {
          progressMap[key] = { year: date.getFullYear(), month: date.getMonth() + 1, activities: 0, points: 0, carbon: 0 }
        }
        progressMap[key].activities++
        progressMap[key].points += act.points_earned || 0
        progressMap[key].carbon += Number(act.carbon_saved) || 0
      }
    })
    const monthlyProgress = Object.values(progressMap)
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map(item => ({
        _id: { year: item.year, month: item.month },
        activities: item.activities,
        points: item.points,
        carbon: item.carbon,
      }))

    const transformedRecentActivities = recentActivitiesRaw.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      status: activity.status,
      pointsEarned: activity.points_earned || 0,
      carbonSaved: activity.carbon_saved || 0,
      createdAt: activity.created_at,
    }))

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        points: user.points || 0,
        totalPointsEarned: user.total_points_earned || 0,
        level: user.level || 1,
        activitiesCompleted: user.activities_completed || 0,
        joinedAt: user.created_at,
      },
      stats: {
        totalActivities,
        approvedActivities,
        pendingActivities,
        rejectedActivities,
        totalCarbonSaved,
        currentStreak: calculateStreak(transformedRecentActivities),
        completionRate: totalActivities > 0 ? Math.round((approvedActivities / totalActivities) * 100) : 0,
      },
      activityBreakdown,
      monthlyProgress,
      recentActivities: transformedRecentActivities,
    })

  } catch (error) {
    console.error('Get user stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate activity streak
function calculateStreak(activities: any[]): number {
  if (activities.length === 0) return 0
  
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < activities.length; i++) {
    const activityDate = new Date(activities[i].createdAt)
    activityDate.setHours(0, 0, 0, 0)
    
    const daysDiff = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff === streak) {
      streak++
    } else {
      break
    }
  }
  
  return streak
}
