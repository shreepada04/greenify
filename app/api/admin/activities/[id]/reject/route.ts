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

    const body = await request.json()
    const { reason } = body

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
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

    // Update activity status
    const { data: updatedActivity, error: updateError } = await supabase
      .from('activities')
      .update({
        status: 'rejected',
        verified_by: currentUser.userId,
        verified_at: new Date().toISOString(),
        rejection_reason: reason.trim(),
      })
      .eq('id', activityId)
      .select()
      .maybeSingle()

    if (updateError || !updatedActivity) {
      console.error('Failed to update activity status:', updateError)
      return NextResponse.json({ error: 'Failed to reject activity' }, { status: 500 })
    }

    // Log audit
    const { data: adminUser } = await supabase
      .from('users')
      .select('name')
      .eq('id', currentUser.userId)
      .maybeSingle()

    await createAuditLog({
      eventType: 'activity.rejected',
      actorId: currentUser.userId,
      actorName: adminUser?.name || 'Admin',
      actorRole: 'admin',
      targetType: 'activity',
      targetId: activity.id,
      summary: `Rejected "${activity.title}" (Reason: ${reason.trim()})`,
      metadata: {
        userId: activity.user_id,
        activityTitle: activity.title,
        reason: reason.trim(),
      },
    })

    return NextResponse.json({
      message: 'Activity rejected successfully',
      activity: {
        id: updatedActivity.id,
        status: updatedActivity.status,
        rejectionReason: updatedActivity.rejection_reason,
        verifiedAt: updatedActivity.verified_at,
      }
    })

  } catch (error) {
    console.error('Reject activity error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
