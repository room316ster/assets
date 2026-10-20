// Service Worker for Asset Management Pro PWA
const CACHE_NAME = 'asset-pro-pwa-v6.2';
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => console.log('Cache addAll warning:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ดักฟังข้อความจากหน้าเว็บเพื่อสั่งอัปเดต Service Worker ทันที
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    // สำหรับหน้าเว็บ HTML หลัก (Navigation / index.html): ใช้ Network-first
    // เพื่อให้เมื่อผู้ใช้อัปเดตโค้ดบน GitHub โทรศัพท์จะดึงหน้าเว็บล่าสุดทันที ไม่ค้างหน้าจอเก่า
    if (event.request.mode === 'navigate' || event.request.url.endsWith('index.html') || event.request.url.endsWith('/')) {
      event.respondWith(
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        }).catch(() => {
          return caches.match('./index.html') || caches.match(event.request);
        })
      );
      return;
    }

    // สำหรับ Assets ภายนอก (CDN, Fonts): ใช้ Cache-first แล้วค่อยดึงจาก Network
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && (
            event.request.url.includes('cdn.jsdelivr.net') ||
            event.request.url.includes('cdnjs.cloudflare.com') ||
            event.request.url.includes('unpkg.com') ||
            event.request.url.includes('fonts.googleapis.com') ||
            event.request.url.includes('fonts.gstatic.com') ||
            event.request.url.includes('cdn.tailwindcss.com')
          )) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
  }
});
