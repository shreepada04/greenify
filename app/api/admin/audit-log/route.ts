import { NextRequest, NextResponse } from 'next/server'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import AdminAuditLog from '@/app/lib/models/AdminAuditLog'
import { verifyAccessToken } from '@/app/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    await dbConnectSimple()

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

    const filter: Record<string, unknown> = {}
    if (eventType) {
      filter.eventType = eventType
    }

    const [logs, total] = await Promise.all([
      AdminAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      AdminAuditLog.countDocuments(filter),
    ])

    return NextResponse.json({
      logs: logs.map((log: any) => ({
        id: log._id.toString(),
        eventType: log.eventType,
        actorName: log.actorName,
        actorRole: log.actorRole,
        targetType: log.targetType,
        targetId: log.targetId?.toString(),
        summary: log.summary,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
      total,
    })
  } catch (error) {
    console.error('Admin audit log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
