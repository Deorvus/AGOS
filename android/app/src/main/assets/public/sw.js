
const CACHE = 'agos-shell-e09d226345c0';
const URLS = ["/index.html","/assets/index-CqMFV8OR.js","/assets/Navigate-DLaC0NF_.js","/assets/web-CA_npNO0.js","/assets/web-COknCyvp.js","/assets/web-g_dPGOIk.js","/assets/Navigate-CVlsZjEu.css","/assets/index-ClRHvFZu.css","/manifest.webmanifest","/icon-192.png","/icon-512.png"];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('agos-shell-') && k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  const path = new URL(e.request.url).pathname;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match("/index.html")));
  } else if (URLS.includes(path)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
  }
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    for (const client of clientList) {
      if (client.url && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow('/');
  }));
});
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(e.data.title, e.data.options);
  }
});
