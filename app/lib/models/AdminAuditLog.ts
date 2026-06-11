import mongoose from 'mongoose'

export type AuditEventType =
  | 'user.registered'
  | 'activity.submitted'
  | 'activity.approved'
  | 'activity.rejected'
  | 'media.verified'
  | 'reward.redeemed'
  | 'system.seed'

export interface IAdminAuditLog extends mongoose.Document {
  eventType: AuditEventType
  actorId?: mongoose.Types.ObjectId
  actorName: string
  actorRole: 'admin' | 'user' | 'system'
  targetType?: 'user' | 'activity' | 'reward' | 'media'
  targetId?: mongoose.Types.ObjectId
  summary: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

const AdminAuditLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        'user.registered',
        'activity.submitted',
        'activity.approved',
        'activity.rejected',
        'media.verified',
        'reward.redeemed',
        'system.seed',
      ],
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    actorName: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      enum: ['admin', 'user', 'system'],
      default: 'system',
    },
    targetType: {
      type: String,
      enum: ['user', 'activity', 'reward', 'media'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    summary: {
      type: String,
      required: true,
      maxlength: 500,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

AdminAuditLogSchema.index({ createdAt: -1 })
AdminAuditLogSchema.index({ eventType: 1, createdAt: -1 })

export default mongoose.models.AdminAuditLog ||
  mongoose.model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema)
