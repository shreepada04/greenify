import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { generateTokenPair } from '@/app/lib/jwt'
import { createAuditLog } from '@/app/lib/auditLog'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Please provide all required fields' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    const cleanEmail = email.toLowerCase().trim()

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create new user in Supabase
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: 'user',
      })
      .select()
      .maybeSingle()

    if (createError) {
      console.error('User registration insert error:', createError)
      // Check for PostgreSQL unique constraint violation (code 23505)
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Create audit log
    await createAuditLog({
      eventType: 'user.registered',
      actorId: user.id,
      actorName: user.name,
      actorRole: 'user',
      summary: `New user registration: ${user.name} (${user.email})`,
    })

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

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

    const response = NextResponse.json({ 
      user: userData,
      message: 'Registration successful',
    }, { status: 201 })

    // Set access token cookie
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    })

    // Set refresh token cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    })

    return response

  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
