import mongoose from 'mongoose'
import User from './models/User'

const ADMIN_EMAIL = 'admin@greenify.com'
const ADMIN_PASSWORD = 'GreenifyAdmin2024!'

export async function initializeAdmin() {
  try {
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.MONGODB_URI
      if (!uri) throw new Error('MONGODB_URI not set')
      await mongoose.connect(uri)
    }

    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL })

    if (!existingAdmin) {
      const adminUser = new User({
        name: 'System Administrator',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        authProvider: 'local',
        points: 0,
        totalPointsEarned: 0,
        level: 1,
        activitiesCompleted: 0,
      })

      await adminUser.save()
      console.log('✅ Built-in admin user created successfully')
    } else if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin'
      await existingAdmin.save()
      console.log('✅ Existing user promoted to admin:', ADMIN_EMAIL)
    }
  } catch (error) {
    console.error('❌ Error initializing admin user:', error)
  }
}

export const ADMIN_CREDENTIALS = {
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
}
