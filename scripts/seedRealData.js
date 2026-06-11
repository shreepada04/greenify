/**
 * Seed real users, activities with photos, partners, and rewards.
 * Run: node scripts/seedRealData.js
 * Requires MONGODB_URI in .env.local (loaded via dotenv)
 */
const path = require('path')
require('dotenv').config({
  path: path.resolve(__dirname, '../.env.local'),
  override: true,
})
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('MONGODB_URI required in .env.local')
  process.exit(1)
}

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'user' },
  points: { type: Number, default: 0 },
  totalPointsEarned: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  activitiesCompleted: { type: Number, default: 0 },
  authProvider: { type: String, default: 'local' },
})

const ActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  title: String,
  description: String,
  pointsEarned: Number,
  quantity: Number,
  unit: String,
  verificationMedia: [mongoose.Schema.Types.Mixed],
  location: mongoose.Schema.Types.Mixed,
  status: String,
  carbonSaved: Number,
  mediaVerification: mongoose.Schema.Types.Mixed,
  submittedAt: Date,
  verifiedBy: mongoose.Schema.Types.ObjectId,
  verifiedAt: Date,
  rejectionReason: String,
}, { timestamps: true })

const MediaFingerprintSchema = new mongoose.Schema({
  contentHash: { type: String, unique: true },
  perceptualHash: String,
  userId: mongoose.Schema.Types.ObjectId,
  activityId: mongoose.Schema.Types.ObjectId,
  url: String,
  usedAt: Date,
})

const DEMO_IMAGES = [
  'https://ik.imagekit.io/demo/img/tr:w-400,h-300/recycling.jpg',
  'https://images.unsplash.com/photo-1532996122724-e3c354a0b150?w=400',
  'https://images.unsplash.com/photo-1542601906990-1c205e70b92b?w=400',
]

