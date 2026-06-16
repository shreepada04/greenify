import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

const SAMPLE_REWARDS = [
  {
    title: "Swiggy 20% Off",
    description: "Get 20% off on your next food order. Valid on all restaurants.",
    brand: "Swiggy",
    discount_percentage: 20,
    points_cost: 100,
    category: "food",
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid for orders above ₹200. Cannot be combined with other offers.",
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 1000,
    is_active: true
  },
  {
    title: "Zomato 25% Off",
    description: "Get 25% off on your next Zomato order. Valid on all restaurants.",
    brand: "Zomato",
    discount_percentage: 25,
    points_cost: 120,
    category: "food",
    image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid for orders above ₹300. Maximum discount ₹150.",
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 1000,
    is_active: true
  },
  {
    title: "Amazon ₹500 Off",
    description: "Get ₹500 off on electronics and gadgets at Amazon.",
    brand: "Amazon",
    discount_amount: 500,
    points_cost: 300,
    category: "electronics",
    image_url: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid on electronics above ₹2000. One time use only.",
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 500,
    is_active: true
  },
  {
    title: "Lenskart 40% Off",
    description: "Get 40% off on frames and sunglasses at Lenskart.",
    brand: "Lenskart",
    discount_percentage: 40,
    points_cost: 200,
    category: "fashion",
    image_url: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid on eyewear and frames. Minimum purchase ₹1000.",
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 500,
    is_active: true
  },
  {
    title: "BookMyShow ₹200 Off",
    description: "Get ₹200 off on movie tickets and events booking.",
    brand: "BookMyShow",
    discount_amount: 200,
    points_cost: 150,
    category: "entertainment",
    image_url: "https://images.unsplash.com/photo-1489599735734-79b4169f2a78?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid on movie bookings. Minimum of 2 tickets.",
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 500,
    is_active: true
  },
  {
    title: "Myntra 30% Off",
    description: "Get 30% off on fashion and lifestyle at Myntra.",
    brand: "Myntra",
    discount_percentage: 30,
    points_cost: 180,
    category: "fashion",
    image_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid on Myntra fashion items. Minimum purchase ₹1500.",
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 600,
    is_active: true
  },
  {
    title: "Uber ₹100 Off",
    description: "Get ₹100 off on your next Uber ride.",
    brand: "Uber",
    discount_amount: 100,
    points_cost: 80,
    category: "travel",
    image_url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid on rides above ₹200. One time use only.",
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 1000,
    is_active: true
  },
  {
    title: "Nykaa 35% Off",
    description: "Get 35% off on beauty and cosmetics at Nykaa.",
    brand: "Nykaa",
    discount_percentage: 35,
    points_cost: 160,
    category: "health",
    image_url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=200&fit=crop",
    terms_and_conditions: "Valid on beauty products. Minimum purchase ₹800.",
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 500,
    is_active: true
  }
]

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token found' },
        { status: 401 }
      )
    }

    const currentUser = verifyAccessToken(accessToken)
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build query
    let queryBuilder = supabase
      .from('rewards')
      .select('*', { count: 'exact' })
      .eq('is_active', true)

    if (category && category !== 'all') {
      queryBuilder = queryBuilder.eq('category', category)
    }

    const skip = (page - 1) * limit
    let { data: rewards, error, count } = await queryBuilder
      .order('points_cost', { ascending: true })
      .range(skip, skip + limit - 1)

    if (error) {
      console.error('Rewards query error:', error)
      return NextResponse.json({ error: 'Failed to retrieve rewards' }, { status: 500 })
    }

    let total = count || 0

    // Auto-seed if empty
    if (total === 0 && (!category || category === 'all')) {
      const { data: seeded, error: seedError } = await supabase
        .from('rewards')
        .insert(SAMPLE_REWARDS)
        .select()
      
      if (seedError) {
        console.error('Rewards auto-seed error:', seedError)
      } else if (seeded) {
        rewards = seeded.slice(0, limit)
        total = seeded.length
      }
    }

    const pages = Math.ceil(total / limit)

    // Map back to camelCase for the client UI if necessary (usually they map cleanly, but let's map them)
    const mappedRewards = (rewards || []).map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      brand: r.brand,
      discountPercentage: r.discount_percentage,
      discountAmount: r.discount_amount,
      pointsCost: r.points_cost,
      category: r.category,
      imageUrl: r.image_url,
      termsAndConditions: r.terms_and_conditions,
      validUntil: r.valid_until,
      maxRedemptions: r.max_redemptions,
      currentRedemptions: r.current_redemptions,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))

    return NextResponse.json({
      rewards: mappedRewards,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      }
    })

  } catch (error) {
    console.error('Get rewards error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
