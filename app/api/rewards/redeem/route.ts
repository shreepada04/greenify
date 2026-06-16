import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

function buildDiscountLabel(reward: {
  discount_percentage?: number
  discount_amount?: number
}) {
  if (reward.discount_percentage) return `${reward.discount_percentage}% OFF`
  if (reward.discount_amount) return `₹${reward.discount_amount} OFF`
  return 'Special offer'
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 })
    }

    const currentUser = verifyAccessToken(accessToken)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rewardId } = await request.json()
    if (!rewardId) {
      return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 })
    }

    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.userId)
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get reward from Supabase
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', rewardId)
      .maybeSingle()

    if (rewardError || !reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }

    if (!reward.is_active || new Date(reward.valid_until) < new Date()) {
      return NextResponse.json({ error: 'This reward is no longer available' }, { status: 400 })
    }

    if (reward.current_redemptions >= reward.max_redemptions) {
      return NextResponse.json({ error: 'This reward has reached its redemption limit' }, { status: 400 })
    }

    if (user.points < reward.points_cost) {
      return NextResponse.json(
        { error: `Insufficient points. You need ${reward.points_cost} points but have ${user.points}` },
        { status: 400 }
      )
    }

    const prefix = reward.couponPrefix || reward.brand.substring(0, 4).toUpperCase()
    const voucherCode =
      prefix +
      Date.now().toString(36).toUpperCase() +
      Math.random().toString(36).substr(2, 4).toUpperCase()

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Insert user reward / voucher
    const { data: userReward, error: insertError } = await supabase
      .from('user_rewards')
      .insert({
        user_id: user.id,
        reward_id: reward.id,
        points_spent: reward.points_cost,
        voucher_code: voucherCode,
        expires_at: expiresAt,
        is_redeemed: false,
      })
      .select()
      .maybeSingle()

    if (insertError || !userReward) {
      console.error('Failed to insert user reward:', insertError)
      return NextResponse.json({ error: 'Failed to redeem reward' }, { status: 500 })
    }

    // Deduct points from user
    const { data: updatedUser, error: updateUError } = await supabase
      .from('users')
      .update({
        points: user.points - reward.points_cost,
      })
      .eq('id', user.id)
      .select()
      .maybeSingle()

    if (updateUError || !updatedUser) {
      console.error('Failed to deduct user points:', updateUError)
      // Rollback user_reward creation
      await supabase.from('user_rewards').delete().eq('id', userReward.id)
      return NextResponse.json({ error: 'Failed to update user points balance' }, { status: 500 })
    }

    // Increment reward current redemptions count
    await supabase
      .from('rewards')
      .update({
        current_redemptions: reward.current_redemptions + 1,
      })
      .eq('id', reward.id)

    return NextResponse.json({
      message: 'Reward redeemed successfully! View it in My Wallet.',
      voucher: {
        id: userReward.id,
        voucherCode: userReward.voucher_code,
        reward: {
          title: reward.title,
          brand: reward.brand,
          description: reward.description,
          shopUrl: reward.shop_url,
          howToUse: reward.howToUse,
          discount: buildDiscountLabel(reward),
        },
        pointsSpent: userReward.points_spent,
        expiresAt: userReward.expires_at,
        status: 'active',
        redeemedAt: userReward.created_at,
      },
      userPoints: updatedUser.points,
      walletUrl: `/wallet?voucher=${userReward.id}`,
    })
  } catch (error) {
    console.error('Redeem reward error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
