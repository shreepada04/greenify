import AdminAuditLog, { AuditEventType } from '@/app/lib/models/AdminAuditLog'
import mongoose from 'mongoose'

interface CreateAuditLogInput {
  eventType: AuditEventType
  actorId?: string | mongoose.Types.ObjectId
  actorName: string
  actorRole?: 'admin' | 'user' | 'system'
  targetType?: 'user' | 'activity' | 'reward' | 'media'
  targetId?: string | mongoose.Types.ObjectId
  summary: string
  metadata?: Record<string, unknown>
}

export async function createAuditLog(input: CreateAuditLogInput) {
  try {
    await AdminAuditLog.create({
      eventType: input.eventType,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: input.actorRole ?? 'system',
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      metadata: input.metadata,
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
