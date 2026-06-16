/**
 * Seed Supabase PostgreSQL database with realistic users, activities, partners, rewards, and audit logs.
 * Run: node scripts/seedSupabase.js
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
const path = require('path')
require('dotenv').config({
  path: path.resolve(__dirname, '../.env.local'),
  override: true,
})
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

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

const SAMPLE_REWARDS = [
  {
    title: 'Swiggy 20% Off',
    description: 'Get 20% off on your next food order. Valid on all restaurants.',
    brand: 'Swiggy',
    discount_percentage: 20,
    points_cost: 100,
    category: 'food',
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop',
    terms_and_conditions: 'Valid for orders above ₹200. Cannot be combined with other offers.',
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 1000,
    is_active: true,
  },
  {
    title: 'Zomato 25% Off',
    description: 'Get 25% off on your next Zomato order. Valid on all restaurants.',
    brand: 'Zomato',
    discount_percentage: 25,
    points_cost: 120,
    category: 'food',
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop',
    terms_and_conditions: 'Valid for orders above ₹300. Maximum discount ₹150.',
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 1000,
    is_active: true,
  },
  {
    title: 'Amazon ₹500 Off',
    description: 'Get ₹500 off on electronics and gadgets at Amazon.',
    brand: 'Amazon',
    discount_amount: 500,
    points_cost: 300,
    category: 'electronics',
    image_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=300&h=200&fit=crop',
    terms_and_conditions: 'Valid on electronics above ₹2000. One time use only.',
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 500,
    is_active: true,
  },
  {
    title: 'Lenskart 40% Off',
    description: 'Get 40% off on frames and sunglasses at Lenskart.',
    brand: 'Lenskart',
    discount_percentage: 40,
    points_cost: 200,
    category: 'fashion',
    image_url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=300&h=200&fit=crop',
    terms_and_conditions: 'Valid on eyewear and frames. Minimum purchase ₹1000.',
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 500,
    is_active: true,
  },
  {
    title: 'BookMyShow ₹200 Off',
    description: 'Get ₹200 off on movie tickets and events booking.',
    brand: 'BookMyShow',
    discount_amount: 200,
    points_cost: 150,
    category: 'entertainment',
    image_url: 'https://images.unsplash.com/photo-1489599735734-79b4169f2a78?w=300&h=200&fit=crop',
    terms_and_conditions: 'Valid on movie bookings. Minimum of 2 tickets.',
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 500,
    is_active: true,
  },
  {
    title: 'Myntra 30% Off',
    description: 'Get 30% off on fashion and lifestyle at Myntra.',
    brand: 'Myntra',
    discount_percentage: 30,
    points_cost: 180,
    category: 'fashion',
    image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop',
    terms_and_conditions: 'Valid on Myntra fashion items. Minimum purchase ₹1500.',
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 600,
    is_active: true,
  },
  {
    title: 'Uber ₹100 Off',
    description: 'Get ₹100 off on your next Uber ride.',
    brand: 'Uber',
    discount_amount: 100,
    points_cost: 80,
    category: 'travel',
    image_url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=200&fit=crop',
    terms_and_conditions: 'Valid on rides above ₹200. One time use only.',
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 1000,
    is_active: true,
  },
  {
    title: 'Nykaa 35% Off',
    description: 'Get 35% off on beauty and cosmetics at Nykaa.',
    brand: 'Nykaa',
    discount_percentage: 35,
    points_cost: 160,
    category: 'health',
    image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=200&fit=crop',
    terms_and_conditions: 'Valid on beauty products. Minimum purchase ₹800.',
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_redemptions: 500,
    is_active: true,
  },
]

const DEMO_IMAGES = [
  'https://ik.imagekit.io/demo/img/tr:w-400,h-300/recycling.jpg',
  'https://images.unsplash.com/photo-1532996122724-e3c354a0b150?w=400',
  'https://images.unsplash.com/photo-1542601906990-1c205e70b92b?w=400',
]

async function main() {
  console.log('🔌 Connecting to Supabase...')
  
  // 1. Clean up existing tables
  console.log('🧹 Cleaning up old database tables...')
  
  await supabase.from('media_fingerprints').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('partner_claims').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('user_rewards').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('admin_audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('partners').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('rewards').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // 2. Hash passwords
  console.log('🔑 Hashing passwords...')
  const adminPasswordHash = await bcrypt.hash('GreenifyAdmin2024!', 12)
  const userPasswordHash = await bcrypt.hash('Greenify2026!', 12)

  // 3. Insert Users
  console.log('👥 Seeding users...')
  const usersToInsert = [
    {
      name: 'System Administrator',
      email: 'admin@greenify.com',
      password: adminPasswordHash,
      role: 'admin',
      points: 0,
      total_points_earned: 0,
      level: 1,
      activities_completed: 0,
      auth_provider: 'local',
    },
    {
      name: 'Aarav Mehta',
      email: 'aarav.mehta@gmail.com',
      password: userPasswordHash,
      role: 'user',
      points: 250,
      total_points_earned: 500,
      level: 3,
      activities_completed: 12,
      auth_provider: 'local',
    },
    {
      name: 'Priya Sharma',
      email: 'priya.sharma@gmail.com',
      password: userPasswordHash,
      role: 'user',
      points: 250,
      total_points_earned: 500,
      level: 5,
      activities_completed: 4,
      auth_provider: 'local',
    },
    {
      name: 'Arjun Patel',
      email: 'arjun.patel@yahoo.com',
      password: userPasswordHash,
      role: 'user',
      points: 150,
      total_points_earned: 300,
      level: 3,
      activities_completed: 3,
      auth_provider: 'local',
    },
    {
      name: 'Sneha Reddy',
      email: 'sneha.reddy@outlook.com',
      password: userPasswordHash,
      role: 'user',
      points: 80,
      total_points_earned: 180,
      level: 2,
      activities_completed: 2,
      auth_provider: 'local',
    },
    {
      name: 'Rohan Das',
      email: 'rohan.das@greenify.com',
      password: userPasswordHash,
      role: 'user',
      points: 300,
      total_points_earned: 600,
      level: 6,
      activities_completed: 5,
      auth_provider: 'local',
    },
  ]

  const { data: seededUsers, error: userError } = await supabase
    .from('users')
    .insert(usersToInsert)
    .select()

  if (userError) {
    console.error('❌ Error seeding users:', userError)
    process.exit(1)
  }
  console.log(`✅ Seeded ${seededUsers.length} users successfully.`)

  const adminUser = seededUsers.find((u) => u.role === 'admin')
  const regularUsers = seededUsers.filter((u) => u.role === 'user')

  // 4. Insert Partners
  console.log('🤝 Seeding partners...')
  const { data: seededPartners, error: partnerError } = await supabase
    .from('partners')
    .insert(DEFAULT_PARTNERS)
    .select()

  if (partnerError) {
    console.error('❌ Error seeding partners:', partnerError)
    process.exit(1)
  }
  console.log(`✅ Seeded ${seededPartners.length} partners successfully.`)

  // 5. Insert Rewards
  console.log('🎁 Seeding rewards...')
  const { data: seededRewards, error: rewardError } = await supabase
    .from('rewards')
    .insert(SAMPLE_REWARDS)
    .select()

  if (rewardError) {
    console.error('❌ Error seeding rewards:', rewardError)
    process.exit(1)
  }
  console.log(`✅ Seeded ${seededRewards.length} rewards successfully.`)

  // 6. Insert Activities
  console.log('🌱 Seeding activities...')
  const activitiesToInsert = [
    {
      type: 'recycling',
      title: 'Recycled 15 plastic bottles',
      description: 'Collected plastic waste from home and deposited it at the municipal recycling center.',
      points_earned: 25,
      quantity: 15,
      unit: 'pcs',
      status: 'approved',
      carbon_saved: 3.5,
    },
    {
      type: 'tree_planting',
      title: 'Planted 3 neem saplings',
      description: 'Participated in the neighborhood greening drive and planted saplings in the local community park.',
      points_earned: 100,
      quantity: 3,
      unit: 'saplings',
      status: 'pending',
      carbon_saved: 12.0,
    },
    {
      type: 'water_saving',
      title: 'Fixed leaking pipe and installed aerator',
      description: 'Repaired kitchen pipe leak and installed low-flow aerators to conserve water.',
      points_earned: 35,
      quantity: 1,
      unit: 'fixture',
      status: 'approved',
      carbon_saved: 1.2,
    },
    {
      type: 'energy_saving',
      title: 'Replaced 8 bulbs with smart LEDs',
      description: 'Swapped out inefficient incandescent bulbs for modern, low-wattage LEDs.',
      points_earned: 50,
      quantity: 8,
      unit: 'bulbs',
      status: 'approved',
      carbon_saved: 8.4,
    },
    {
      type: 'transportation',
      title: 'Carpooled to work for a week',
      description: 'Shared commute with three colleagues to reduce vehicle emissions.',
      points_earned: 75,
      quantity: 5,
      unit: 'days',
      status: 'pending',
      carbon_saved: 15.6,
    },
    {
      type: 'waste_reduction',
      title: 'Set up backyard compost bin',
      description: 'Started composting kitchen food scraps to reduce landfill waste.',
      points_earned: 60,
      quantity: 1,
      unit: 'bin',
      status: 'rejected',
      carbon_saved: 4.8,
      rejection_reason: 'The uploaded image does not show a composting setup, please upload a clear picture of the composting bin.',
    },
  ]

  const createdActivities = []
  for (let i = 0; i < activitiesToInsert.length; i++) {
    const user = regularUsers[i % regularUsers.length]
    const act = activitiesToInsert[i]
    const contentHash = `real_seed_hash_${i}_${user.id}`
    const imageUrl = DEMO_IMAGES[i % DEMO_IMAGES.length]

    const activityData = {
      user_id: user.id,
      ...act,
      verification_media: [
        {
          type: 'image',
          url: imageUrl,
          filename: `activity_${i}.jpg`,
          contentHash,
          perceptualHash: contentHash,
          geoVerified: true,
          captureFresh: true,
        },
      ],
      location: {
        latitude: 12.9716 + i * 0.015,
        longitude: 77.5946 + i * 0.015,
        accuracy: 10,
        address: i % 2 === 0 ? 'Bangalore, Karnataka, India' : 'Mumbai, Maharashtra, India',
        timestamp: Date.now() - i * 4 * 3600000,
      },
      media_verification: {
        allHashesUnique: true,
        geoVerified: true,
        captureFresh: true,
        authenticityScore: 90 - (i % 3) * 5,
        adminHashVerified: true,
      },
      submitted_at: new Date(Date.now() - i * 6 * 3600000).toISOString(),
    }

    if (act.status !== 'pending') {
      activityData.verified_at = new Date(Date.now() - i * 3 * 3600000).toISOString()
      if (adminUser) {
        activityData.verified_by = adminUser.id
      }
    }

    const { data: seededAct, error: actError } = await supabase
      .from('activities')
      .insert(activityData)
      .select()
      .single()

    if (actError) {
      console.error(`❌ Error seeding activity "${act.title}":`, actError)
      process.exit(1)
    }

    createdActivities.push(seededAct)

    // Create media fingerprint
    const { error: fingerprintError } = await supabase
      .from('media_fingerprints')
      .insert({
        content_hash: contentHash,
        perceptual_hash: contentHash,
        user_id: user.id,
        activity_id: seededAct.id,
        url: imageUrl,
        used_at: new Date().toISOString(),
      })

    if (fingerprintError) {
      console.error(`❌ Error seeding media fingerprint for "${act.title}":`, fingerprintError)
    }
  }
  console.log(`✅ Seeded ${createdActivities.length} activities and fingerprints successfully.`)

  // 7. Insert Audit Logs
  console.log('📜 Seeding audit logs...')
  const auditLogsToInsert = [
    {
      event_type: 'user.registered',
      actor_name: 'Priya Sharma',
      actor_role: 'user',
      summary: 'New user registration: Priya Sharma (priya.sharma@gmail.com)',
      created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    },
    {
      event_type: 'user.registered',
      actor_name: 'Arjun Patel',
      actor_role: 'user',
      summary: 'New user registration: Arjun Patel (arjun.patel@yahoo.com)',
      created_at: new Date(Date.now() - 2.5 * 24 * 3600000).toISOString(),
    },
    {
      event_type: 'activity.submitted',
      actor_name: 'Priya Sharma',
      actor_role: 'user',
      summary: 'Submitted activity for review: Recycled 15 plastic bottles',
      created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    },
    {
      event_type: 'activity.approved',
      actor_name: adminUser ? adminUser.name : 'System Administrator',
      actor_role: 'admin',
      summary: 'Approved activity: Recycled 15 plastic bottles by Priya Sharma',
      created_at: new Date(Date.now() - 1.8 * 24 * 3600000).toISOString(),
    },
    {
      event_type: 'reward.redeemed',
      actor_name: 'Priya Sharma',
      actor_role: 'user',
      summary: 'Redeemed reward: Swiggy 20% Off voucher',
      created_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
    },
    {
      event_type: 'user.registered',
      actor_name: 'Sneha Reddy',
      actor_role: 'user',
      summary: 'New user registration: Sneha Reddy (sneha.reddy@outlook.com)',
      created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    },
    {
      event_type: 'activity.submitted',
      actor_name: 'Sneha Reddy',
      actor_role: 'user',
      summary: 'Submitted activity for review: Replaced 8 bulbs with smart LEDs',
      created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
    },
    {
      event_type: 'activity.approved',
      actor_name: adminUser ? adminUser.name : 'System Administrator',
      actor_role: 'admin',
      summary: 'Approved activity: Replaced 8 bulbs with smart LEDs by Sneha Reddy',
      created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    },
  ]

  // Link actor_id if possible
  auditLogsToInsert.forEach((log) => {
    const matchingUser = seededUsers.find((u) => u.name === log.actor_name)
    if (matchingUser) {
      log.actor_id = matchingUser.id
    }
  })

  const { error: auditError } = await supabase
    .from('admin_audit_logs')
    .insert(auditLogsToInsert)

  if (auditError) {
    console.error('❌ Error seeding audit logs:', auditError)
    process.exit(1)
  }
  console.log('✅ Seeded audit logs successfully.')

  console.log('\n🎉 Supabase seeding complete!')
  console.log('🛡️ Admin Credentials:')
  console.log('   Email: admin@greenify.com')
  console.log('   Password: GreenifyAdmin2024!')
  console.log('👤 User Accounts (password: Greenify2026!):')
  regularUsers.forEach((u) => console.log(`   - ${u.name} (${u.email})`))
}

main().catch((err) => {
  console.error('❌ Script failed:', err)
  process.exit(1)
})
