import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

function calculateStreak(activities: any[]): number {
  if (activities.length === 0) return 0
  
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < activities.length; i++) {
    const activityDate = new Date(activities[i].created_at)
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

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const currentUser = verifyAccessToken(accessToken)
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Query all users from Supabase sorted by total_points_earned
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, points, total_points_earned, level, activities_completed')
      .eq('role', 'user')
      .order('total_points_earned', { ascending: false })

    if (error || !users) {
      console.error('Leaderboard query error:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve leaderboard' },
        { status: 500 }
      )
    }

    // Fetch all approved activities to calculate statistics
    const { data: allActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('user_id, type, carbon_saved, quantity, created_at')
      .eq('status', 'approved')

    const activitiesByUser: Record<string, any[]> = {}
    if (allActivities) {
      for (const act of allActivities) {
        if (!activitiesByUser[act.user_id]) {
          activitiesByUser[act.user_id] = []
        }
        activitiesByUser[act.user_id].push(act)
      }
    }

    const leaderboard = users.map((u, index) => {
      const userActs = activitiesByUser[u.id] || []
      
      const carbonSaved = userActs.reduce((acc, act) => acc + (Number(act.carbon_saved) || 0), 0)
      const treesPlanted = userActs.filter(a => a.type === 'tree_planting').reduce((sum, a) => sum + (Number(a.quantity) || 1), 0)
      
      const sortedActs = [...userActs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const streak = calculateStreak(sortedActs)

      // Calculate badges count/array
      const activitiesCompleted = u.activities_completed || 0
      const totalPointsEarned = u.total_points_earned || 0
      const recyclingCount = userActs.filter(a => a.type === 'recycling').length
      const waterSavingCount = userActs.filter(a => a.type === 'water_saving').length
      const treePlantingCount = userActs.filter(a => a.type === 'tree_planting').length

      const badges: string[] = []
      if (activitiesCompleted >= 1) badges.push('first_activity')
      if (recyclingCount >= 5) badges.push('recycling_hero')
      if (streak >= 7) badges.push('week_warrior')
      if (totalPointsEarned >= 1000) badges.push('eco_champion')
      if (treePlantingCount >= 5) badges.push('tree_planter')
      if (waterSavingCount >= 10) badges.push('water_saver')
      if (carbonSaved >= 50) badges.push('carbon_crusher')
      if (streak >= 30) badges.push('streak_master')

      return {
        id: u.id,
        name: u.name,
        points: u.points || 0,
        totalPointsEarned: u.total_points_earned || 0,
        level: u.level || 1,
        activitiesCompleted: u.activities_completed || 0,
        carbonSaved: Math.round(carbonSaved * 10) / 10,
        treesPlanted,
        streak,
        badges,
        rank: index + 1,
      }
    })

    const userRankObj = leaderboard.find(user => user.id === currentUser.userId)
    const userRank = userRankObj ? userRankObj.rank : null

    // Slice for limit
    const limitedLeaderboard = leaderboard.slice(0, limit)

    return NextResponse.json({
      leaderboard: limitedLeaderboard,
      userRank,
    })

  } catch (error) {
    console.error('Get leaderboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
