import { NextRequest, NextResponse } from 'next/server'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import Activity from '@/app/lib/models/Activity'
import MediaFingerprint from '@/app/lib/models/MediaFingerprint'
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
    await dbConnectSimple()

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

    for (const hash of hashes) {
      const existing = await MediaFingerprint.findOne({ contentHash: hash })
      if (existing) {
        return NextResponse.json(
          {
            error: 'One or more photos have already been used. Each photo can only be submitted once.',
            duplicate: true,
          },
          { status: 409 }
        )
      }
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

    const activity = await Activity.create({
      userId: currentUser.userId,
      type,
      title,
      description,
      quantity,
      unit,
      pointsEarned,
      verificationMedia,
      location,
      carbonSaved,
      status: 'pending',
      submittedAt: new Date(),
      mediaVerification: {
        allHashesUnique: true,
        geoVerified: allGeoVerified,
        captureFresh: allCaptureFresh,
        authenticityScore,
      },
    })

    for (const media of verificationMedia) {
      if (media.contentHash) {
        await MediaFingerprint.create({
          contentHash: media.contentHash,
          perceptualHash: media.perceptualHash || media.contentHash,
          userId: currentUser.userId,
          activityId: activity._id,
          fileId: media.fileId,
          url: media.url,
          usedAt: new Date(),
        })
      }
    }

    return NextResponse.json({
      message: 'Activity submitted successfully! Pending admin verification.',
      activity: {
        id: activity._id.toString(),
        type: activity.type,
        title: activity.title,
        status: activity.status,
        pointsEarned: activity.pointsEarned,
        carbonSaved: activity.carbonSaved,
        authenticityScore,
        submittedAt: activity.submittedAt,
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
    await dbConnectSimple()

    const currentUser = requireAuth(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const query: Record<string, unknown> = { userId: currentUser.userId }
    if (status) query.status = status
    if (type) query.type = type

    const skip = (page - 1) * limit
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('verifiedBy', 'name email')

    const total = await Activity.countDocuments(query)
    const pages = Math.ceil(total / limit)

    const transformedActivities = activities.map((activity) => ({
      id: activity._id.toString(),
      type: activity.type,
      title: activity.title,
      description: activity.description,
      pointsEarned: activity.pointsEarned,
      quantity: activity.quantity,
      unit: activity.unit,
      verificationMedia: activity.verificationMedia,
      location: activity.location,
      status: activity.status,
      carbonSaved: activity.carbonSaved,
      mediaVerification: activity.mediaVerification,
      submittedAt: activity.submittedAt,
      verifiedAt: activity.verifiedAt,
      verifiedBy: activity.verifiedBy,
      rejectionReason: activity.rejectionReason,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    }))

    return NextResponse.json({
      activities: transformedActivities,
      pagination: { page, limit, total, pages, hasNext: page < pages, hasPrev: page > 1 },
    })
  } catch (error) {
    console.error('Get activities error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
