const V = 'favoris-v2';
const FICHIERS = ['./', './index.html', './verrou.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(V)
      .then(function (c) { return c.addAll(FICHIERS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(function (r) {
        const copie = r.clone();
        caches.open(V).then(function (c) { c.put(e.request, copie); });
        return r;
      })
      .catch(function () {
        return caches.match(e.request).then(function (r) { return r || caches.match('./index.html'); });
      })
  );
});
