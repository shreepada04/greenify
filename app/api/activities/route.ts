import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/jwt'
import { computeAuthenticityScore } from '@/app/lib/mediaVerification'

const ACTIVITY_POINTS = {
  recycling: 10,
  water_saving: 15,
  energy_saving: 20,
  transportation: 25,
  tree_planting: 50,
  waste_reduction: 12,
}

function calculateCarbonSaved(activityType: string, quantity: number): number {
  const carbonSavings: Record<string, number> = {
    recycling: 2.5,
    water_saving: 1.8,
    energy_saving: 3.2,
    transportation: 4.5,
    tree_planting: 22.0,
    waste_reduction: 1.5,
  }
  return (carbonSavings[activityType] || 1.0) * quantity
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = requireAuth(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, title, description, quantity, unit, verificationMedia, location } = body

    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'Type, title, and description are required' },
        { status: 400 }
      )
    }

    if (!ACTIVITY_POINTS[type as keyof typeof ACTIVITY_POINTS]) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 })
    }

    if (!verificationMedia || verificationMedia.length === 0) {
      return NextResponse.json(
        { error: 'At least one photo or video is required for verification' },
        { status: 400 }
      )
    }

    if (verificationMedia.length > 3) {
      return NextResponse.json({ error: 'Maximum 3 files allowed' }, { status: 400 })
    }

    if (!location?.latitude || !location?.longitude || !location?.address) {
      return NextResponse.json(
        { error: 'Complete location data is required' },
        { status: 400 }
      )
    }

    const hashes = verificationMedia
      .map((m: { contentHash?: string }) => m.contentHash)
      .filter(Boolean) as string[]

    if (hashes.length !== verificationMedia.length) {
      return NextResponse.json(
        { error: 'All media must be uploaded through ImageKit with verification hashes' },
        { status: 400 }
      )
    }

    const uniqueHashes = new Set(hashes)
    if (uniqueHashes.size !== hashes.length) {
      return NextResponse.json({ error: 'Duplicate photos in submission' }, { status: 400 })
    }

    // Check media fingerprints for duplicates in Supabase
    const { data: existingFingerprints, error: fingerError } = await supabase
      .from('media_fingerprints')
      .select('content_hash')
      .in('content_hash', hashes)

    if (existingFingerprints && existingFingerprints.length > 0) {
      return NextResponse.json(
        {
          error: 'One or more photos have already been used. Each photo can only be submitted once.',
          duplicate: true,
        },
        { status: 409 }
      )
    }

    let pointsEarned = ACTIVITY_POINTS[type as keyof typeof ACTIVITY_POINTS]
    if (quantity && quantity > 1) {
      pointsEarned = Math.min(pointsEarned * quantity, pointsEarned * 5)
    }

    const carbonSaved = calculateCarbonSaved(type, quantity || 1)

    const allGeoVerified = verificationMedia.every((m: { geoVerified?: boolean }) => m.geoVerified)
    const allCaptureFresh = verificationMedia.every((m: { captureFresh?: boolean }) => m.captureFresh)

    const authenticityScore = computeAuthenticityScore({
      hashMatch: true,
      noDuplicate: true,
      geoVerified: allGeoVerified,
      captureFresh: allCaptureFresh,
    })

    // Insert activity into Supabase
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        user_id: currentUser.userId,
        type,
        title,
        description,
        quantity: quantity || null,
        unit: unit || null,
        points_earned: pointsEarned,
        verification_media: verificationMedia,
        location,
        carbon_saved: carbonSaved,
        status: 'pending',
        media_verification: {
          allHashesUnique: true,
          geoVerified: allGeoVerified,
          captureFresh: allCaptureFresh,
          authenticityScore,
        },
      })
      .select()
      .maybeSingle()

    if (activityError || !activity) {
      console.error('Create activity error:', activityError)
      return NextResponse.json({ error: 'Failed to submit activity' }, { status: 500 })
    }

    // Insert media fingerprints
    const fingerprintsToInsert = verificationMedia
      .filter((m: any) => m.contentHash)
      .map((media: any) => ({
        content_hash: media.contentHash,
        perceptual_hash: media.perceptualHash || media.contentHash,
        user_id: currentUser.userId,
        activity_id: activity.id,
        url: media.url,
      }))

    if (fingerprintsToInsert.length > 0) {
      const { error: insertFingerError } = await supabase
        .from('media_fingerprints')
        .insert(fingerprintsToInsert)

      if (insertFingerError) {
        console.error('Failed to create media fingerprints:', insertFingerError)
      }
    }

    return NextResponse.json({
      message: 'Activity submitted successfully! Pending admin verification.',
      activity: {
        id: activity.id,
        type: activity.type,
        title: activity.title,
        status: activity.status,
        pointsEarned: activity.points_earned,
        carbonSaved: activity.carbon_saved,
        authenticityScore,
        submittedAt: activity.submitted_at,
      },
      notice: 'Points will be awarded once approved. Photos are fingerprinted and cannot be reused.',
    })
  } catch (error) {
    console.error('Log activity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = requireAuth(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    let queryBuilder = supabase
      .from('activities')
      .select('*', { count: 'exact' })
      .eq('user_id', currentUser.userId)

    if (status) {
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
      console.error('Get activities query error:', error)
      return NextResponse.json({ error: 'Failed to retrieve activities' }, { status: 500 })
    }

    // Fetch verifiedBy users to populate name & email
    const verifiedByIds = Array.from(new Set(activities.map(a => a.verified_by).filter(Boolean)))
    const usersMap: Record<string, { id: string; name: string; email: string }> = {}
    
    if (verifiedByIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', verifiedByIds)
      
      if (usersData) {
        usersData.forEach(u => {
          usersMap[u.id] = u
        })
      }
    }

    const transformedActivities = activities.map((activity) => ({
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
      mediaVerification: activity.media_verification,
      submittedAt: activity.submitted_at,
      verifiedAt: activity.verified_at,
      verifiedBy: activity.verified_by ? usersMap[activity.verified_by] || null : null,
      rejectionReason: activity.rejection_reason,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
    }))

    const total = count || 0
    const pages = Math.ceil(total / limit)

    return NextResponse.json({
      activities: transformedActivities,
      pagination: { page, limit, total, pages, hasNext: page < pages, hasPrev: page > 1 },
    })
  } catch (error) {
    console.error('Get activities error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
