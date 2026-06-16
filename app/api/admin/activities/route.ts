import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type')

    // Build query
    let queryBuilder = supabase
      .from('activities')
      .select('*', { count: 'exact' })

    if (status !== 'all') {
      queryBuilder = queryBuilder.eq('status', status)
    }
    if (type) {
      queryBuilder = queryBuilder.eq('type', type)
    }

    const skip = (page - 1) * limit
    const { data: activities, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1)

    if (error || !activities) {
      console.error('Admin activities query error:', error)
      return NextResponse.json({ error: 'Failed to retrieve activities' }, { status: 500 })
    }

    // Collect all user IDs involved
    const userIds = new Set<string>()
    activities.forEach(a => {
      if (a.user_id) userIds.add(a.user_id)
      if (a.verified_by) userIds.add(a.verified_by)
    })

    const userIdsArray = Array.from(userIds)
    const usersMap: Record<string, { id: string; name: string; email: string }> = {}

    if (userIdsArray.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIdsArray)

      if (usersData) {
        usersData.forEach(u => {
          usersMap[u.id] = u
        })
      }
    }

    // Transform activities
    const transformedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      pointsEarned: activity.points_earned,
      quantity: activity.quantity,
      unit: activity.unit,
      verificationMedia: activity.verification_media,
      location: activity.location,
      status: activity.status,
      carbonSaved: activity.carbon_saved,
      submittedAt: activity.submitted_at,
      verifiedAt: activity.verified_at,
      verifiedBy: activity.verified_by ? usersMap[activity.verified_by] || null : null,
      rejectionReason: activity.rejection_reason,
      mediaVerification: activity.media_verification,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
      user: activity.user_id ? usersMap[activity.user_id] || null : null,
    }))

    // Get counts for admin stats sidebar
    const { count: pendingCount } = await supabase.from('activities').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: approvedCount } = await supabase.from('activities').select('id', { count: 'exact', head: true }).eq('status', 'approved')
    const { count: rejectedCount } = await supabase.from('activities').select('id', { count: 'exact', head: true }).eq('status', 'rejected')

    const total = count || 0
    const pages = Math.ceil(total / limit)

    return NextResponse.json({
      activities: transformedActivities,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
      stats: {
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0,
      }
    })

  } catch (error) {
    console.error('Get admin activities error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
