import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

const sampleRewards = [
  {
    title: "Swiggy 20% Off",
    description: "Get 20% off on your next food order",
    brand: "Swiggy",
    discount_percentage: 20,
    points_cost: 100,
    category: "food",
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid for orders above ₹200. Cannot be combined with other offers.",
    valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 1000,
    is_active: true,
  },
  {
    title: "Lenskart 40% Off",
    description: "Get 40% off on eyewear and sunglasses",
    brand: "Lenskart",
    discount_percentage: 40,
    points_cost: 200,
    category: "fashion",
    image_url: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid on all products. Minimum purchase ₹1000.",
    valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 500,
    is_active: true,
  },
  {
    title: "Amazon ₹500 Off",
    description: "Get ₹500 off on electronics",
    brand: "Amazon",
    discount_amount: 500,
    points_cost: 300,
    category: "electronics",
    image_url: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid on electronics above ₹2000. One time use only.",
    valid_until: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 300,
    is_active: true,
  },
  {
    title: "Zomato 25% Off",
    description: "Get 25% off on food delivery",
    brand: "Zomato",
    discount_percentage: 25,
    points_cost: 120,
    category: "food",
    image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid for orders above ₹300. Maximum discount ₹150.",
    valid_until: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 800,
    is_active: true,
  },
  {
    title: "BookMyShow ₹200 Off",
    description: "Get ₹200 off on movie tickets",
    brand: "BookMyShow",
    discount_amount: 200,
    points_cost: 150,
    category: "entertainment",
    image_url: "https://images.unsplash.com/photo-1489599735734-79b4169f2a78?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid on movie tickets. Minimum booking of 2 tickets.",
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 400,
    is_active: true,
  },
  {
    title: "Myntra 30% Off",
    description: "Get 30% off on fashion and lifestyle",
    brand: "Myntra",
    discount_percentage: 30,
    points_cost: 180,
    category: "fashion",
    image_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid on all fashion items. Minimum purchase ₹1500.",
    valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 600,
    is_active: true,
  },
  {
    title: "Uber ₹100 Off",
    description: "Get ₹100 off on your next ride",
    brand: "Uber",
    discount_amount: 100,
    points_cost: 80,
    category: "travel",
    image_url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid for rides above ₹200. One time use only.",
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 1000,
    is_active: true,
  },
  {
    title: "Nykaa 35% Off",
    description: "Get 35% off on beauty and wellness products",
    brand: "Nykaa",
    discount_percentage: 35,
    points_cost: 160,
    category: "health",
    image_url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid on all beauty products. Minimum purchase ₹800.",
    valid_until: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 500,
    is_active: true,
  },
]

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = verifyAccessToken(accessToken)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Clear existing rewards
    await supabase.from('rewards').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert sample rewards
    const { data: rewards, error } = await supabase
      .from('rewards')
      .insert(sampleRewards)
      .select()

    if (error || !rewards) {
      console.error('Failed to seed rewards:', error)
      return NextResponse.json({ error: 'Failed to seed rewards' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Sample rewards seeded successfully!',
      count: rewards.length,
      rewards: rewards.map(r => ({
        id: r.id,
        title: r.title,
        brand: r.brand,
        pointsCost: r.points_cost,
      }))
    })

  } catch (error) {
    console.error('Seed rewards error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
