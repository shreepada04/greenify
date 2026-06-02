import mongoose from 'mongoose'

export interface IPartnerClaim extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  partnerId: mongoose.Types.ObjectId
  pointsEarned: number
  status: 'pending' | 'completed'
  claimedAt: Date
}

const PartnerClaimSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    pointsEarned: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'completed' },
    claimedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

PartnerClaimSchema.index({ userId: 1, partnerId: 1, claimedAt: -1 })

export default mongoose.models.PartnerClaim ||
  mongoose.model<IPartnerClaim>('PartnerClaim', PartnerClaimSchema)
