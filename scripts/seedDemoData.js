/**
 * Seed demo users, activities with photos, partners, and rewards.
 * Run: node scripts/seedDemoData.js
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
  verificationMedia: [mongoose.Schema.Types.Mixed],
  location: mongoose.Schema.Types.Mixed,
  status: String,
  carbonSaved: Number,
  mediaVerification: mongoose.Schema.Types.Mixed,
  submittedAt: Date,
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
  await mongoose.connect(MONGODB_URI)
  const User = mongoose.models.User || mongoose.model('User', UserSchema)
  const Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema)
  const MediaFingerprint =
    mongoose.models.MediaFingerprint || mongoose.model('MediaFingerprint', MediaFingerprintSchema)

  const hashed = await bcrypt.hash('DemoUser123!', 12)

  const demoUsers = [
    { name: 'Priya Sharma', email: 'priya@greenify.demo', password: hashed },
    { name: 'Arjun Patel', email: 'arjun@greenify.demo', password: hashed },
    { name: 'Sneha Reddy', email: 'sneha@greenify.demo', password: hashed },
  ]

  const users = []
  for (const u of demoUsers) {
    let user = await User.findOne({ email: u.email })
    if (!user) {
      user = await User.create({
        ...u,
        points: 120,
        totalPointsEarned: 250,
        level: 3,
        activitiesCompleted: 2,
      })
      console.log('Created user:', u.email, '(password: DemoUser123!)')
    } else {
      console.log('User exists:', u.email)
    }
    users.push(user)
  }

  const activities = [
    {
      type: 'recycling',
      title: 'Recycled 15 plastic bottles',
      description: 'Collected and deposited at local recycling center',
      pointsEarned: 10,
      status: 'approved',
    },
    {
      type: 'tree_planting',
      title: 'Planted 3 saplings in community park',
      description: 'Weekend tree planting drive with neighbors',
      pointsEarned: 50,
      status: 'pending',
    },
    {
      type: 'water_saving',
      title: 'Installed water-saving shower head',
      description: 'Reduced household water usage significantly',
      pointsEarned: 15,
      status: 'approved',
    },
  ]

  for (let i = 0; i < activities.length; i++) {
    const user = users[i % users.length]
    const act = activities[i]
    const existing = await Activity.findOne({ userId: user._id, title: act.title })
    if (existing) {
      console.log('Activity exists:', act.title)
      continue
    }

    const contentHash = `demo_seed_hash_${i}_${user._id}`
    const imageUrl = DEMO_IMAGES[i % DEMO_IMAGES.length]

    const activity = await Activity.create({
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
        latitude: 12.9716 + i * 0.01,
        longitude: 77.5946 + i * 0.01,
        accuracy: 15,
        address: 'Bangalore, Karnataka, India',
        timestamp: Date.now() - i * 3600000,
      },
      carbonSaved: 5.2,
      mediaVerification: {
        allHashesUnique: true,
        geoVerified: true,
        captureFresh: true,
        authenticityScore: 85,
        adminHashVerified: true,
      },
      submittedAt: new Date(),
    })

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

    console.log('Created activity:', act.title, 'for', user.name)
  }

  console.log('\nDemo seed complete!')
  console.log('Login: priya@greenify.demo / DemoUser123!')
  console.log('Admin: admin@greenify.com / GreenifyAdmin2024!')
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
