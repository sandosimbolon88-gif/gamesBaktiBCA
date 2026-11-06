/* Cache file game agar tetap bisa dibuka tanpa internet setelah kunjungan pertama.
 * Perubahan file akan terlihat pada pembukaan berikutnya. Naikkan VERSI bila ingin
 * memaksa semua perangkat membuang cache lama. */
const VERSI = 'penyu-v8-20261106';
const FILES = [
  './', './index.html', './style.css', './manifest.webmanifest', './icon.svg',
  './js/data.js', './js/qr.js', './js/art.js', './js/audio.js', './js/storage.js', './js/game.js', './js/ui.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('penyu-') && k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

/* Pakai cache dulu (cepat & tetap jalan tanpa internet), lalu perbarui cache di latar belakang. */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(VERSI).then((c) =>
      c.match(e.request, { ignoreSearch: true }).then((hit) => {
        const net = fetch(e.request)
          .then((res) => { if (res && res.ok) c.put(e.request, res.clone()); return res; })
          .catch(() => hit);
        return hit || net;
      })
    )
  );
});

