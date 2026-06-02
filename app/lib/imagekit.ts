import ImageKit from 'imagekit'

let imagekitInstance: ImageKit | null = null

function getImageKit(): ImageKit {
  if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
    throw new Error('ImageKit environment variables are not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in .env.local')
  }
  if (!imagekitInstance) {
    imagekitInstance = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    })
  }
  return imagekitInstance
}

export function isImageKitConfigured(): boolean {
  return !!(process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT)
}

export interface UploadResponse {
  fileId: string
  name: string
  url: string
  thumbnailUrl: string
  height: number
  width: number
  size: number
  filePath: string
  tags: string[]
  isPrivateFile: boolean
  customCoordinates: string | null
  fileType: string
}

export interface UploadOptions {
  fileName: string
  folder?: string
  tags?: string[]
  isPrivateFile?: boolean
  useUniqueFileName?: boolean
  responseFields?: string[]
}

export async function uploadFile(
  file: Buffer | string,
  options: UploadOptions
): Promise<UploadResponse> {
  try {
    const imagekit = getImageKit()
    const result = await imagekit.upload({
      file,
      fileName: options.fileName,
      folder: options.folder || '/greenify',
      tags: options.tags || [],
      isPrivateFile: options.isPrivateFile || false,
      useUniqueFileName: options.useUniqueFileName !== false,
      responseFields: options.responseFields || [
        'fileId', 'name', 'url', 'thumbnailUrl', 'height', 'width',
        'size', 'filePath', 'tags', 'isPrivateFile', 'customCoordinates', 'fileType',
      ],
    })
    return result as UploadResponse
  } catch (error) {
    console.error('ImageKit upload error:', error)
    throw new Error('Failed to upload file to ImageKit')
  }
}

export async function deleteFile(fileId: string): Promise<void> {
  await getImageKit().deleteFile(fileId)
}

export async function getFileDetails(fileId: string) {
  return getImageKit().getFileDetails(fileId)
}

export function getAuthenticationParameters() {
  const imagekit = getImageKit()
  const token = imagekit.getAuthenticationParameters()
  return {
    signature: token.signature,
    expire: token.expire,
    token: token.token,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
  }
}

export function validateFile(file: File): { isValid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
  ]
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' }
  }
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not supported. Upload JPEG, PNG, WebP, or MP4/WebM/MOV' }
  }
  return { isValid: true }
}

export function getOptimizedUrl(
  url: string,
  transformations?: {
    width?: number
    height?: number
    quality?: number
    format?: 'auto' | 'webp' | 'jpg' | 'png'
    crop?: 'maintain_ratio' | 'force' | 'at_least' | 'at_max'
  }
): string {
  if (!transformations) return url
  const params: string[] = []
  if (transformations.width) params.push(`w-${transformations.width}`)
  if (transformations.height) params.push(`h-${transformations.height}`)
  if (transformations.quality) params.push(`q-${transformations.quality}`)
  if (transformations.format) params.push(`f-${transformations.format}`)
  if (transformations.crop) params.push(`c-${transformations.crop}`)
  if (params.length === 0) return url
  const transformationString = `tr:${params.join(',')}`
  return url.replace(/\/([^/]+)$/, `/${transformationString}/$1`)
}
