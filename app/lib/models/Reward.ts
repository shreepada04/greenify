import mongoose from 'mongoose'

export interface IReward extends mongoose.Document {
  title: string
  description: string
  brand: string
  discountPercentage?: number
  discountAmount?: number
  pointsCost: number
  category: 'food' | 'fashion' | 'electronics' | 'travel' | 'health' | 'entertainment' | 'other'
  imageUrl: string
  termsAndConditions: string
  validUntil: Date
  maxRedemptions: number
  currentRedemptions: number
  isActive: boolean
  shopUrl?: string
  couponPrefix?: string
  howToUse?: string
  createdAt: Date
  updatedAt: Date
}

const RewardSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 500 },
  brand: { type: String, required: true, maxlength: 50 },
  discountPercentage: { type: Number, min: 0, max: 100 },
  discountAmount: { type: Number, min: 0 },
  pointsCost: { type: Number, required: true, min: 1 },
  category: {
    type: String,
    enum: ['food', 'fashion', 'electronics', 'travel', 'health', 'entertainment', 'other'],
    required: true,
  },
  imageUrl: { type: String, required: true },
  termsAndConditions: { type: String, required: true },
  validUntil: { type: Date, required: true },
  maxRedemptions: { type: Number, required: true, min: 1 },
  currentRedemptions: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  shopUrl: { type: String },
  couponPrefix: { type: String },
  howToUse: { type: String },
}, { timestamps: true })

RewardSchema.index({ category: 1, isActive: 1 })
RewardSchema.index({ pointsCost: 1 })
RewardSchema.index({ validUntil: 1 })

export default mongoose.models.Reward || mongoose.model<IReward>('Reward', RewardSchema)
