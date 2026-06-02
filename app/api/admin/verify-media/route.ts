import { NextRequest, NextResponse } from 'next/server'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import Activity from '@/app/lib/models/Activity'
import MediaFingerprint from '@/app/lib/models/MediaFingerprint'
import { verifyAccessToken } from '@/app/lib/jwt'
import {
  verifyImageFromUrl,
  computeAuthenticityScore,
} from '@/app/lib/mediaVerification'

export async function POST(request: NextRequest) {
  try {
    await dbConnectSimple()

    const accessToken = request.cookies.get('accessToken')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const admin = verifyAccessToken(accessToken)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { activityId } = await request.json()
    if (!activityId) {
      return NextResponse.json({ error: 'activityId required' }, { status: 400 })
    }

    const activity = await Activity.findById(activityId)
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const mediaResults: Array<{
      url: string
      filename: string
      contentHash: string
      hashMatch: boolean
      computedHash?: string
      duplicateInDb: boolean
      similarHashFound: boolean
      geoVerified: boolean
      captureFresh: boolean
      warnings: string[]
    }> = []

    let allHashMatch = true
    let noDuplicate = true

    for (const media of activity.verificationMedia) {
      const contentHash = media.contentHash || ''
      const warnings: string[] = [...(media.verificationWarnings || [])]

      let hashMatch = false
      let computedHash: string | undefined

      if (media.url && contentHash && media.type === 'image') {
        try {
          const result = await verifyImageFromUrl(media.url, contentHash)
          hashMatch = result.hashMatch
          computedHash = result.computedHash
          if (!hashMatch) {
            warnings.push('CDN image hash does not match submitted hash — possible tampering')
            allHashMatch = false
          }
        } catch {
          warnings.push('Could not re-verify image from CDN')
          allHashMatch = false
        }
      }

      const dup = contentHash
        ? await MediaFingerprint.findOne({ contentHash })
        : null
      const duplicateInDb = !!dup && dup.activityId?.toString() !== activityId

      let similarHashFound = false
      if (media.perceptualHash) {
        const similar = await MediaFingerprint.find({
          perceptualHash: media.perceptualHash,
          contentHash: { $ne: contentHash },
        }).limit(1)
        similarHashFound = similar.length > 0
        if (similarHashFound) {
          warnings.push('Similar perceptual hash found on another submission')
          noDuplicate = false
        }
      }

      if (duplicateInDb) {
        warnings.push('Exact duplicate hash exists from another submission')
        noDuplicate = false
      }

      mediaResults.push({
        url: media.url,
        filename: media.filename,
        contentHash,
        hashMatch,
        computedHash,
        duplicateInDb,
        similarHashFound,
        geoVerified: !!media.geoVerified,
        captureFresh: !!media.captureFresh,
        warnings,
      })
    }

    const geoVerified = activity.mediaVerification?.geoVerified ?? false
    const captureFresh = activity.mediaVerification?.captureFresh ?? false

    const authenticityScore = computeAuthenticityScore({
      hashMatch: allHashMatch,
      noDuplicate,
      geoVerified,
      captureFresh,
    })

    activity.mediaVerification = {
      allHashesUnique: noDuplicate,
      geoVerified,
      captureFresh,
      authenticityScore,
      adminHashVerified: allHashMatch,
      adminNotes: allHashMatch && noDuplicate ? 'Automated hash verification passed' : 'Review warnings before approving',
    }
    await activity.save()

    return NextResponse.json({
      activityId,
      authenticityScore,
      adminHashVerified: allHashMatch,
      allHashesUnique: noDuplicate,
      mediaResults,
      recommendation:
        authenticityScore >= 80
          ? 'Likely authentic — safe to approve'
          : authenticityScore >= 50
            ? 'Manual review recommended'
            : 'High fraud risk — reject or request new photos',
    })
  } catch (error) {
    console.error('Admin verify-media error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
