// Service Worker for handling push notifications
const CACHE_NAME = 'kpege-v1'

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(self.clients.claim())
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event)
  
  let notificationData = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: {
      url: '/',
      timestamp: Date.now()
    }
  }

  // Parse notification data if available
  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        ...notificationData,
        ...data
      }
    } catch (e) {
      console.warn('Failed to parse push data:', e)
      notificationData.body = event.data.text() || notificationData.body
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    actions: notificationData.actions || [],
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    tag: 'kpege-notification'
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }
      
      // If no existing window, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})

// Background sync (optional, for offline capabilities)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      Promise.resolve()
    )
  }
})

// Handle errors
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event)
})

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event)
}) 