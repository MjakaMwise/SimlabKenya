/* Team Desk service worker: shows push notifications and focuses the app when one is tapped.
   It caches nothing, so a new deploy is never held back by an old copy of the site. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'SIM-Lab Team Desk', {
      body: data.body || '',
      icon: '/pwa/icon-192.png',
      badge: '/pwa/badge-96.png',
      tag: data.tag,
      renotify: !!data.tag,
      data: { url: data.url || '/admin/team' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/admin/team', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
          await w.focus();
          if ('navigate' in w) return w.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
