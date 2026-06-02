import { NextRequest, NextResponse } from 'next/server'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import User from '@/app/lib/models/User'
import { generateTokenPair } from '@/app/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    await dbConnectSimple()
    
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

    // Find user in database (include password for verification)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (user.authProvider === 'google' && !user.password) {
      return NextResponse.json(
        { error: 'This account uses Google sign-in. Please use Continue with Google.' },
        { status: 400 }
      )
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      console.log('Password comparison failed for:', email)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = generateTokenPair({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    }, 0)

    // Return user data (without password) and tokens
    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      points: user.points,
      totalPointsEarned: user.totalPointsEarned,
      level: user.level,
      activitiesCompleted: user.activitiesCompleted
    }

    // Set both access and refresh tokens as httpOnly cookies
    const response = NextResponse.json({ 
      user: userData,
      message: 'Login successful'
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
