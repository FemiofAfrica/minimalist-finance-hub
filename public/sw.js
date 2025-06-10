// Service Worker for Push Notifications
console.log('🚀 Push Notification Service Worker loaded');

self.addEventListener('install', function(event) {
  console.log('📥 Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('✅ Service Worker activating');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  console.log('📱 Push event received:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
      console.log('📋 Push data parsed:', data);
    } catch (e) {
      console.error('❌ Error parsing push data:', e);
      data = {
        title: 'Notification',
        body: event.data.text() || 'You have a new notification'
      };
    }
  } else {
    console.log('ℹ️ No push data received');
    data = {
      title: 'Notification',
      body: 'You have a new notification'
    };
  }

  const options = {
    body: data.body || data.message || 'You have a new notification',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    data: { 
      url: data.url || '/',
      clickAction: data.url || '/'
    },
    requireInteraction: false,
    actions: data.actions || [],
    tag: data.tag || 'default-notification'
  };

  console.log('🔔 Showing notification:', data.title, options);

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('👆 Notification clicked:', event.notification);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || event.notification.data?.clickAction || '/';
  console.log('🔗 Opening URL:', urlToOpen);
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no existing window/tab, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('❌ Notification closed:', event.notification);
});

// Handle background sync if needed
self.addEventListener('sync', function(event) {
  console.log('🔄 Background sync:', event.tag);
});

console.log('✅ Service Worker setup complete'); 