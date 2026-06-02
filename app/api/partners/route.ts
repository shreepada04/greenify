import { NextRequest, NextResponse } from 'next/server'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import Partner from '@/app/lib/models/Partner'
import PartnerClaim from '@/app/lib/models/PartnerClaim'
import { requireAuth } from '@/app/lib/jwt'

const DEFAULT_PARTNERS = [
  {
    name: 'Amazon',
    slug: 'amazon',
    description: 'Earn eco points when you shop sustainable products on Amazon',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    brandColor: '#FF9900',
    websiteUrl: 'https://www.amazon.in',
    category: 'shopping',
    pointsReward: 50,
    actionLabel: 'Shop on Amazon',
    featured: true,
  },
  {
    name: 'Microsoft Store',
    slug: 'microsoft',
    description: 'Like Microsoft Rewards — earn points for eco-friendly tech purchases',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
    brandColor: '#00A4EF',
    websiteUrl: 'https://www.microsoft.com',
    category: 'electronics',
    pointsReward: 75,
    actionLabel: 'Browse Microsoft',
    featured: true,
  },
  {
    name: 'Flipkart',
    slug: 'flipkart',
    description: 'Shop green products and claim bonus eco points',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Flipkart_logo.png',
    brandColor: '#2874F0',
    websiteUrl: 'https://www.flipkart.com',
    category: 'shopping',
    pointsReward: 40,
    actionLabel: 'Shop Flipkart',
    featured: true,
  },
  {
    name: 'Myntra',
    slug: 'myntra',
    description: 'Sustainable fashion purchases earn extra rewards',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Myntra_logo.png',
    brandColor: '#FF3F6C',
    websiteUrl: 'https://www.myntra.com',
    category: 'fashion',
    pointsReward: 35,
    actionLabel: 'Shop Myntra',
    featured: false,
  },
  {
    name: 'Swiggy',
    slug: 'swiggy',
    description: 'Order from eco-certified restaurants and earn points',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/1/12/Swiggy_logo.png',
    brandColor: '#FC8019',
    websiteUrl: 'https://www.swiggy.com',
    category: 'food',
    pointsReward: 25,
    actionLabel: 'Order Food',
    featured: false,
  },
  {
    name: 'MakeMyTrip',
    slug: 'makemytrip',
    description: 'Book eco-travel options and redeem voucher points',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/MakeMyTrip_logo.png',
    brandColor: '#008CFF',
    websiteUrl: 'https://www.makemytrip.com',
    category: 'travel',
    pointsReward: 100,
    actionLabel: 'Book Travel',
    featured: true,
  },
]

async function ensurePartners() {
  const count = await Partner.countDocuments()
  if (count === 0) {
    await Partner.insertMany(DEFAULT_PARTNERS)
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnectSimple()
    await ensurePartners()

    const currentUser = requireAuth(request)
    const partners = await Partner.find({ active: true }).sort({ featured: -1, pointsReward: -1 })

    let recentClaims: Record<string, Date> = {}
    if (currentUser) {
      const claims = await PartnerClaim.find({ userId: currentUser.userId })
        .sort({ claimedAt: -1 })
        .limit(50)
      for (const c of claims) {
        const key = c.partnerId.toString()
        if (!recentClaims[key]) recentClaims[key] = c.claimedAt
      }
    }

    return NextResponse.json({
      partners: partners.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        slug: p.slug,
        description: p.description,
        logoUrl: p.logoUrl,
        brandColor: p.brandColor,
        websiteUrl: p.websiteUrl,
        category: p.category,
        pointsReward: p.pointsReward,
        actionLabel: p.actionLabel,
        featured: p.featured,
        lastClaimedAt: recentClaims[p._id.toString()] || null,
      })),
    })
  } catch (error) {
    console.error('Partners GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
