import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Smartphone, 
  Users, 
  User,
  RefreshCw,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface Notification {
  id: string
  title: string
  message: string
  url?: string
  notification_type: 'push' | 'email' | 'both'
  status: 'pending' | 'sent' | 'failed'
  sent_at?: string
  created_at: string
  error_message?: string
  metadata: {
    targetType: 'single' | 'segment'
    segment?: string
    totalTargeted: number
    totalSent: number
    pushResults: number
    emailResults: number
  } | null
}

const NotificationHistory: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error loading notifications:', error)
        toast.error('Failed to load notification history')
        return
      }

      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('Failed to load notification history')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadNotifications()
    setRefreshing(false)
    toast.success('Notification history refreshed')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'push':
        return <Badge variant="secondary"><Smartphone className="w-3 h-3 mr-1" />Push</Badge>
      case 'email':
        return <Badge variant="secondary"><Mail className="w-3 h-3 mr-1" />Email</Badge>
      case 'both':
        return <Badge variant="secondary"><Mail className="w-3 h-3 mr-1" /><Smartphone className="w-3 h-3 ml-1" />Both</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getTargetInfo = (metadata: Notification['metadata']) => {
    // Handle null or undefined metadata
    if (!metadata) {
      return {
        icon: <Users className="w-4 h-4" />,
        text: 'Unknown Target'
      }
    }

    if (metadata.targetType === 'single') {
      return {
        icon: <User className="w-4 h-4" />,
        text: 'Single User'
      }
    }

    if (metadata.targetType === 'segment') {
      const segmentMap: Record<string, string> = {
        'super_admins': 'Super Admins',
        'all_users': 'All Users',
        'time_based': 'Time-based Segment'
      }
      
      return {
        icon: <Users className="w-4 h-4" />,
        text: segmentMap[metadata.segment || ''] || 'Segment'
      }
    }

    return {
      icon: <Users className="w-4 h-4" />,
      text: 'Unknown'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const truncateMessage = (message: string, maxLength: number = 100) => {
    return message.length > maxLength ? `${message.substring(0, maxLength)}...` : message
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading notification history...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Notification History
            </CardTitle>
            <CardDescription>
              View all sent notifications and their delivery status
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No notifications sent yet</p>
            <p className="text-sm">Sent notifications will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {notifications.map((notification) => {
                const targetInfo = getTargetInfo(notification.metadata)
                
                return (
                  <div key={notification.id} className="border rounded-lg p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {truncateMessage(notification.message)}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {getStatusBadge(notification.status)}
                        {getTypeBadge(notification.notification_type)}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        {targetInfo.icon}
                        <span className="text-muted-foreground">{targetInfo.text}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span className="text-muted-foreground">
                          {notification.metadata?.totalSent || 0}/{notification.metadata?.totalTargeted || 0} sent
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-muted-foreground">
                          {notification.sent_at ? formatDate(notification.sent_at) : formatDate(notification.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-muted-foreground">
                          {notification.sent_at ? 'Sent' : 'Created'} {new Date(notification.sent_at || notification.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Results breakdown */}
                    {(notification.metadata?.pushResults > 0 || notification.metadata?.emailResults > 0) && (
                      <div className="flex gap-4 text-sm">
                        {notification.metadata?.pushResults > 0 && (
                          <div className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            <span className="text-muted-foreground">{notification.metadata.pushResults} push</span>
                          </div>
                        )}
                        {notification.metadata?.emailResults > 0 && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="text-muted-foreground">{notification.metadata.emailResults} email</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error message */}
                    {notification.error_message && (
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <p className="text-sm text-red-800">
                          <strong>Error:</strong> {notification.error_message}
                        </p>
                      </div>
                    )}

                    {/* URL */}
                    {notification.url && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">URL: </span>
                        <a 
                          href={notification.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {notification.url}
                        </a>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export default NotificationHistory 