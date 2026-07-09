const CACHE = 'lcc-v8';
const OFFLINE_URL = '/offline.html';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  OFFLINE_URL
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  if (
    url.includes('api.anthropic.com') ||
    url.includes('supabase.co') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return r;
        })
        .catch(() =>
          caches.match(e.request)
            .then(cached => cached || caches.match('/index.html'))
            .then(cached => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(r => {
          if (r.ok) cache.put(e.request, r.clone());
          return r;
        }).catch(() => null);
        return cached || networkFetch || caches.match(OFFLINE_URL);
      })
    )
  );
});

// Per-tag scheduled target timestamps — used to deduplicate re-schedule messages
// from the same SW lifetime without creating extra setTimeout calls.
const _scheduled = {};

function showNotif(tag, title, body, url) {
  return self.registration.showNotification(title, {
    body, icon: '/icon-192.png', badge: '/icon-192.png',
    tag, renotify: true, data: { url }
  });
}

self.addEventListener('message', e => {
  if (!e.data) return;

  // Immediate notification (used for "missed" case when scheduled time already passed)
  if (e.data.type === 'FIRE_NOW') {
    showNotif(e.data.tag, e.data.title, e.data.body, e.data.url);
    return;
  }

  if (e.data.type === 'SCHEDULE_EVENING' || e.data.type === 'SCHEDULE_HABIT') {
    const { msUntil, title, body } = e.data;
    const tag = e.data.type === 'SCHEDULE_HABIT' ? 'lcc-habit' : 'lcc-evening';
    const url = e.data.type === 'SCHEDULE_HABIT' ? '/?nav=habits' : '/?nav=ritual';
    const targetTs = Date.now() + msUntil;

    // Deduplicate: if already scheduled within 90 seconds of same target, skip
    if (_scheduled[tag] && Math.abs(_scheduled[tag] - targetTs) < 90000) return;
    _scheduled[tag] = targetTs;

    setTimeout(() => {
      delete _scheduled[tag];
      showNotif(tag, title, body, url);
    }, msUntil);
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/?nav=ritual';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) { c.focus(); return; }
      }
      return clients.openWindow(target);
    })
  );
});
