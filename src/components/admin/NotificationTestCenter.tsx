import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { User, Users, Send, RefreshCw, Shield, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import NotificationHistory from './NotificationHistory'

interface User {
  id: string
  email: string
  created_at?: string
  raw_user_meta_data?: {
    full_name?: string
    first_name?: string
    last_name?: string
    is_super_admin?: boolean
  }
  user_metadata?: {
    full_name?: string
    first_name?: string
    last_name?: string
    is_super_admin?: boolean
  }
}

const NotificationTestCenter: React.FC = () => {
  const { user } = useAuth()
  
  // User management
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Notification content
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState<string>('/dashboard')
  const [shouldTriggerEmail, setShouldTriggerEmail] = useState(false)

  // Target selection
  const [targetType, setTargetType] = useState<'single' | 'segment'>('single')
  const [segmentType, setSegmentType] = useState('all_users')
  const [duration, setDuration] = useState('7')
  const [durationUnit, setDurationUnit] = useState('days')

  // UI state
  const [sending, setSending] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  // Check if user is super admin
  useEffect(() => {
    const checkIfAdmin = () => {
      if (user) {
        // Check all possible metadata locations to match edge function logic
        const isUserAdmin = user.user_metadata?.is_super_admin === true || 
                           user.app_metadata?.is_super_admin === true ||
                           user.raw_user_meta_data?.is_super_admin === true ||
                           user.raw_app_meta_data?.is_super_admin === true
        
        console.log('🔍 Admin check - user metadata:', {
          userMetadata: user.user_metadata?.is_super_admin,
          appMetadata: user.app_metadata?.is_super_admin,
          rawUserMetadata: user.raw_user_meta_data?.is_super_admin,
          rawAppMetadata: user.raw_app_meta_data?.is_super_admin,
          finalResult: isUserAdmin
        })
        
        setIsAdmin(isUserAdmin)
        
        if (!isUserAdmin) {
          toast.error('Access denied: Super admin privileges required')
        }
      } else {
        setIsAdmin(false)
      }
      setCheckingAdmin(false)
    }
    
    checkIfAdmin()
  }, [user])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      
      // Get all users using RPC function (requires super admin permissions)
      const { data: users, error } = await supabase
        .rpc('get_all_users_for_admin')

      if (error) {
        console.error('Error fetching users:', error)
        toast.error('Failed to fetch users. Make sure you have admin permissions.')
        return
      }

      // Transform the user data to match our User interface
      const transformedUsers = users?.map(user => ({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        raw_user_meta_data: {
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          is_super_admin: user.is_super_admin
        },
        user_metadata: {
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          is_super_admin: user.is_super_admin
        }
      })) || []

      setUsers(transformedUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users. Make sure you have admin permissions.')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  const sendNotification = async () => {
    if (!isAdmin) {
      toast.error('Access denied: Super admin privileges required')
      return
    }

    if (!title.trim() || !message.trim()) {
      toast.error('Please fill in both title and message')
      return
    }

    if (targetType === 'single' && !selectedUser) {
      toast.error('Please select a user')
      return
    }

    try {
      setSending(true)

      // Force refresh session to ensure JWT contains latest metadata
      console.log('🔄 Refreshing session to ensure JWT contains latest metadata...')
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError || !session) {
        console.error('Session refresh error:', refreshError)
        toast.error('Authentication error - please log in again')
        return
      }

      console.log('✅ Session refreshed successfully')

      // Verify session is valid and user is authenticated
      if (!session.access_token) {
        toast.error('Invalid session - please log in again')
        return
      }

      // Double-check the user metadata in the session
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('User validation error:', userError)
        toast.error('Authentication error - please log in again')
        return
      }

      console.log('🔍 Current user metadata before request:', {
        userMetadata: user.user_metadata?.is_super_admin,
        appMetadata: user.app_metadata?.is_super_admin,
        rawUserMetadata: user.raw_user_meta_data?.is_super_admin,
        rawAppMetadata: user.raw_app_meta_data?.is_super_admin
      })

      let requestBody: any = {
        title: title.trim(),
        message: message.trim(),
        url: url.trim() || undefined,
        shouldTriggerEmail
      }

      if (targetType === 'single') {
        requestBody.targetType = 'single'
        requestBody.userId = selectedUser
      } else {
        requestBody.targetType = 'segment'
        
        if (segmentType === 'time_based') {
          requestBody.segment = 'time_based'
          requestBody.duration = parseInt(duration)
          requestBody.durationUnit = durationUnit
        } else if (segmentType === 'all_users') {
          requestBody.segment = 'all_users'
        } else if (segmentType === 'super_admins') {
          requestBody.segment = 'super_admins'
        }
      }

      console.log('📤 Sending request to edge function...')
      console.log('📋 Request body:', JSON.stringify(requestBody, null, 2))

      // Use direct fetch instead of supabase.functions.invoke() to ensure custom headers are sent
      const response = await fetch('https://idcgvnwatraddbsppxzl.supabase.co/functions/v1/send-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': 'temp-admin-key-for-debugging',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2d2bndhdHJhZGRic3BweHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MzQ3MTQsImV4cCI6MjA0OTAxMDcxNH0.lK-QWwvU5l_reDp3cY_QkWOo4EGKBqsqB-Qj_y_EeXE'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Fetch error:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log('Edge function response:', data)
      console.log('📊 Response details:', JSON.stringify(data.details, null, 2))

      // Properly parse the response
      const responseData = typeof data === 'string' ? JSON.parse(data) : data
      
      if (responseData.success) {
        const details = responseData.details || {}
        const totalSent = details.totalSent || 0
        const totalTargeted = details.totalTargeted || 0
        const errors = details.errors || []
        
        if (errors.length > 0) {
          // Partial success - some notifications failed
          toast.error(`Partially successful: ${totalSent}/${totalTargeted} sent. Errors: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`)
        } else {
          // Full success
          toast.success(`Notification sent successfully! ${totalSent}/${totalTargeted} delivered ${shouldTriggerEmail ? '(Push + Email)' : '(Push only)'}`)
        }
        
        // Clear form only on full success
        if (errors.length === 0) {
          setTitle('')
          setMessage('')
          setUrl('/dashboard')
          setShouldTriggerEmail(false)
          setSelectedUser('')
        }
      } else {
        // Full failure
        const details = responseData.details || {}
        const errors = details.errors || []
        const errorMessage = errors.length > 0 ? errors.join('; ') : 'Unknown error occurred'
        throw new Error(`Notification failed: ${errorMessage}`)
      }
      
    } catch (error) {
      console.error('Error sending notification:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to send notification: ${errorMessage}`)
    } finally {
      setSending(false)
    }
  }

  const getUserDisplayName = (user: User) => {
    const firstName = user.raw_user_meta_data?.first_name || user.user_metadata?.first_name
    const lastName = user.raw_user_meta_data?.last_name || user.user_metadata?.last_name
    const fullName = user.raw_user_meta_data?.full_name || user.user_metadata?.full_name
    
    if (firstName && lastName) return `${firstName} ${lastName}`
    if (fullName) return fullName
    if (firstName) return firstName
    return user.email.split('@')[0]
  }

  const getPreviewText = () => {
    if (targetType === 'single') {
      const user = users.find(u => u.id === selectedUser)
      return user ? `Will send to: ${getUserDisplayName(user)} (${user.email})` : 'No user selected'
    } else {
      if (segmentType === 'all_users') return `Will send to ALL ${users.length} users`
      if (segmentType === 'super_admins') {
        const adminCount = users.filter(u => 
          u.raw_user_meta_data?.is_super_admin || u.user_metadata?.is_super_admin
        ).length
        return `Will send to ${adminCount} super admin(s)`
      }
      if (segmentType === 'time_based') return `Will send to recent users (${duration} ${durationUnit})`
    }
    return ''
  }

  // Show loading state while checking admin privileges
  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying admin privileges...</p>
        </div>
      </div>
    )
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4">
              Super admin privileges are required to access the Notification Test Center.
            </p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact your system administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showHistory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-center w-full">
            <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
              <Shield className="h-5 w-5" />
              Notification History
            </h3>
            <p className="text-muted-foreground">View all sent notifications</p>
          </div>
          <Button variant="outline" onClick={() => setShowHistory(false)}>
            Back to Notifications
          </Button>
        </div>
        <NotificationHistory />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
          <Shield className="h-5 w-5" />
          Notification Management
        </h3>
        <p className="text-muted-foreground">Send notifications to users and segments</p>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => setShowHistory(true)}>
          View Notification History
        </Button>
      </div>

      {/* Unified Notification Form */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Send Notification</CardTitle>
          <CardDescription>
            Configure and send notifications to users or segments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium block text-center">Target Audience</Label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={targetType === 'single' ? 'default' : 'outline'}
                onClick={() => setTargetType('single')}
                className="flex items-center gap-2 h-12"
              >
                <User className="h-4 w-4" />
                Single User
              </Button>
              <Button
                variant={targetType === 'segment' ? 'default' : 'outline'}
                onClick={() => setTargetType('segment')}
                className="flex items-center gap-2 h-12"
              >
                <Users className="h-4 w-4" />
                User Segment
              </Button>
            </div>
          </div>

          {/* Single User Selection */}
          {targetType === 'single' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-center flex-1">Select User ({users.length} users loaded)</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchUsers}
                  disabled={loadingUsers}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingUsers ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getUserDisplayName(user)}</span>
                        <span className="text-muted-foreground text-sm">({user.email})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Segment Selection */}
          {targetType === 'segment' && (
            <div className="space-y-4">
              <Label className="block text-center">Segment Type</Label>
              <Select value={segmentType} onValueChange={setSegmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_users">All Users</SelectItem>
                  <SelectItem value="super_admins">Super Admins Only</SelectItem>
                  <SelectItem value="time_based">Recent Users (Time-based)</SelectItem>
                </SelectContent>
              </Select>

              {segmentType === 'time_based' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <Label className="block text-center mb-2">Duration</Label>
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min="1"
                      className="text-center"
                    />
                  </div>
                  <div className="text-center">
                    <Label className="block text-center mb-2">Unit</Label>
                    <Select value={durationUnit} onValueChange={setDurationUnit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {segmentType === 'all_users' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 text-center">
                    ⚠️ This will send notifications to ALL users in the system. Use with caution.
                  </p>
                </div>
              )}

              {segmentType === 'super_admins' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 text-center">
                    🔐 This will only send notifications to users with super admin privileges.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium text-center">
              📊 {getPreviewText()}
            </p>
          </div>

          {/* Notification Content */}
          <div className="space-y-4">
            <div className="text-center">
              <Label htmlFor="title" className="block text-center mb-2">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
                className="text-center"
              />
            </div>

            <div className="text-center">
              <Label htmlFor="message" className="block text-center mb-2">Message *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Notification message"
                rows={3}
                className="text-center"
              />
            </div>

            <div className="text-center">
              <Label htmlFor="url" className="block text-center mb-2">URL (optional)</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., /settings or /transactions"
                className="text-center"
              />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Add a URL to make the notification clickable
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 p-3 border rounded-lg bg-blue-50 border-blue-200">
              <input
                type="checkbox"
                id="shouldTriggerEmail"
                checked={shouldTriggerEmail}
                onChange={(e) => setShouldTriggerEmail(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <Label htmlFor="shouldTriggerEmail" className="text-sm font-medium text-blue-900">
                📧 Also send email notification
              </Label>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-center">
            <Button 
              onClick={sendNotification}
              disabled={sending || !title.trim() || !message.trim() || (targetType === 'single' && !selectedUser)}
              className="flex items-center justify-center gap-2 h-12 px-8"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send Notification'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NotificationTestCenter
