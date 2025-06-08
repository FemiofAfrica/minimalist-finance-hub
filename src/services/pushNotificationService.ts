import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null

  // Initialize service worker and push notifications
  async initialize(): Promise<boolean> {
    try {
      // Check if service workers and push messaging are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported')
        return false
      }

      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered successfully')

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready

      return true
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
      return false
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      return 'denied'
    }

    // Request permission
    const permission = await Notification.requestPermission()
    return permission
  }

  // Subscribe to push notifications
  async subscribe(): Promise<PushSubscription | null> {
    try {
      if (!this.registration) {
        throw new Error('Service worker not registered')
      }

      if (!VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key not configured')
      }

      // Check permission
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Notification permission denied')
      }

      // Subscribe to push notifications
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      // Save subscription to database
      await this.saveSubscription(subscription)

      console.log('Push subscription successful:', subscription)
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.registration) {
        return false
      }

      const subscription = await this.registration.pushManager.getSubscription()
      if (!subscription) {
        return true
      }

      // Unsubscribe from push notifications
      const success = await subscription.unsubscribe()
      
      if (success) {
        // Remove subscription from database
        await this.removeSubscription(subscription)
        console.log('Push unsubscription successful')
      }

      return success
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      return false
    }
  }

  // Get current subscription status
  async getSubscription(): Promise<PushSubscription | null> {
    try {
      if (!this.registration) {
        return null
      }

      return await this.registration.pushManager.getSubscription()
    } catch (error) {
      console.error('Failed to get push subscription:', error)
      return null
    }
  }

  // Check if user is subscribed
  async isSubscribed(): Promise<boolean> {
    const subscription = await this.getSubscription()
    return subscription !== null
  }

  // Save subscription to database
  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const subscriptionJson = subscription.toJSON()
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys!.p256dh!,
          auth: subscriptionJson.keys!.auth!,
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        })

      if (error) {
        throw error
      }

      console.log('Subscription saved to database')
    } catch (error) {
      console.error('Failed to save subscription:', error)
      throw error
    }
  }

  // Remove subscription from database
  private async removeSubscription(subscription: PushSubscription): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const subscriptionJson = subscription.toJSON()
      
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('endpoint', subscriptionJson.endpoint!)

      if (error) {
        throw error
      }

      console.log('Subscription removed from database')
    } catch (error) {
      console.error('Failed to remove subscription:', error)
    }
  }

  // Convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // Send a test notification (for testing purposes)
  async sendTestNotification(title: string, message: string, url?: string): Promise<void> {
    try {
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Notification permission denied')
      }

      // Show local notification for testing
      new Notification(title, {
        body: message,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: { url },
        requireInteraction: false,
        tag: 'test-notification'
      })
    } catch (error) {
      console.error('Failed to send test notification:', error)
      throw error
    }
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService()

export default pushNotificationService 