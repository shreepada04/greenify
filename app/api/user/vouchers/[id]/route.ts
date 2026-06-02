import { NextRequest, NextResponse } from 'next/server'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import UserReward from '@/app/lib/models/UserReward'
import { verifyAccessToken } from '@/app/lib/jwt'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnectSimple()

    const accessToken = request.cookies.get('accessToken')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = verifyAccessToken(accessToken)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!['active', 'used', 'expired'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const voucher = await UserReward.findOne({
      _id: params.id,
      userId: currentUser.userId,
    })

    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 })
    }

    voucher.status = status
    if (status === 'used') voucher.usedAt = new Date()
    await voucher.save()

    return NextResponse.json({
      message: 'Voucher updated',
      voucher: {
        id: voucher._id.toString(),
        status: voucher.status,
        usedAt: voucher.usedAt,
      },
    })
  } catch (error) {
    console.error('Update voucher error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
