import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = verifyAccessToken(accessToken)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const eventType = searchParams.get('eventType')

    let queryBuilder = supabase
      .from('admin_audit_logs')
      .select('*', { count: 'exact' })

    if (eventType) {
      queryBuilder = queryBuilder.eq('event_type', eventType)
    }

    const { data: logs, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !logs) {
      console.error('Audit log query error:', error)
      return NextResponse.json({ error: 'Failed to retrieve audit logs' }, { status: 500 })
    }

    return NextResponse.json({
      logs: logs.map((log: any) => ({
        id: log.id,
        eventType: log.event_type,
        actorName: log.actor_name,
        actorRole: log.actor_role,
        targetType: log.target_type,
        targetId: log.target_id,
        summary: log.summary,
        metadata: log.metadata,
        createdAt: log.created_at,
      })),
      total: count || 0,
    })
  } catch (error) {
    console.error('Admin audit log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
