// Simple service worker for push notification testing
console.log('Service Worker loaded');

self.addEventListener('install', function(event) {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  console.log('Push event received');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('Error parsing push data:', e);
      data = {
        title: 'Push Notification',
        body: event.data.text() || 'No message content'
      };
    }
  }

  const options = {
    body: data.body || data.message || 'Test push notification',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    data: data.data || { url: data.url || '/' },
    requireInteraction: false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Push Notification', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
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
  console.log('Notification closed');
}); 