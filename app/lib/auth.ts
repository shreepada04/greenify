import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export interface TokenPayload {
  userId: string
  email: string
  role: 'user' | 'admin'
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const accessToken = request.cookies.get('accessToken')?.value
  if (accessToken) return accessToken

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  const legacyToken = request.cookies.get('token')?.value
  return legacyToken || null
}

export async function getCurrentUser(request: NextRequest): Promise<TokenPayload | null> {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}
