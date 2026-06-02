import mongoose from 'mongoose'

export interface IMediaFingerprint extends mongoose.Document {
  contentHash: string
  perceptualHash: string
  userId: mongoose.Types.ObjectId
  activityId?: mongoose.Types.ObjectId
  fileId?: string
  url?: string
  exifLatitude?: number
  exifLongitude?: number
  captureTimestamp?: number
  usedAt: Date
}

const MediaFingerprintSchema = new mongoose.Schema(
  {
    contentHash: { type: String, required: true, index: true, unique: true },
    perceptualHash: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity' },
    fileId: String,
    url: String,
    exifLatitude: Number,
    exifLongitude: Number,
    captureTimestamp: Number,
    usedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

MediaFingerprintSchema.index({ perceptualHash: 1 })

export default mongoose.models.MediaFingerprint ||
  mongoose.model<IMediaFingerprint>('MediaFingerprint', MediaFingerprintSchema)
