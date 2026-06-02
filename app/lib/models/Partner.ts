import mongoose from 'mongoose'

export interface IPartner extends mongoose.Document {
  name: string
  slug: string
  description: string
  logoUrl: string
  brandColor: string
  websiteUrl: string
  category: 'shopping' | 'food' | 'travel' | 'electronics' | 'fashion' | 'other'
  pointsReward: number
  actionLabel: string
  featured: boolean
  active: boolean
}

const PartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    logoUrl: { type: String, required: true },
    brandColor: { type: String, default: '#22c55e' },
    websiteUrl: { type: String, required: true },
    category: {
      type: String,
      enum: ['shopping', 'food', 'travel', 'electronics', 'fashion', 'other'],
      default: 'shopping',
    },
    pointsReward: { type: Number, required: true, min: 1 },
    actionLabel: { type: String, default: 'Shop & Earn' },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export default mongoose.models.Partner ||
  mongoose.model<IPartner>('Partner', PartnerSchema)
