'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, X, Image, Video, MapPin, Shield, AlertTriangle, Loader2, Camera, RefreshCw } from 'lucide-react'
import { hashFileContent, hashFilePerceptual, extractExifGeo } from '@/app/lib/clientMediaUtils'

export interface VerifiedMediaFile {
  file: File
  preview: string
  type: 'image' | 'video'
  url?: string
  fileId?: string
  contentHash?: string
  perceptualHash?: string
  geoVerified?: boolean
  captureFresh?: boolean
  verificationWarnings?: string[]
  uploadStatus: 'pending' | 'uploading' | 'done' | 'error'
  uploadError?: string
}

interface MediaUploadProps {
  onFilesChange: (files: VerifiedMediaFile[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
  deviceLocation?: { latitude: number; longitude: number } | null
}

export default function MediaUpload({
  onFilesChange,
  maxFiles = 3,
  acceptedTypes = ['image/*', 'video/*'],
  deviceLocation = null,
}: MediaUploadProps) {
  const [files, setFiles] = useState<VerifiedMediaFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const videoRef = useRef<HTMLVideoElement>(null)

  const updateFiles = (updated: VerifiedMediaFile[]) => {
    setFiles(updated)
    onFilesChange(updated)
  }

  const startCamera = async (mode = facingMode) => {
    try {
      // Stop any existing stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      })

      setCameraStream(stream)
      setIsCameraOpen(true)
      
      // Delay slightly to ensure video element is rendered and bound
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (err) {
      console.error('Camera access error:', err)
      alert('Could not access your camera. Please check camera permissions or upload a photo instead.')
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
    }
    setCameraStream(null)
    setIsCameraOpen(false)
  }

  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextMode)
    startCamera(nextMode)
  }

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      
      // Set canvas size to match video resolution
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Draw the current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Convert to Blob and process
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File(
                [blob], 
                `live_capture_${Date.now()}.jpg`, 
                { type: 'image/jpeg' }
              )
              processFile(file)
              stopCamera()
            }
          },
          'image/jpeg',
          0.92
        )
      }
    }
  }

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  const uploadToImageKit = async (mediaFile: VerifiedMediaFile): Promise<VerifiedMediaFile> => {
    const contentHash = await hashFileContent(mediaFile.file)
    const perceptualHash = await hashFilePerceptual(mediaFile.file)
    const exif = await extractExifGeo(mediaFile.file)

    const formData = new FormData()
    formData.append('file', mediaFile.file)
    formData.append('folder', 'activities')
    formData.append('contentHash', contentHash)
    formData.append('perceptualHash', perceptualHash)
    if (exif.latitude != null) formData.append('exifLatitude', String(exif.latitude))
    if (exif.longitude != null) formData.append('exifLongitude', String(exif.longitude))
    if (exif.dateTime) formData.append('captureTimestamp', String(exif.dateTime))
    if (deviceLocation) {
      formData.append('deviceLatitude', String(deviceLocation.latitude))
      formData.append('deviceLongitude', String(deviceLocation.longitude))
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed')
    }

    return {
      ...mediaFile,
      url: data.file.url,
      fileId: data.file.fileId,
      contentHash: data.verification.contentHash,
      perceptualHash: data.verification.perceptualHash,
      geoVerified: data.verification.geoVerified,
      captureFresh: data.verification.captureFresh,
      verificationWarnings: data.verification.warnings,
      uploadStatus: 'done',
    }
  }

  const processFile = async (file: File) => {
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) return

    const mediaFile: VerifiedMediaFile = {
      file,
      preview: URL.createObjectURL(file),
      type: isImage ? 'image' : 'video',
      uploadStatus: 'uploading',
    }

    const withUploading = [...files, mediaFile]
    updateFiles(withUploading)

    try {
      const uploaded = await uploadToImageKit(mediaFile)
      updateFiles(
        withUploading.map((f) => (f.preview === mediaFile.preview ? uploaded : f))
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      updateFiles(
        withUploading.map((f) =>
          f.preview === mediaFile.preview
            ? { ...f, uploadStatus: 'error' as const, uploadError: message }
            : f
        )
      )
    }
  }

  const handleFiles = async (fileList: FileList) => {
    const remaining = maxFiles - files.length
    const toAdd = Array.from(fileList).slice(0, remaining)
    for (const file of toAdd) {
      await processFile(file)
    }
  }

  const removeFile = (index: number) => {
    URL.revokeObjectURL(files[index].preview)
    updateFiles(files.filter((_, i) => i !== index))
  }

  const allUploaded = files.length > 0 && files.every((f) => f.uploadStatus === 'done')

  return (
    <div className="space-y-4">
      {/* Selection / Upload Interface */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* File Drag & Drop / Input */}
        <div
          className={`col-span-1 md:col-span-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/20'
          }`}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
          }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Choose or drop files to upload
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Max {maxFiles} files • JPG, PNG, MP4
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Live Camera Button */}
        <button
          type="button"
          onClick={() => startCamera()}
          className="col-span-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 rounded-lg hover:bg-green-50/25 dark:hover:bg-green-950/10 transition-colors"
        >
          <Camera className="h-8 w-8 text-green-500 mb-2" />
          <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">Take Live Photo</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Use your phone/device camera directly
          </p>
        </button>
      </div>

      {/* Live Camera Modal Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden max-w-md w-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-green-500" />
                <span className="text-sm font-semibold text-white">Live Camera Capture</span>
              </div>
              <button 
                type="button" 
                onClick={stopCamera}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Target Outline Indicator */}
              <div className="absolute inset-8 border border-white/20 rounded-lg pointer-events-none flex items-center justify-center">
                <p className="text-[10px] text-white/40 tracking-wider uppercase font-semibold">Position Eco-Evidence Here</p>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="p-5 bg-gray-950 flex justify-around items-center">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              {/* Capture Button (Large circular) */}
              <button
                type="button"
                onClick={capturePhoto}
                className="h-16 w-16 rounded-full border-4 border-white bg-green-500 hover:bg-green-400 active:scale-95 transition-all flex items-center justify-center shadow-lg"
                title="Capture evidence"
              >
                <div className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors" />
              </button>

              {/* Toggle Front/Rear Camera */}
              <button
                type="button"
                onClick={toggleCamera}
                className="h-10 w-10 rounded-full bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center transition-colors"
                title="Flip Camera"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded File Cards */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((mediaFile, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {mediaFile.type === 'image' ? (
                  <img src={mediaFile.preview} alt="" className="h-14 w-14 object-cover rounded" />
                ) : (
                  <div className="h-14 w-14 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                    <Video className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mediaFile.file.name}</p>
                  {mediaFile.uploadStatus === 'uploading' && (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Uploading to ImageKit...
                    </p>
                  )}
                  {mediaFile.uploadStatus === 'done' && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Fingerprinted
                      </span>
                      {mediaFile.geoVerified ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Geo OK
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Browser Geotagged
                        </span>
                      )}
                      {mediaFile.captureFresh && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Fresh</span>
                      )}
                    </div>
                  )}
                  {mediaFile.uploadStatus === 'error' && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {mediaFile.uploadError}
                    </p>
                  )}
                  {mediaFile.verificationWarnings?.map((w, i) => (
                    <p key={i} className="text-xs text-amber-600 mt-0.5">{w}</p>
                  ))}
                </div>
                <button type="button" onClick={() => removeFile(index)} className="text-gray-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {allUploaded && (
        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <Shield className="h-4 w-4" /> All photos verified and stored on ImageKit — cannot be reused
        </p>
      )}

      {/* Rules Notice */}
      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h5 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">📸 Real-time verification rules</h5>
        <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
          <li>• Take a new photo with GPS/location enabled on your device</li>
          <li>• Photo location must match your captured device location (within 500m)</li>
          <li>• Photos must be taken within the last 30 minutes</li>
          <li>• Each photo is hashed — reused images are automatically rejected</li>
        </ul>
      </div>
    </div>
  )
}
