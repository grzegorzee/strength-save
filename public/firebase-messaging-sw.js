/* eslint-env serviceworker */
/* global firebase, importScripts */
// Web push (FCM): service worker powiadomień w tle. Rejestrowany z własnym
// scope obok SW workboxa (PWA) — nie kolidują. Config Firebase przychodzi
// w query stringu rejestracji (public/ nie przechodzi przez Vite env).
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
let config = null;
try {
  config = JSON.parse(params.get('config') || 'null');
} catch (error) {
  config = null;
}

if (config && config.apiKey) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const title = notification.title || 'Strength Save';
    self.registration.showNotification(title, {
      body: notification.body || '',
      icon: './pwa-192x192.png',
      badge: './pwa-192x192.png',
      data: payload.data || {},
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const scopeUrl = new URL('./', self.location.href).href;
    for (const client of clientList) {
      if (client.url.startsWith(scopeUrl) && 'focus' in client) return client.focus();
    }
    return self.clients.openWindow(scopeUrl);
  })());
});
