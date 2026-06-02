'use client'

/** Client-side SHA-256 hex of file bytes */
export async function hashFileContent(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Lightweight perceptual fingerprint on client */
export async function hashFilePerceptual(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const view = new Uint8Array(buffer)
  const sampleSize = 64
  const step = Math.max(1, Math.floor(view.length / sampleSize))
  const samples: number[] = []
  for (let i = 0; i < view.length && samples.length < sampleSize; i += step) {
    samples.push(view[i])
  }
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length
  const bits = samples.map((v) => (v >= avg ? '1' : '0')).join('')
  const enc = new TextEncoder().encode(bits)
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface ExifResult {
  latitude?: number
  longitude?: number
  dateTime?: number
}

export async function extractExifGeo(file: File): Promise<ExifResult> {
  if (!file.type.startsWith('image/')) return {}
  try {
    const exifr = await import('exifr')
    const gps = await exifr.gps(file)
    const exif = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate'])
    const dt = exif?.DateTimeOriginal || exif?.CreateDate
    return {
      latitude: gps?.latitude,
      longitude: gps?.longitude,
      dateTime: dt ? new Date(dt).getTime() : undefined,
    }
  } catch {
    return {}
  }
}
