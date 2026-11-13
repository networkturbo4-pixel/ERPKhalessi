const CACHE_NAME = 'khalessi-pwa-v1';
const CORE_ASSETS = ['/', '/manifest.webmanifest', '/api/favicon.php'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Nunca interceptar APIs, SSE ni scripts PHP dinámicos
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/realtime/')) {
    return;
  }

  // Navegación / HTML: Network-first con respaldo en caché
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Assets estáticos con hash: Cache-first con actualización en segundo plano
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => undefined);
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});

// Web Push remoto (si se configura servidor VAPID)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Pizza Khalessi',
    body: 'Tienes una actualización en tu pedido.',
    url: '/',
    tag: 'khalessi-order-update',
  };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/api/favicon.php',
      badge: '/favicon.svg',
      tag: payload.tag,
      data: { url: payload.url || '/' },
      renotify: true,
    })
  );
});

// Notificaciones locales disparadas desde la app al cambiar estado del pedido
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'SHOW_LOCAL_NOTIFICATION') return;
  event.waitUntil(
    self.registration.showNotification(data.title || 'Pizza Khalessi', {
      body: data.body || '',
      icon: '/api/favicon.php',
      badge: '/favicon.svg',
      tag: data.tag || 'khalessi-order-status',
      data: { url: data.url || '/' },
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
