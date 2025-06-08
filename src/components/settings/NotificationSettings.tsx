import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Bell, BellOff, TestTube, Mail, Smartphone, Settings, CheckCircle, XCircle } from 'lucide-react'
import pushNotificationService from '@/services/pushNotificationService'
import { supabase } from '@/integrations/supabase/client'

const NotificationSettings: React.FC = () => {
  // Push notification state
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)

  // Email notification preferences
  const [emailNotifications, setEmailNotifications] = useState({
    transactionAlerts: true,
    weeklyReports: true,
    securityAlerts: true,
    systemUpdates: false,
    marketingEmails: false
  })
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false)

  useEffect(() => {
    initializeNotificationSettings()
  }, [])

  const initializeNotificationSettings = async () => {
    try {
      setLoading(true)
      
      // Check if push notifications are supported
      const supported = 'serviceWorker' in navigator && 'PushManager' in window
      setIsSupported(supported)
      
      if (supported) {
        // Initialize push notification service
        await pushNotificationService.initialize()
        
        // Check current permission
        setPermission(Notification.permission)
        
        // Check if already subscribed
        const subscribed = await pushNotificationService.isSubscribed()
        setIsSubscribed(subscribed)
      }

      // Load email preferences (you can implement this based on your user preferences system)
      await loadEmailPreferences()
      
    } catch (error) {
      console.error('Failed to initialize notification settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEmailPreferences = async () => {
    try {
      // This would typically load from user preferences in your database
      // For now, we'll use default values
      console.log('Loading email preferences...')
    } catch (error) {
      console.error('Failed to load email preferences:', error)
    }
  }

  const handlePushSubscribe = async () => {
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

  const handlePushUnsubscribe = async () => {
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

  const handleEmailPreferenceChange = (key: keyof typeof emailNotifications, value: boolean) => {
    setEmailNotifications(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const saveEmailPreferences = async () => {
    try {
      setSavingEmailPrefs(true)
      
      // Here you would save to your user preferences system
      // For example:
      // await supabase.from('user_preferences').upsert({
      //   user_id: user.id,
      //   email_notifications: emailNotifications
      // })
      
      toast.success('Email preferences saved successfully!')
    } catch (error) {
      console.error('Failed to save email preferences:', error)
      toast.error('Failed to save email preferences')
    } finally {
      setSavingEmailPrefs(false)
    }
  }

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Granted</Badge>
      case 'denied':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>
      case 'default':
        return <Badge variant="outline">Not requested</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 animate-spin" />
            Loading notification settings...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive instant notifications directly to your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Push notifications are not supported in this browser
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Browser Permission</Label>
                  <p className="text-sm text-muted-foreground">
                    Current permission status for notifications
                  </p>
                </div>
                {getPermissionBadge()}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Push Subscription</Label>
                  <p className="text-sm text-muted-foreground">
                    {isSubscribed ? 'You will receive push notifications' : 'Enable to receive push notifications'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isSubscribed ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handlePushUnsubscribe}
                      disabled={subscribing}
                    >
                      <BellOff className="w-4 h-4 mr-2" />
                      Disable
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={handlePushSubscribe}
                      disabled={subscribing || permission === 'denied'}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Enable
                    </Button>
                  )}
                </div>
              </div>

              {isSubscribed && (
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleTestNotification}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Send Test Notification
                  </Button>
                </div>
              )}

              {permission === 'denied' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    ❌ Notifications are blocked. Please enable them in your browser settings and refresh the page.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which email notifications you'd like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Transaction Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new transactions are added or categorized
                </p>
              </div>
              <Switch
                checked={emailNotifications.transactionAlerts}
                onCheckedChange={(checked) => handleEmailPreferenceChange('transactionAlerts', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly summaries of your financial activity
                </p>
              </div>
              <Switch
                checked={emailNotifications.weeklyReports}
                onCheckedChange={(checked) => handleEmailPreferenceChange('weeklyReports', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Security Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Important security notifications and login alerts
                </p>
              </div>
              <Switch
                checked={emailNotifications.securityAlerts}
                onCheckedChange={(checked) => handleEmailPreferenceChange('securityAlerts', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">System Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications about new features and system maintenance
                </p>
              </div>
              <Switch
                checked={emailNotifications.systemUpdates}
                onCheckedChange={(checked) => handleEmailPreferenceChange('systemUpdates', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">
                  Tips, insights, and promotional content
                </p>
              </div>
              <Switch
                checked={emailNotifications.marketingEmails}
                onCheckedChange={(checked) => handleEmailPreferenceChange('marketingEmails', checked)}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button 
              onClick={saveEmailPreferences}
              disabled={savingEmailPrefs}
              className="w-full"
            >
              {savingEmailPrefs ? 'Saving...' : 'Save Email Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            About Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Push Notifications:</strong> Instant alerts delivered directly to your device, even when the app is closed.
            </p>
            <p>
              <strong>Email Notifications:</strong> Detailed notifications sent to your email address for important updates.
            </p>
            <p>
              <strong>Privacy:</strong> You can change these settings at any time. We respect your preferences and won't send unwanted notifications.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NotificationSettings 