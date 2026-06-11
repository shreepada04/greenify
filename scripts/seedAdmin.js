const path = require('path')
const mongoose = require('mongoose')

try {
  require('dotenv').config({
    path: path.resolve(__dirname, '../.env.local'),
    override: true,
  })
} catch (e) {
  console.log('dotenv not found, using process.env directly')
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI required in .env.local')
  process.exit(1)
}

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  authProvider: { type: String, default: 'local' },
  points: { type: Number, default: 0 },
  totalPointsEarned: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  activitiesCompleted: { type: Number, default: 0 },
}, { timestamps: true })

const bcrypt = require('bcryptjs')
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

const User = mongoose.models.User || mongoose.model('User', UserSchema)

const ADMIN_EMAIL = 'admin@greenify.com'
const ADMIN_PASSWORD = 'GreenifyAdmin2024!'

const demoUsers = [
  {
    name: 'Demo User',
    email: 'user@demo.com',
    password: 'password123',
    role: 'user',
    points: 250,
    totalPointsEarned: 500,
    level: 3,
    activitiesCompleted: 12,
  },
]

async function seedUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    let admin = await User.findOne({ email: ADMIN_EMAIL })
    if (!admin) {
      admin = new User({
        name: 'System Administrator',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        authProvider: 'local',
      })
      await admin.save()
      console.log(`✅ Created admin user: ${ADMIN_EMAIL}`)
    } else {
      admin.role = 'admin'
      admin.password = ADMIN_PASSWORD
      admin.markModified('password')
      await admin.save()
      console.log(`✅ Admin user updated: ${ADMIN_EMAIL}`)
    }

    for (const userData of demoUsers) {
      const existingUser = await User.findOne({ email: userData.email })
      if (existingUser) {
        console.log(`✅ User ${userData.email} already exists`)
      } else {
        const user = new User(userData)
        await user.save()
        console.log(`✅ Created ${userData.role} user: ${userData.email}`)
      }
    }

    console.log('\n🎉 Setup complete!')
    console.log('\n🛡️ Admin:')
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log('\n👤 Demo user: user@demo.com / password123')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding users:', error)
    process.exit(1)
  }
}

seedUsers()
