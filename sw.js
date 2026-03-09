const CACHE_NAME = 'crm-ashqaf-v2'; // Versi dinaikkan untuk memaksa update

// Daftar aset inti yang HARUS disimpan di memori HP
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Event saat aplikasi pertama kali dipasang
self.addEventListener('install', event => {
  // Langsung aktifkan service worker baru tanpa menunggu
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Bersihkan cache versi lama jika ada update aplikasi
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Minta halaman web untuk segera menggunakan SW baru
  );
});

// Strategi Pengambilan Data: Cache First, Network Fallback
self.addEventListener('fetch', event => {
  // Abaikan request dari ekstensi Chrome atau skema yang tidak didukung
  if (!(event.request.url.indexOf('http') === 0)) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response (Cepat karena dari memori HP)
        if (response) {
          return response;
        }

        // Tidak ada di cache, ambil dari internet
        return fetch(event.request).then(
          function(networkResponse) {
            // Cek apakah response valid
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Simpan copy dari response ke cache untuk akses berikutnya
            var responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                // Jangan cache request ke API pihak ketiga (seperti Firebase/Telegram) untuk keamanan
                if (!event.request.url.includes('googleapis') && !event.request.url.includes('telegram')) {
                     cache.put(event.request, responseToCache);
                }
              });

            return networkResponse;
          }
        );
      }).catch(() => {
          // Jika offline dan aset tidak ada di cache (Opsional: bisa tampilkan halaman offline kustom di sini)
          console.log('Offline dan gagal mengambil data:', event.request.url);
      })
  );
});