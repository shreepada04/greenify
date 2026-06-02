import { NextRequest, NextResponse } from 'next/server'
import {
  uploadFile,
  validateFile,
  getAuthenticationParameters,
  isImageKitConfigured,
} from '@/app/lib/imagekit'
import {
  computeContentHash,
  computePerceptualHash,
  verifyMediaMetadata,
} from '@/app/lib/mediaVerification'
import MediaFingerprint from '@/app/lib/models/MediaFingerprint'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import { requireAuth } from '@/app/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const currentUser = requireAuth(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isImageKitConfigured()) {
      return NextResponse.json(
        { error: 'ImageKit is not configured. Add IMAGEKIT_* keys to .env.local' },
        { status: 503 }
      )
    }

    await dbConnectSimple()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'activities'
    const exifLat = formData.get('exifLatitude')
    const exifLng = formData.get('exifLongitude')
    const captureTimestamp = formData.get('captureTimestamp')
    const deviceLat = formData.get('deviceLatitude')
    const deviceLng = formData.get('deviceLongitude')
    const clientContentHash = formData.get('contentHash') as string | null
    const clientPerceptualHash = formData.get('perceptualHash') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const validation = validateFile(file)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const contentHash = computeContentHash(buffer)
    const perceptualHash = computePerceptualHash(buffer)

    if (clientContentHash && clientContentHash !== contentHash) {
      return NextResponse.json(
        { error: 'File integrity check failed — re-upload the original photo' },
        { status: 400 }
      )
    }

    const existing = await MediaFingerprint.findOne({ contentHash })
    if (existing) {
      return NextResponse.json(
        {
          error: 'This photo has already been used and cannot be submitted again',
          duplicate: true,
          usedAt: existing.usedAt,
        },
        { status: 409 }
      )
    }

    const exifGeo =
      exifLat != null && exifLng != null
        ? {
            latitude: parseFloat(String(exifLat)),
            longitude: parseFloat(String(exifLng)),
            dateTime: captureTimestamp ? new Date(Number(captureTimestamp)) : undefined,
          }
        : null

    const deviceLocation =
      deviceLat != null && deviceLng != null
        ? {
            latitude: parseFloat(String(deviceLat)),
            longitude: parseFloat(String(deviceLng)),
          }
        : null

    const verification = verifyMediaMetadata({
      contentHash,
      perceptualHash: clientPerceptualHash || perceptualHash,
      exifGeo,
      deviceLocation,
      captureTimestamp: captureTimestamp ? Number(captureTimestamp) : undefined,
    })

    const uploadResult = await uploadFile(buffer, {
      fileName: file.name,
      folder: `/greenify/${folder}`,
      tags: [`user_${currentUser.userId}`, folder, 'verified_upload'],
      useUniqueFileName: true,
    })

    return NextResponse.json({
      success: true,
      file: {
        fileId: uploadResult.fileId,
        name: uploadResult.name,
        url: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        size: uploadResult.size,
        fileType: uploadResult.fileType,
        filePath: uploadResult.filePath,
      },
      verification: {
        contentHash,
        perceptualHash,
        geoVerified: verification.geoVerified,
        captureFresh: verification.captureFresh,
        warnings: verification.warnings,
        geoMatchDistanceMeters: verification.geoMatchDistanceMeters,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = requireAuth(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isImageKitConfigured()) {
      return NextResponse.json({ configured: false }, { status: 200 })
    }
    const authParams = getAuthenticationParameters()
    return NextResponse.json({ configured: true, ...authParams })
  } catch (error) {
    console.error('Get auth params error:', error)
    return NextResponse.json({ error: 'Failed to get authentication parameters' }, { status: 500 })
  }
}
