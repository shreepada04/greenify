import crypto from 'crypto'

export interface GeoPoint {
  latitude: number
  longitude: number
}

export interface ExifGeoData {
  latitude?: number
  longitude?: number
  dateTime?: Date | string
}

export interface MediaVerificationInput {
  contentHash: string
  perceptualHash: string
  exifGeo?: ExifGeoData | null
  deviceLocation?: GeoPoint | null
  captureTimestamp?: number
}

export interface MediaVerificationResult {
  contentHash: string
  perceptualHash: string
  geoVerified: boolean
  geoMatchDistanceMeters: number | null
  captureAgeMinutes: number | null
  captureFresh: boolean
  warnings: string[]
}

export function computeContentHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export function computePerceptualHash(buffer: Buffer): string {
  const sampleSize = 64
  const step = Math.max(1, Math.floor(buffer.length / sampleSize))
  const samples: number[] = []
  for (let i = 0; i < buffer.length && samples.length < sampleSize; i += step) {
    samples.push(buffer[i])
  }
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length
  const bits = samples.map((v) => (v >= avg ? '1' : '0')).join('')
  return crypto.createHash('sha256').update(bits).digest('hex')
}

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180
  const lat1 = (a.latitude * Math.PI) / 180
  const lat2 = (b.latitude * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

const MAX_GEO_DISTANCE_M = 500
const MAX_CAPTURE_AGE_MINUTES = 30

export function verifyMediaMetadata(input: MediaVerificationInput): MediaVerificationResult {
  const warnings: string[] = []
  let geoVerified = false
  let geoMatchDistanceMeters: number | null = null
  let captureAgeMinutes: number | null = null
  let captureFresh = false

  if (input.exifGeo?.latitude != null && input.exifGeo?.longitude != null) {
    if (input.deviceLocation) {
      geoMatchDistanceMeters = distanceMeters(
        { latitude: input.exifGeo.latitude, longitude: input.exifGeo.longitude },
        input.deviceLocation
      )
      geoVerified = geoMatchDistanceMeters <= MAX_GEO_DISTANCE_M
      if (!geoVerified) {
        warnings.push(
          `Photo GPS differs from device location by ${Math.round(geoMatchDistanceMeters)}m`
        )
      }
    } else {
      warnings.push('Photo has GPS but device location was not provided')
    }
  } else {
    warnings.push('No GPS data embedded in photo')
  }

  const captureTs =
    input.captureTimestamp ??
    (input.exifGeo?.dateTime ? new Date(input.exifGeo.dateTime).getTime() : undefined)

  if (captureTs) {
    captureAgeMinutes = (Date.now() - captureTs) / 60000
    captureFresh = captureAgeMinutes <= MAX_CAPTURE_AGE_MINUTES
    if (!captureFresh) {
      warnings.push(`Photo is ${Math.round(captureAgeMinutes)} minutes old`)
    }
  } else {
    warnings.push('Could not verify photo capture time')
  }

  return {
    contentHash: input.contentHash,
    perceptualHash: input.perceptualHash,
    geoVerified,
    geoMatchDistanceMeters,
    captureAgeMinutes,
    captureFresh,
    warnings,
  }
}

export async function verifyImageFromUrl(
  url: string,
  expectedContentHash: string
): Promise<{ hashMatch: boolean; computedHash: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch image from URL')
  const buffer = Buffer.from(await res.arrayBuffer())
  const computedHash = computeContentHash(buffer)
  return { hashMatch: computedHash === expectedContentHash, computedHash }
}

export function computeAuthenticityScore(flags: {
  hashMatch: boolean
  noDuplicate: boolean
  geoVerified: boolean
  captureFresh: boolean
}): number {
  let score = 0
  if (flags.hashMatch) score += 35
  if (flags.noDuplicate) score += 30
  if (flags.geoVerified) score += 20
  if (flags.captureFresh) score += 15
  return score
}
