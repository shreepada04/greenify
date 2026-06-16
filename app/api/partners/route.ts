import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { verifyAccessToken } from '@/app/lib/jwt'

const DEFAULT_PARTNERS = [
  {
    name: 'Amazon',
    slug: 'amazon',
    description: 'Earn eco points when you shop sustainable products on Amazon',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    brand_color: '#FF9900',
    website_url: 'https://www.amazon.in',
    category: 'shopping',
    points_reward: 50,
    action_label: 'Shop on Amazon',
    featured: true,
    active: true,
  },
  {
    name: 'Microsoft Store',
    slug: 'microsoft',
    description: 'Like Microsoft Rewards — earn points for eco-friendly tech purchases',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
    brand_color: '#00A4EF',
    website_url: 'https://www.microsoft.com',
    category: 'electronics',
    points_reward: 75,
    action_label: 'Browse Microsoft',
    featured: true,
    active: true,
  },
  {
    name: 'Flipkart',
    slug: 'flipkart',
    description: 'Shop green products and claim bonus eco points',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Flipkart_logo.png',
    brand_color: '#2874F0',
    website_url: 'https://www.flipkart.com',
    category: 'shopping',
    points_reward: 40,
    action_label: 'Shop Flipkart',
    featured: true,
    active: true,
  },
  {
    name: 'Myntra',
    slug: 'myntra',
    description: 'Sustainable fashion purchases earn extra rewards',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Myntra_logo.png',
    brand_color: '#FF3F6C',
    website_url: 'https://www.myntra.com',
    category: 'fashion',
    points_reward: 35,
    action_label: 'Shop Myntra',
    featured: false,
    active: true,
  },
  {
    name: 'Swiggy',
    slug: 'swiggy',
    description: 'Order from eco-certified restaurants and earn points',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/1/12/Swiggy_logo.png',
    brand_color: '#FC8019',
    website_url: 'https://www.swiggy.com',
    category: 'food',
    points_reward: 25,
    action_label: 'Order Food',
    featured: false,
    active: true,
  },
  {
    name: 'MakeMyTrip',
    slug: 'makemytrip',
    description: 'Book eco-travel options and redeem voucher points',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/MakeMyTrip_logo.png',
    brand_color: '#008CFF',
    website_url: 'https://www.makemytrip.com',
    category: 'travel',
    points_reward: 100,
    action_label: 'Book Travel',
    featured: true,
    active: true,
  },
]

async function ensurePartners() {
  try {
    const { count, error } = await supabase
      .from('partners')
      .select('id', { count: 'exact', head: true })
    
    if (!error && (count === 0 || count === null)) {
      await supabase.from('partners').insert(DEFAULT_PARTNERS)
    }
  } catch (err) {
    console.error('Error ensuring default partners:', err)
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensurePartners()

    const accessToken = request.cookies.get('accessToken')?.value
    const currentUser = accessToken ? verifyAccessToken(accessToken) : null

    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .eq('active', true)
      .order('featured', { ascending: false })
      .order('points_reward', { ascending: false })

    if (error || !partners) {
      console.error('Partners GET query error:', error)
      return NextResponse.json({ error: 'Failed to retrieve partners' }, { status: 500 })
    }

    let recentClaims: Record<string, string> = {}
    if (currentUser) {
      const { data: claims } = await supabase
        .from('partner_claims')
        .select('*')
        .eq('user_id', currentUser.userId)
        .order('claimed_at', { ascending: false })
        .limit(50)
      
      if (claims) {
        claims.forEach((c) => {
          const key = String(c.partner_id)
          if (!recentClaims[key]) {
            recentClaims[key] = c.claimed_at
          }
        })
      }
    }

    return NextResponse.json({
      partners: partners.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        logoUrl: p.logo_url,
        brandColor: p.brand_color,
        websiteUrl: p.website_url,
        category: p.category,
        pointsReward: p.points_reward,
        actionLabel: p.action_label,
        featured: p.featured,
        lastClaimedAt: recentClaims[p.id] || null,
      })),
    })
  } catch (error) {
    console.error('Partners GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
