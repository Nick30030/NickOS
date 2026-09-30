// ==============================================================================
// NICK OS — SERVICE WORKER & WEB PUSH FOUNDATION
// ==============================================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Listen to Web Push events dispatched from NICK OS backend
 */
self.addEventListener('push', (event) => {
  let payload = {
    title: 'NICK OS',
    body: 'Notification received from sovereign system.',
    priority: 'normal',
    deepLink: '#/dashboard'
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: '/assets/favicon.ico',
    badge: '/assets/favicon.ico',
    tag: payload.id || 'nick-os-push',
    data: {
      deepLink: payload.deepLink || payload.metadata?.deepLink || '#/dashboard'
    },
    actions: [
      { action: 'open', title: 'Open NICK OS' }
    ],
    // High-priority configurations
    requireInteraction: payload.priority === 'critical' || payload.priority === 'high',
    vibrate: payload.priority === 'critical' 
      ? [300, 100, 300, 100, 300] 
      : payload.priority === 'high' 
        ? [200, 100, 200] 
        : [100]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

/**
 * Handle notification clicks & navigate to deep-linked viewport
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const deepLink = event.notification.data?.deepLink || '#/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and redirect
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          return client.navigate(deepLink);
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(deepLink);
      }
    })
  );
});
