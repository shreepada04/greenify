import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { supabase } from '@/app/lib/supabase'
import { authOptions } from '@/app/lib/authOptions'
import { generateTokenPair } from '@/app/lib/jwt'

/**
 * After Google OAuth via NextAuth, issue Greenify JWT cookies and redirect.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url))
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email.toLowerCase())
      .maybeSingle()

    if (error || !user) {
      return NextResponse.redirect(new URL('/login?error=user_not_found', request.url))
    }

    const { accessToken, refreshToken } = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const redirectTo =
      user.role === 'admin' ? '/admin/dashboard' : '/dashboard'

    const response = NextResponse.redirect(new URL(redirectTo, request.url))

    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    })
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    })

    return response
  } catch (error) {
    console.error('OAuth bridge error:', error)
    return NextResponse.redirect(new URL('/login?error=oauth_bridge', request.url))
  }
}
