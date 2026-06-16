import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

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

    const leaderboard = users.map((u, index) => ({
      id: u.id,
      name: u.name,
      points: u.points,
      totalPointsEarned: u.total_points_earned,
      level: u.level,
      activitiesCompleted: u.activities_completed,
      rank: index + 1,
    }))

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
