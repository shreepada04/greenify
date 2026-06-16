import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabase } from '@/app/lib/supabase'
import crypto from 'crypto'

export const authOptions: NextAuthOptions = {
  ...({ trustHost: true } as any),
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
        const email = user.email.toLowerCase().trim()
        
        const { data: dbUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle()

        if (fetchError) {
          console.error('Supabase query error in signIn callback:', fetchError)
          return false
        }

        if (!dbUser) {
          const { error: createError } = await supabase
            .from('users')
            .insert({
              name: user.name || user.email.split('@')[0],
              email: email,
              google_id: account.providerAccountId,
              avatar: user.image || null,
              auth_provider: 'google',
              password: crypto.randomBytes(32).toString('hex'),
              role: 'user',
            })
          
          if (createError) {
            console.error('Failed to create google user:', createError)
            return false
          }
        } else if (!dbUser.google_id) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              google_id: account.providerAccountId,
              auth_provider: 'google',
              avatar: user.image || dbUser.avatar || null,
            })
            .eq('id', dbUser.id)

          if (updateError) {
            console.error('Failed to update user with Google ID:', updateError)
            return false
          }
        }
        return true
      } catch (e) {
        console.error('Google signIn error:', e)
        return false
      }
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'google' && user?.email) {
        const email = user.email.toLowerCase().trim()
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, role, email')
          .eq('email', email)
          .maybeSingle()
        
        if (dbUser) {
          token.userId = dbUser.id
          token.role = dbUser.role
          token.email = dbUser.email
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { id?: string }).id = token.userId as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
