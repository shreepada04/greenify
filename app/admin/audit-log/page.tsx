'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Leaf, ArrowLeft, Clock, User, Filter, 
  Calendar, RefreshCw, CheckCircle, XCircle, Gift, 
  AlertCircle, Shield, Activity, FileText
} from 'lucide-react'
import ThemeToggle from '@/app/components/ThemeToggle'
import { useToast } from '@/app/hooks/useToast'
import { ToastContainer } from '@/app/components/Toast'
import { useAdminGuard } from '@/app/hooks/useAdminGuard'

interface AuditLog {
  id: string
  eventType: string
  actorName: string
  actorRole: 'admin' | 'user' | 'system'
  targetType?: 'user' | 'activity' | 'reward' | 'media'
  targetId?: string
  summary: string
  metadata?: Record<string, any>
  createdAt: string
}

export default function AdminAuditLogPage() {
  const { user, loading } = useAdminGuard()
  const router = useRouter()
  const { toasts, success, error, removeToast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [limit, setLimit] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  const filterOptions = [
    { id: 'all', name: 'All Events' },
    { id: 'user.registered', name: 'Registrations' },
    { id: 'activity.submitted', name: 'Submissions' },
    { id: 'activity.approved', name: 'Approvals' },
    { id: 'activity.rejected', name: 'Rejections' },
    { id: 'reward.redeemed', name: 'Redemptions' },
    { id: 'media.verified', name: 'Verifications' },
    { id: 'system.seed', name: 'System Seeding' },
  ]

  useEffect(() => {
    if (!loading && user) {
      fetchLogs()
    }
  }, [user, loading, eventTypeFilter, limit])

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true)
      const url = new URL('/api/admin/audit-log', window.location.origin)
      if (eventTypeFilter !== 'all') {
        url.searchParams.append('eventType', eventTypeFilter)
      }
      url.searchParams.append('limit', limit.toString())

      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setTotalCount(data.total || 0)
      } else {
        error('Error', 'Failed to load audit logs')
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
      error('Error', 'Failed to load audit logs')
    } finally {
      setLoadingLogs(false)
    }
  }

  const getEventBadge = (eventType: string) => {
    const config = {
      'user.registered': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'activity.submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'activity.approved': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      'activity.rejected': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'reward.redeemed': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'media.verified': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      'system.seed': 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
    }
    return config[eventType as keyof typeof config] || 'bg-gray-100 text-gray-800'
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'user.registered': return User
      case 'activity.submitted': return Activity
      case 'activity.approved': return CheckCircle
      case 'activity.rejected': return XCircle
      case 'reward.redeemed': return Gift
      case 'media.verified': return Shield
      case 'system.seed': return Leaf
      default: return FileText
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-500">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-2xl border-b border-white/20 dark:border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mr-6 bg-gray-100 dark:bg-gray-700 p-2.5 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Dashboard
              </button>
              <div className="flex items-center space-x-3">
                <Leaf className="h-8 w-8 text-primary-600" />
                <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-green-600 bg-clip-text text-transparent">
                  Greenify Admin
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">System Administrator</div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center space-x-3">
                <Shield className="h-9 w-9 text-primary-600" />
                <span>System Activity Audit Logs</span>
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                Track all registrations, submissions, reviews, and reward redemptions on the Greenify platform.
              </p>
            </div>
            <button
              onClick={fetchLogs}
              className="mt-4 md:mt-0 flex items-center justify-center space-x-2 px-5 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200 font-medium hover:scale-105"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Logs</span>
            </button>
          </div>

          {/* Controls & Filter */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-700/50 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setEventTypeFilter(opt.id)}
                  className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                    eventTypeFilter === opt.id
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={20}>20 entries</option>
                <option value={50}>50 entries</option>
                <option value={100}>100 entries</option>
              </select>
            </div>
          </div>

          {/* Logs Table / List */}
          {loadingLogs ? (
            <div className="flex justify-center items-center py-20 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-3xl shadow-xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700/50">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/75 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase border-b border-gray-100 dark:border-gray-700">
                      <th className="px-6 py-5">Timestamp</th>
                      <th className="px-6 py-5">Event Type</th>
                      <th className="px-6 py-5">Actor</th>
                      <th className="px-6 py-5">Summary</th>
                      <th className="px-6 py-5">Metadata Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 text-sm">
                    {logs.map((log) => {
                      const Icon = getEventIcon(log.eventType)
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-all duration-150">
                          <td className="px-6 py-5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getEventBadge(log.eventType)}`}>
                              <Icon className="h-3.5 w-3.5" />
                              {log.eventType}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div>
                              <span className="font-semibold text-gray-900 dark:text-white">{log.actorName}</span>
                              <span className={`ml-2 px-2 py-0.5 text-3xs font-medium rounded uppercase ${
                                log.actorRole === 'admin' 
                                  ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' 
                                  : log.actorRole === 'user'
                                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
                                  : 'bg-gray-50 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400'
                              }`}>
                                {log.actorRole}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-medium text-gray-900 dark:text-white max-w-xs md:max-w-md">
                            {log.summary}
                          </td>
                          <td className="px-6 py-5 text-xs text-gray-500 dark:text-gray-400">
                            {log.metadata && Object.keys(log.metadata).length > 0 ? (
                              <pre className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto font-mono text-3xs">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {logs.length === 0 && (
                <div className="text-center py-20">
                  <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No logs found</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    No activity logs match the selected event type.
                  </p>
                </div>
              )}

              {/* Summary Footer */}
              <div className="bg-gray-50/75 dark:bg-gray-700/50 px-6 py-5 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>Showing {logs.length} of {totalCount} entries</span>
                <span>Audit Logs are auto-recorded for platform compliance</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}
