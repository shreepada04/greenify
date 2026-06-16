import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { generateTokenPair } from '@/app/lib/jwt'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    console.log('Login attempt for:', email)

    // Validate input
    if (!email || !password) {
      console.log('Missing email or password')
      return NextResponse.json(
        { error: 'Please provide email and password' },
        { status: 400 }
      )
    }

    const cleanEmail = email.toLowerCase().trim()

    // Find user in database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (error || !user) {
      console.log('User not found or query error:', email, error)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (user.auth_provider === 'google' && !user.password) {
      return NextResponse.json(
        { error: 'This account uses Google sign-in. Please use Continue with Google.' },
        { status: 400 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      console.log('Password comparison failed for:', email)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    }, 0)

    // Return user data (without password) and tokens
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      points: user.points,
      totalPointsEarned: user.total_points_earned,
      level: user.level,
      activitiesCompleted: user.activities_completed,
    }

    // Set both access and refresh tokens as httpOnly cookies
    const response = NextResponse.json({ 
      user: userData,
      message: 'Login successful',
    })

    // Set access token cookie
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    })

    // Set refresh token cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
