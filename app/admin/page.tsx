'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/lib/AuthProvider'
import { Leaf, Mail, Lock, AlertCircle, Shield } from 'lucide-react'

export default function AdminLoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, logout, user, loading: authLoading, refreshUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      router.replace('/admin/dashboard')
    }
  }, [authLoading, user, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400" />
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      const result = await login(formData.email, formData.password)

      if (result.success && result.user) {
        if (result.user.role === 'admin') {
          await refreshUser()
          router.replace('/admin/dashboard')
        } else {
          setError('Access denied. Admin privileges required.')
          await logout()
        }
      } else {
        setError(result.message || 'Invalid email or password')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center">
            <Leaf className="h-12 w-12 text-primary-400" />
            <span className="ml-2 text-3xl font-bold text-white">Greenify</span>
          </Link>
          <div className="mt-6 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary-400 mr-2" />
            <h2 className="text-3xl font-bold text-white">Admin Portal</h2>
          </div>
          <p className="mt-2 text-sm text-gray-300">
            Restricted access for administrators only
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-3 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="admin@greenify.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-3 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="Enter admin password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {loading ? 'Authenticating...' : 'Access Admin Panel'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link href="/login" className="text-sm text-gray-400 hover:text-gray-300 block">
              ← Back to User Login
            </Link>
            <p className="text-xs text-gray-500">
              Default: admin@greenify.com / GreenifyAdmin2024!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
