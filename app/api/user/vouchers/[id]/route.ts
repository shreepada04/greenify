import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Find the voucher in Supabase first to ensure ownership
    const { data: voucher, error: fetchError } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', currentUser.userId)
      .maybeSingle()

    if (fetchError || !voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 })
    }

    const isRedeemed = status === 'used'
    const redeemedAt = status === 'used' ? new Date().toISOString() : null

    // Update in Supabase
    const { data: updated, error: updateError } = await supabase
      .from('user_rewards')
      .update({
        is_redeemed: isRedeemed,
        redeemed_at: redeemedAt,
      })
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (updateError || !updated) {
      console.error('Failed to update voucher status:', updateError)
      return NextResponse.json({ error: 'Failed to update voucher' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Voucher updated',
      voucher: {
        id: updated.id,
        status: status,
        usedAt: updated.redeemed_at,
      },
    })
  } catch (error) {
    console.error('Update voucher error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
