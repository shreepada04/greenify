import { supabase } from './supabase'
import bcrypt from 'bcryptjs'

const ADMIN_EMAIL = 'admin@greenify.com'
const ADMIN_PASSWORD = 'GreenifyAdmin2024!'

export async function initializeAdmin() {
  try {
    const { data: existingAdmin, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', ADMIN_EMAIL)
      .maybeSingle()

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          name: 'System Administrator',
          email: ADMIN_EMAIL,
          password: hashedPassword,
          role: 'admin',
          auth_provider: 'local',
          points: 0,
          total_points_earned: 0,
          level: 1,
          activities_completed: 0,
        })
      if (insertError) {
        console.error('Failed to create admin in initAdmin:', insertError)
      } else {
        console.log('✅ Built-in admin user created successfully in Supabase')
      }
    } else if (existingAdmin.role !== 'admin') {
      await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('email', ADMIN_EMAIL)
      console.log('✅ Existing user promoted to admin in Supabase:', ADMIN_EMAIL)
    }
  } catch (error) {
    console.error('❌ Error initializing admin user:', error)
  }
}

export const ADMIN_CREDENTIALS = {
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
}
