import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Bell, BellOff, TestTube } from 'lucide-react'
import pushNotificationService from '@/services/pushNotificationService'

const PushNotificationSettings: React.FC = () => {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    initializePushNotifications()
  }, [])

  const initializePushNotifications = async () => {
    try {
      setLoading(true)
      
      // Check if push notifications are supported
      const supported = 'serviceWorker' in navigator && 'PushManager' in window
      setIsSupported(supported)
      
      if (!supported) {
        setLoading(false)
        return
      }

      // Initialize service
      await pushNotificationService.initialize()
      
      // Check current permission
      setPermission(Notification.permission)
      
      // Check if already subscribed
      const subscribed = await pushNotificationService.isSubscribed()
      setIsSubscribed(subscribed)
      
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    try {
      setSubscribing(true)
      
      const subscription = await pushNotificationService.subscribe()
      if (subscription) {
        setIsSubscribed(true)
        setPermission('granted')
        toast.success('Push notifications enabled successfully!')
      } else {
        toast.error('Failed to enable push notifications')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast.error('Failed to enable push notifications')
    } finally {
      setSubscribing(false)
    }
  }

  const handleUnsubscribe = async () => {
    try {
      setSubscribing(true)
      
      const success = await pushNotificationService.unsubscribe()
      if (success) {
        setIsSubscribed(false)
        toast.success('Push notifications disabled successfully!')
      } else {
        toast.error('Failed to disable push notifications')
      }
    } catch (error) {
      console.error('Unsubscription error:', error)
      toast.error('Failed to disable push notifications')
    } finally {
      setSubscribing(false)
    }
  }

  const handleTestNotification = async () => {
    try {
      await pushNotificationService.sendTestNotification(
        'Test Notification',
        'This is a test push notification from kpege!',
        window.location.origin
      )
      toast.success('Test notification sent!')
    } catch (error) {
      console.error('Test notification error:', error)
      toast.error('Failed to send test notification')
    }
  }

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Granted</Badge>
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>
      case 'default':
        return <Badge variant="outline">Not requested</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getSubscriptionBadge = () => {
    if (isSubscribed) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
    } else {
      return <Badge variant="outline">Inactive</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Loading notification settings...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              Push notifications are not supported in your current browser. 
              Please use a modern browser like Chrome, Firefox, or Safari to enable push notifications.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Manage your push notification preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Permission Status</Label>
            <div>{getPermissionBadge()}</div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Subscription Status</Label>
            <div>{getSubscriptionBadge()}</div>
          </div>
        </div>

        {/* Permission Denied Warning */}
        {permission === 'denied' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">Notifications Blocked</h4>
            <p className="text-sm text-red-700 mb-3">
              You have blocked notifications for this site. To enable notifications:
            </p>
            <ol className="text-sm text-red-700 list-decimal list-inside space-y-1">
              <li>Click the notification icon in your browser's address bar</li>
              <li>Change the setting to "Allow"</li>
              <li>Refresh this page and try again</li>
            </ol>
          </div>
        )}

        {/* Main Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="push-notifications">Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive real-time notifications about your finances
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={isSubscribed ? handleUnsubscribe : handleSubscribe}
              disabled={subscribing || permission === 'denied'}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!isSubscribed && permission !== 'denied' && (
              <Button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                {subscribing ? 'Enabling...' : 'Enable Notifications'}
              </Button>
            )}

            {isSubscribed && (
              <Button
                variant="outline"
                onClick={handleUnsubscribe}
                disabled={subscribing}
                className="flex items-center gap-2"
              >
                <BellOff className="h-4 w-4" />
                {subscribing ? 'Disabling...' : 'Disable Notifications'}
              </Button>
            )}

            {isSubscribed && permission === 'granted' && (
              <Button
                variant="outline"
                onClick={handleTestNotification}
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                Send Test Notification
              </Button>
            )}
          </div>
        </div>

        {/* Information */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">About Push Notifications</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Get notified about important account activities</li>
            <li>• Receive alerts for unusual transactions</li>
            <li>• Stay updated on subscription renewals</li>
            <li>• You can disable notifications at any time</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default PushNotificationSettings 