async function main() {
  console.log('Connecting to database:', MONGODB_URI)
  await mongoose.connect(MONGODB_URI)
  
  const User = mongoose.models.User || mongoose.model('User', UserSchema)
  const Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema)
  const MediaFingerprint =
    mongoose.models.MediaFingerprint || mongoose.model('MediaFingerprint', MediaFingerprintSchema)

  const passwordReal = 'Greenify2026!'
  const hashed = await bcrypt.hash(passwordReal, 12)

  const realUsers = [
    { name: 'Priya Sharma', email: 'priya.sharma@gmail.com', password: hashed, points: 250, totalPointsEarned: 500, level: 5, activitiesCompleted: 4 },
    { name: 'Arjun Patel', email: 'arjun.patel@yahoo.com', password: hashed, points: 150, totalPointsEarned: 300, level: 3, activitiesCompleted: 3 },
    { name: 'Sneha Reddy', email: 'sneha.reddy@outlook.com', password: hashed, points: 80, totalPointsEarned: 180, level: 2, activitiesCompleted: 2 },
    { name: 'Rohan Das', email: 'rohan.das@greenify.com', password: hashed, points: 300, totalPointsEarned: 600, level: 6, activitiesCompleted: 5 },
  ]

  const users = []
  for (const u of realUsers) {
    let user = await User.findOne({ email: u.email })
    if (!user) {
      user = await User.create(u)
      console.log(`Created user: ${u.name} (${u.email}) password: ${passwordReal}`)
    } else {
      console.log(`User exists: ${u.email}`)
    }
    users.push(user)
  }

  const activities = [
    {
      type: 'recycling',
      title: 'Recycled 15 plastic bottles',
      description: 'Collected plastic waste from home and deposited it at the municipal recycling center.',
      pointsEarned: 25,
      quantity: 15,
      unit: 'pcs',
      status: 'approved',
      carbonSaved: 3.5,
    },
    {
      type: 'tree_planting',
      title: 'Planted 3 neem saplings',
      description: 'Participated in the neighborhood greening drive and planted saplings in the local community park.',
      pointsEarned: 100,
      quantity: 3,
      unit: 'saplings',
      status: 'pending',
      carbonSaved: 12.0,
    },
    {
      type: 'water_saving',
      title: 'Fixed leaking pipe and installed aerator',
      description: 'Repaired kitchen pipe leak and installed low-flow aerators to conserve water.',
      pointsEarned: 35,
      quantity: 1,
      unit: 'fixture',
      status: 'approved',
      carbonSaved: 1.2,
    },
    {
      type: 'energy_saving',
      title: 'Replaced 8 bulbs with smart LEDs',
      description: 'Swapped out inefficient incandescent bulbs for modern, low-wattage LEDs.',
      pointsEarned: 50,
      quantity: 8,
      unit: 'bulbs',
      status: 'approved',
      carbonSaved: 8.4,
    },
    {
      type: 'transportation',
      title: 'Carpooled to work for a week',
      description: 'Shared commute with three colleagues to reduce vehicle emissions.',
      pointsEarned: 75,
      quantity: 5,
      unit: 'days',
      status: 'pending',
      carbonSaved: 15.6,
    },
    {
      type: 'waste_reduction',
      title: 'Set up backyard compost bin',
      description: 'Started composting kitchen food scraps to reduce landfill waste.',
      pointsEarned: 60,
      quantity: 1,
      unit: 'bin',
      status: 'rejected',
      carbonSaved: 4.8,
      rejectionReason: 'The uploaded image does not show a composting setup, please upload a clear picture of the composting bin.',
    }
  ]

  // Find admin user for verifiedBy
  const adminUser = await User.findOne({ role: 'admin' })
  const adminId = adminUser ? adminUser._id : null
  const adminName = adminUser ? adminUser.name : 'System Administrator'

  for (let i = 0; i < activities.length; i++) {
    const user = users[i % users.length]
    const act = activities[i]
    const existing = await Activity.findOne({ userId: user._id, title: act.title })
    if (existing) {
      console.log('Activity exists:', act.title)
      continue
    }

    const contentHash = `real_seed_hash_${i}_${user._id}`
    const imageUrl = DEMO_IMAGES[i % DEMO_IMAGES.length]

    const activityData = {
      userId: user._id,
      ...act,
      verificationMedia: [
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
      mediaVerification: {
        allHashesUnique: true,
        geoVerified: true,
        captureFresh: true,
        authenticityScore: 90 - (i % 3) * 5,
        adminHashVerified: true,
      },
      submittedAt: new Date(Date.now() - i * 6 * 3600000),
    }

    if (act.status !== 'pending') {
      activityData.verifiedAt = new Date(Date.now() - i * 3 * 3600000)
      if (adminId) {
        activityData.verifiedBy = adminId
      }
    }

    const activity = await Activity.create(activityData)

    try {
      await MediaFingerprint.create({
        contentHash,
        perceptualHash: contentHash,
        userId: user._id,
        activityId: activity._id,
        url: imageUrl,
        usedAt: new Date(),
      })
    } catch (e) {
      if (e.code !== 11000) throw e
    }

    console.log(`Created activity "${act.title}" for ${user.name} (Status: ${act.status})`)
  }

  // Seed some Audit Logs as well to make it look full
  const AdminAuditLog = mongoose.models.AdminAuditLog || mongoose.model('AdminAuditLog', new mongoose.Schema({}, { strict: false }))
  
  // Clear existing audit logs to clean up any dummy system seeds
  await AdminAuditLog.deleteMany({ eventType: { $ne: 'system.seed' } })

  const seedLogs = [
    {
      eventType: 'user.registered',
      actorName: 'Priya Sharma',
      actorRole: 'user',
      summary: 'New user registration: Priya Sharma (priya.sharma@gmail.com)',
      createdAt: new Date(Date.now() - 3 * 24 * 3600000)
    },
    {
      eventType: 'user.registered',
      actorName: 'Arjun Patel',
      actorRole: 'user',
      summary: 'New user registration: Arjun Patel (arjun.patel@yahoo.com)',
      createdAt: new Date(Date.now() - 2.5 * 24 * 3600000)
    },
    {
      eventType: 'activity.submitted',
      actorName: 'Priya Sharma',
      actorRole: 'user',
      summary: 'Submitted activity for review: Recycled 15 plastic bottles',
      createdAt: new Date(Date.now() - 2 * 24 * 3600000)
    },
    {
      eventType: 'activity.approved',
      actorName: adminName,
      actorRole: 'admin',
      summary: `Approved activity: Recycled 15 plastic bottles by Priya Sharma`,
      createdAt: new Date(Date.now() - 1.8 * 24 * 3600000)
    },
    {
      eventType: 'reward.redeemed',
      actorName: 'Priya Sharma',
      actorRole: 'user',
      summary: 'Redeemed reward: Swiggy 20% Off voucher',
      createdAt: new Date(Date.now() - 1 * 24 * 3600000)
    },
    {
      eventType: 'user.registered',
      actorName: 'Sneha Reddy',
      actorRole: 'user',
      summary: 'New user registration: Sneha Reddy (sneha.reddy@outlook.com)',
      createdAt: new Date(Date.now() - 12 * 3600000)
    },
    {
      eventType: 'activity.submitted',
      actorName: 'Sneha Reddy',
      actorRole: 'user',
      summary: 'Submitted activity for review: Replaced 8 bulbs with smart LEDs',
      createdAt: new Date(Date.now() - 10 * 3600000)
    },
    {
      eventType: 'activity.approved',
      actorName: adminName,
      actorRole: 'admin',
      summary: `Approved activity: Replaced 8 bulbs with smart LEDs by Sneha Reddy`,
      createdAt: new Date(Date.now() - 8 * 3600000)
    }
  ]

  for (const log of seedLogs) {
    await AdminAuditLog.create(log)
  }
  console.log('Created realistic audit logs!')

  console.log('\nSeed real data complete!')
  console.log('Admin login: admin@greenify.com / GreenifyAdmin2024!')
  console.log('User logins:')
  realUsers.forEach(u => console.log(` - ${u.email} / ${passwordReal}`))
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
