import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { User, Users, Send, Bell, RefreshCw, History } from 'lucide-react'
import NotificationHistory from './NotificationHistory'
import CreateTestNotification from './CreateTestNotification'

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
  console.log('🎯 NotificationTestCenter component loaded/rendered!')
  
  // User management
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Notification content
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState<string>('/dashboard')
  const [shouldTriggerEmail, setShouldTriggerEmail] = useState(false)

  // Segment settings
  const [segmentType, setSegmentType] = useState('time_based')
  const [duration, setDuration] = useState('7')
  const [durationUnit, setDurationUnit] = useState('days')

  // UI state
  const [sending, setSending] = useState(false)
  const [lastSentType, setLastSentType] = useState<string | null>(null)
  
  // Preview state
  const [previewUsers, setPreviewUsers] = useState<User[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewCount, setPreviewCount] = useState(0)

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      
      // Get all users using RPC function (requires super admin permissions)
      const { data: users, error } = await supabase
        .rpc('get_all_users_for_admin')

      if (error) {
        console.error('Error fetching users:', error)
        toast.error('Failed to fetch users. Make sure you have admin permissions.. Make sure you have admin permissions.')
        return
      }

      // Debug: Log the raw user data to see what we're getting
      console.log('Raw user data from RPC:', users)
      
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
      
      console.log('Transformed users:', transformedUsers)

      setUsers(transformedUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users. Make sure you have admin permissions.')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const sendNotification = async (targetType: 'single' | 'segment') => {
    console.log('🚀 SEND NOTIFICATION FUNCTION CALLED!', targetType)
    alert('Send notification function called!')
    
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

      // Check if user has a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Session check:', { session: !!session, error: sessionError, hasToken: !!session?.access_token })
      
      if (sessionError || !session) {
        toast.error('You need to log in again to send notifications')
        console.error('Session error:', sessionError)
        return
      }

      // Verify session is valid and user is authenticated
      if (!session.access_token) {
        toast.error('Invalid session - please log in again')
        return
      }

      console.log('About to call function with session:', {
        userId: session.user.id,
        tokenLength: session.access_token.length,
        tokenPreview: session.access_token.substring(0, 20) + '...'
      })

      // Prepare headers with detailed logging
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };
      console.log('🔑 Headers being sent:', {
        hasAuthHeader: 'Authorization' in headers,
        authHeaderLength: headers.Authorization?.length,
        authHeaderPreview: headers.Authorization?.substring(0, 50) + '...',
        allHeaders: Object.keys(headers)
      });

      // Also log the token parts for debugging
      const tokenParts = session.access_token.split('.');
      console.log('🔍 Token structure check:', {
        tokenParts: tokenParts.length,
        headerPreview: tokenParts[0] ? atob(tokenParts[0]) : 'invalid',
        payloadPreview: tokenParts[1] ? JSON.parse(atob(tokenParts[1])) : 'invalid'
      });

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

      // Add current user ID to the request body so edge function can validate
      const requestWithUser = {
        ...requestBody,
        currentUserId: session.user.id
      }

      // Try direct fetch with all required headers
      console.log('🔍 Attempting direct fetch...')
      
      // Get the supabase URL and anon key from the client
      const supabaseUrl = (supabase as any).supabaseUrl
      const supabaseKey = (supabase as any).supabaseKey
      
      const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseKey,
          'X-Client-Info': 'supabase-js/2.x'
        },
        body: JSON.stringify(requestWithUser)
      })
      
      console.log('🔍 Direct fetch response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log('🔍 Error response body:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      const error = null

      if (error) {
        throw error
      }

      const responseText = typeof data === 'string' ? data : JSON.stringify(data)
      
      if (responseText.includes('success') || responseText.includes('sent')) {
        toast.success(`Notification sent successfully! ${shouldTriggerEmail ? '(Push + Email)' : '(Push only)'}`)
        setLastSentType(targetType)
        
        // Clear form
        setTitle('')
        setMessage('')
        setUrl('/dashboard')
        setShouldTriggerEmail(false)
        setSelectedUser('')
      } else {
        throw new Error(responseText)
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      toast.error(`Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSending(false)
    }
  }
  const previewSegmentUsers = async () => {
    if (segmentType === 'time_based') {
      try {
        setPreviewLoading(true)
        
        const now = new Date()
        let threshold = new Date()
        
        switch (durationUnit) {
          case 'hours':
            threshold.setHours(now.getHours() - parseInt(duration))
            break
          case 'days':
            threshold.setDate(now.getDate() - parseInt(duration))
            break
          case 'weeks':
            threshold.setDate(now.getDate() - (parseInt(duration) * 7))
            break
          case 'months':
            threshold.setMonth(now.getMonth() - parseInt(duration))
            break
        }

        const filteredUsers = users.filter(user => {
          const userCreatedAt = new Date(user.created_at || 0)
          return userCreatedAt >= threshold
        })

        setPreviewUsers(filteredUsers.slice(0, 5))
        setPreviewCount(filteredUsers.length)
      } catch (error) {
        console.error('Error previewing segment:', error)
      } finally {
        setPreviewLoading(false)
      }
    } else if (segmentType === 'all_users') {
      setPreviewUsers(users.slice(0, 5))
      setPreviewCount(users.length)
    } else if (segmentType === 'super_admins') {
      console.log('Checking for super admins. All users:', users)
      users.forEach(user => {
        console.log(`User ${user.email}:`, {
          raw_meta: user.raw_user_meta_data,
          user_meta: user.user_metadata,
          is_super_admin_raw: user.raw_user_meta_data?.is_super_admin,
          is_super_admin_user: user.user_metadata?.is_super_admin
        })
      })
      
      const superAdmins = users.filter(user => 
        user.raw_user_meta_data?.is_super_admin === true || 
        user.user_metadata?.is_super_admin === true
      )
      
      console.log('Found super admins:', superAdmins)
      setPreviewUsers(superAdmins.slice(0, 5))
      setPreviewCount(superAdmins.length)
    }
  }

  // Update preview when segment parameters change
  useEffect(() => {
    if (users.length > 0) {
      previewSegmentUsers()
    }
  }, [segmentType, duration, durationUnit, users])



  const getUserDisplayName = (user: User) => {
    const metadata = user.raw_user_meta_data || user.user_metadata || {}
    const fullName = metadata.full_name || 
                     (metadata.first_name && metadata.last_name ? 
                      `${metadata.first_name} ${metadata.last_name}` : 
                      metadata.first_name)
    return fullName || user.email?.split('@')[0] || 'Unknown User'
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">🔔 Notification Test Center</h2>
        <p className="text-muted-foreground">Send test notifications to users</p>
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="w-full justify-center">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Single User
          </TabsTrigger>
          <TabsTrigger value="segment" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Segment
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="quicktest" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Test with Link
          </TabsTrigger>
          <TabsTrigger value="quicktest" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Quick Test
          </TabsTrigger>
        </TabsList>

        {/* Notification Content Form */}
        <Card className="mt-4">
          <CardHeader className="text-center">
            <CardTitle>Notification Content</CardTitle>
            <CardDescription>
              Configure the notification message that will be sent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div>
              <Label htmlFor="title" className="block mb-2">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
              />
            </div>

            <div>
              <Label htmlFor="message" className="block mb-2">Message *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Notification message"
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="url">URL (optional)</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., /settings or /transactions"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
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
          </CardContent>
        </Card>

        <TabsContent value="single">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Single User Notification</CardTitle>
              <CardDescription>
                Send a test notification to a specific user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Label htmlFor="user-select" className="mr-4">Select User * ({users.length} users loaded)</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchUsers}
                  className="h-8"
                  disabled={loadingUsers}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingUsers ? 'animate-spin' : ''}`} />
                  Refresh Users
                </Button>
              </div>
              <div>
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

              <Button 
                onClick={() => sendNotification('single')}
                disabled={sending || !title.trim() || !message.trim() || !selectedUser}
                className="w-full flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send to Selected User'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segment">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>User Segment Notification</CardTitle>
              <CardDescription>
                Send notifications to a group of users based on criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Label htmlFor="segment-type" className="block mb-2">Segment Type</Label>
                <Select value={segmentType} onValueChange={(value: any) => setSegmentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time_based">Recent Users (Time-based)</SelectItem>
                    <SelectItem value="all_users">All Users</SelectItem>
                    <SelectItem value="super_admins">Super Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {segmentType === 'time_based' && (
                <div className="space-y-4">
                  <div className="flex justify-center gap-2">
                    <div className="flex-1 text-center">
                      <Label htmlFor="duration" className="block mb-2">Duration</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        min="1"
                      />
                    </div>
                    <div className="flex-1 text-center">
                      <Label htmlFor="duration-unit" className="block mb-2">Unit</Label>
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
                  <div className="text-center text-sm text-muted-foreground">
                    Will send to users who registered in the last {duration} {durationUnit}
                  </div>
                </div>
              )}

              {segmentType === 'all_users' && (
                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ This will send notifications to ALL users in the system. Use with caution.
                  </p>
                </div>
              )}

              {segmentType === 'super_admins' && (
                <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    🔐 This will only send notifications to users with super admin privileges.
                  </p>
                </div>
              )}

              {/* Segment Preview */}
              {users.length > 0 && (
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">📊 Target Preview</h4>
                  {previewLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-green-700">Calculating target users...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-green-800 font-medium">
                        📈 {previewCount} user{previewCount !== 1 ? 's' : ''} will receive this notification
                      </p>
                      {previewUsers.length > 0 && (
                        <div className="text-xs text-green-700">
                          <p className="mb-1">👥 Sample users:</p>
                          <div className="space-y-1">
                            {previewUsers.map((user, index) => (
                              <div key={user.id} className="flex items-center justify-center gap-2">
                                <span>{getUserDisplayName(user)}</span>
                                <span className="text-green-600">({user.email})</span>
                              </div>
                            ))}
                            {previewCount > 5 && (
                              <p className="text-green-600 italic">...and {previewCount - 5} more</p>
                            )}
                          </div>
                        </div>
                      )}
                      {previewCount === 0 && (
                        <p className="text-sm text-amber-700">⚠️ No users match the current criteria</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="text-center">
                <Button 
                  onClick={() => sendNotification('segment')}
                  disabled={sending || !title.trim() || !message.trim()}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  {sending ? 'Sending...' : `Send to ${segmentType === 'time_based' ? 'Recent Users' : segmentType === 'all_users' ? 'All Users' : 'Super Admins'}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <NotificationHistory />
        </TabsContent>

        <TabsContent value="quicktest" className="space-y-4">
          <div className="flex flex-col space-y-4">
            <h2 className="text-xl font-semibold">Quick Test Notification</h2>
            <p className="text-sm text-muted-foreground">
              Create a test notification with a link to verify the "View Details" button appears.
            </p>
            <CreateTestNotification />
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Display */}
      {lastSentType && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-800">
              <Bell className="h-5 w-5" />
              <span className="font-medium">Last notification sent successfully!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Sent to: {lastSentType === 'single' ? 'Selected user' : 
                       segmentType === 'time_based' ? `Users from last ${duration} ${durationUnit}` :
                       segmentType === 'all_users' ? 'All users' : 'Super admins'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default NotificationTestCenter
