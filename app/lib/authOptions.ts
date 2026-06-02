import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import dbConnectSimple from '@/app/lib/mongodb-simple'
import User from '@/app/lib/models/User'
import crypto from 'crypto'

// Google OAuth redirect URI (add EXACTLY in Google Cloud Console):
// {NEXTAUTH_URL}/api/auth/callback/google
export const authOptions: NextAuthOptions = {
  // Required on Firebase App Hosting / custom domains (NextAuth UntrustedHost)
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  debug: process.env.NODE_ENV === 'development',
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google' || !user.email) return false
      try {
        await dbConnectSimple()
        let dbUser = await User.findOne({ email: user.email.toLowerCase() })
        if (!dbUser) {
          dbUser = await User.create({
            name: user.name || user.email.split('@')[0],
            email: user.email.toLowerCase(),
            googleId: account.providerAccountId,
            avatar: user.image,
            authProvider: 'google',
            password: crypto.randomBytes(32).toString('hex'),
            role: 'user',
          })
        } else if (!dbUser.googleId) {
          dbUser.googleId = account.providerAccountId
          dbUser.authProvider = 'google'
          if (user.image) dbUser.avatar = user.image
          await dbUser.save()
        }
        return true
      } catch (e) {
        console.error('Google signIn error:', e)
        return false
      }
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'google' && user?.email) {
        await dbConnectSimple()
        const dbUser = await User.findOne({ email: user.email.toLowerCase() })
        if (dbUser) {
          token.userId = dbUser._id.toString()
          token.role = dbUser.role
          token.email = dbUser.email
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
