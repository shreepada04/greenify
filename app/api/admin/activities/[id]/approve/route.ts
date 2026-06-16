import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'
import { createAuditLog } from '@/app/lib/auditLog'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get access token from cookies
    const accessToken = request.cookies.get('accessToken')?.value
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token found' },
        { status: 401 }
      )
    }

    // Verify the token
    const currentUser = verifyAccessToken(accessToken)
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const activityId = params.id

    // Find the activity
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .maybeSingle()

    if (activityError || !activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }

    if (activity.status !== 'pending') {
      return NextResponse.json(
        { error: 'Activity has already been processed' },
        { status: 400 }
      )
    }

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', activity.user_id)
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User associated with activity not found' },
        { status: 404 }
      )
    }

    // Update activity status
    const { data: updatedActivity, error: updateActError } = await supabase
      .from('activities')
      .update({
        status: 'approved',
        verified_by: currentUser.userId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', activityId)
      .select()
      .maybeSingle()

    if (updateActError || !updatedActivity) {
      console.error('Failed to update activity status:', updateActError)
      return NextResponse.json({ error: 'Failed to approve activity' }, { status: 500 })
    }

    // Award points to user
    const newPoints = user.points + activity.points_earned
    const newTotal = user.total_points_earned + activity.points_earned
    const newActivitiesCount = user.activities_completed + 1
    const newLevel = Math.floor(newTotal / 100) + 1

    const { data: updatedUser, error: updateUserError } = await supabase
      .from('users')
      .update({
        points: newPoints,
        total_points_earned: newTotal,
        activities_completed: newActivitiesCount,
        level: newLevel,
      })
      .eq('id', user.id)
      .select()
      .maybeSingle()

    if (updateUserError || !updatedUser) {
      console.error('Failed to update user points:', updateUserError)
      // Rollback activity update if possible, though not strictly required, let's keep robust
      await supabase
        .from('activities')
        .update({
          status: 'pending',
          verified_by: null,
          verified_at: null,
        })
        .eq('id', activityId)

      return NextResponse.json({ error: 'Failed to update user points' }, { status: 500 })
    }

    // Log audit
    const { data: adminUser } = await supabase
      .from('users')
      .select('name')
      .eq('id', currentUser.userId)
      .maybeSingle()

    await createAuditLog({
      eventType: 'activity.approved',
      actorId: currentUser.userId,
      actorName: adminUser?.name || 'Admin',
      actorRole: 'admin',
      targetType: 'activity',
      targetId: activity.id,
      summary: `Approved "${activity.title}" for ${user.name} (+${activity.points_earned} pts)`,
      metadata: {
        pointsAwarded: activity.points_earned,
        userId: user.id,
        activityTitle: activity.title,
      },
    })

    return NextResponse.json({
      message: 'Activity approved successfully',
      activity: {
        id: updatedActivity.id,
        status: updatedActivity.status,
        pointsEarned: updatedActivity.points_earned,
        verifiedAt: updatedActivity.verified_at,
      },
      pointsAwarded: updatedActivity.points_earned,
      userStats: {
        totalPoints: updatedUser.points,
        level: updatedUser.level,
        activitiesCompleted: updatedUser.activities_completed,
      }
    })

  } catch (error) {
    console.error('Approve activity error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
