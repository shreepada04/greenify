import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

const badgeDefinitions = {
  first_activity: {
    id: 'first_activity',
    name: 'First Steps',
    description: 'Complete your first eco-friendly activity',
    icon: '🌱',
    color: 'green',
    requirement: 'Complete 1 activity'
  },
  recycling_hero: {
    id: 'recycling_hero',
    name: 'Recycling Hero',
    description: 'Complete 5 recycling activities',
    icon: '♻️',
    color: 'blue',
    requirement: 'Complete 5 recycling activities'
  },
  week_warrior: {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day activity streak',
    icon: '🔥',
    color: 'orange',
    requirement: '7-day streak'
  },
  eco_champion: {
    id: 'eco_champion',
    name: 'Eco Champion',
    description: 'Earn 1000+ total points',
    icon: '🏆',
    color: 'gold',
    requirement: '1000+ total points'
  },
  tree_planter: {
    id: 'tree_planter',
    name: 'Tree Planter',
    description: 'Plant 5 trees',
    icon: '🌳',
    color: 'green',
    requirement: 'Plant 5 trees'
  },
  water_saver: {
    id: 'water_saver',
    name: 'Water Saver',
    description: 'Complete 10 water saving activities',
    icon: '💧',
    color: 'blue',
    requirement: '10 water saving activities'
  },
  carbon_crusher: {
    id: 'carbon_crusher',
    name: 'Carbon Crusher',
    description: 'Save 50kg of CO2',
    icon: '🌍',
    color: 'green',
    requirement: 'Save 50kg CO2'
  },
  streak_master: {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Achieve a 30-day streak',
    icon: '⚡',
    color: 'yellow',
    requirement: '30-day streak'
  }
}

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = verifyAccessToken(accessToken)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user and activities from Supabase
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.userId)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: userActs } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', currentUser.userId)
      .eq('status', 'approved')

    const approvedActs = userActs || []

    // Calculate metrics
    const activitiesCompleted = user.activities_completed || 0
    const totalPointsEarned = user.total_points_earned || 0
    const carbonSaved = approvedActs.reduce((acc, act) => acc + (Number(act.carbon_saved) || 0), 0)
    const recyclingCount = approvedActs.filter(a => a.type === 'recycling').length
    const waterSavingCount = approvedActs.filter(a => a.type === 'water_saving').length
    const treePlantingCount = approvedActs.filter(a => a.type === 'tree_planting').length

    // Sort to calculate streak
    const sortedActs = [...approvedActs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const streak = calculateStreak(sortedActs)

    // Check which badges are earned
    const earnedBadgesIds: string[] = []
    if (activitiesCompleted >= 1) earnedBadgesIds.push('first_activity')
    if (recyclingCount >= 5) earnedBadgesIds.push('recycling_hero')
    if (streak >= 7) earnedBadgesIds.push('week_warrior')
    if (totalPointsEarned >= 1000) earnedBadgesIds.push('eco_champion')
    if (treePlantingCount >= 5) earnedBadgesIds.push('tree_planter')
    if (waterSavingCount >= 10) earnedBadgesIds.push('water_saver')
    if (carbonSaved >= 50) earnedBadgesIds.push('carbon_crusher')
    if (streak >= 30) earnedBadgesIds.push('streak_master')

    const userBadges = earnedBadgesIds.map(id => badgeDefinitions[id as keyof typeof badgeDefinitions])

    return NextResponse.json({
      userBadges,
      allBadges: badgeDefinitions,
      earnedCount: userBadges.length,
      totalCount: Object.keys(badgeDefinitions).length
    })

  } catch (error) {
    console.error('Get badges error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
