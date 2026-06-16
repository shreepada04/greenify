import { supabase } from '@/app/lib/supabase'

export type AuditEventType =
  | 'user.registered'
  | 'activity.submitted'
  | 'activity.approved'
  | 'activity.rejected'
  | 'media.verified'
  | 'reward.redeemed'
  | 'system.seed'

interface CreateAuditLogInput {
  eventType: AuditEventType
  actorId?: string
  actorName: string
  actorRole?: 'admin' | 'user' | 'system'
  targetType?: 'user' | 'activity' | 'reward' | 'media'
  targetId?: string
  summary: string
  metadata?: Record<string, unknown>
}

export async function createAuditLog(input: CreateAuditLogInput) {
  try {
    const { error } = await supabase.from('admin_audit_logs').insert({
      event_type: input.eventType,
      actor_id: input.actorId || null,
      actor_name: input.actorName,
      actor_role: input.actorRole ?? 'system',
      target_type: input.targetType || null,
      target_id: input.targetId ? String(input.targetId) : null,
      summary: input.summary,
      metadata: input.metadata || null,
    })

    if (error) {
      console.error('Failed to insert audit log into Supabase:', error)
    }
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
