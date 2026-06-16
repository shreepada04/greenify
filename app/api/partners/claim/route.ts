import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

const COOLDOWN_HOURS = 24

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = verifyAccessToken(accessToken)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { partnerId } = await request.json()
    if (!partnerId) {
      return NextResponse.json({ error: 'partnerId required' }, { status: 400 })
    }

    // Get partner details
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .eq('active', true)
      .maybeSingle()

    if (partnerError || !partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    // Check cooldown period (24 hours)
    const cooldownStart = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()
    const { data: recentClaim, error: claimFetchError } = await supabase
      .from('partner_claims')
      .select('*')
      .eq('user_id', currentUser.userId)
      .eq('partner_id', partner.id)
      .gte('claimed_at', cooldownStart)
      .maybeSingle()

    if (recentClaim) {
      const claimedAtDate = new Date(recentClaim.claimed_at)
      return NextResponse.json(
        {
          error: `You can claim ${partner.name} points again in ${COOLDOWN_HOURS} hours`,
          nextClaimAt: new Date(claimedAtDate.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000).toISOString(),
        },
        { status: 429 }
      )
    }

    // Insert new claim
    const { error: insertClaimError } = await supabase
      .from('partner_claims')
      .insert({
        user_id: currentUser.userId,
        partner_id: partner.id,
        points_earned: partner.points_reward,
        status: 'completed',
      })

    if (insertClaimError) {
      console.error('Failed to insert partner claim:', insertClaimError)
      return NextResponse.json({ error: 'Failed to record claim' }, { status: 500 })
    }

    // Fetch user and update points
    const { data: user, error: userFetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.userId)
      .maybeSingle()

    if (userFetchError || !user) {
      console.error('Failed to fetch user:', userFetchError)
      return NextResponse.json({ error: 'Failed to update user balance' }, { status: 500 })
    }

    const newPoints = (user.points || 0) + partner.points_reward
    const newTotal = (user.total_points_earned || 0) + partner.points_reward
    const newLevel = Math.floor(newTotal / 100) + 1

    const { data: updatedUser, error: userUpdateError } = await supabase
      .from('users')
      .update({
        points: newPoints,
        total_points_earned: newTotal,
        level: newLevel,
      })
      .eq('id', user.id)
      .select()
      .maybeSingle()

    if (userUpdateError || !updatedUser) {
      console.error('Failed to update user points:', userUpdateError)
      return NextResponse.json({ error: 'Failed to update user balance' }, { status: 500 })
    }

    return NextResponse.json({
      message: `Earned ${partner.points_reward} points from ${partner.name}!`,
      pointsAwarded: partner.points_reward,
      newBalance: updatedUser.points,
      partner: { name: partner.name, websiteUrl: partner.website_url },
    })
  } catch (error) {
    console.error('Partner claim error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
