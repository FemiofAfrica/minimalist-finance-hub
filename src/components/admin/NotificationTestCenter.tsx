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
import { User, Users, Send, Bell, RefreshCw } from 'lucide-react'

interface User {
  id: string
  email: string
  raw_user_meta_data?: {
    full_name?: string
    first_name?: string
    last_name?: string
  }
  user_metadata?: {
    full_name?: string
    first_name?: string
    last_name?: string
  }
}

const NotificationTestCenter: React.FC = () => {
  // User management
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Notification content
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState('')
  const [shouldTriggerEmail, setShouldTriggerEmail] = useState(false)

  // Segment settings
  const [segmentType, setSegmentType] = useState('time_based')
  const [duration, setDuration] = useState('7')
  const [durationUnit, setDurationUnit] = useState('days')

  // UI state
  const [sending, setSending] = useState(false)
  const [lastSentType, setLastSentType] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching users:', error)
        toast.error('Failed to fetch users')
        return
      }

      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const sendNotification = async (targetType: 'single' | 'segment') => {
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

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: requestBody
      })

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
        setUrl('')
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

            <div>
              <Label htmlFor="url" className="block mb-2">URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Optional link URL"
              />
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
