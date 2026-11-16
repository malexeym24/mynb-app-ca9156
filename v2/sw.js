/* Network first, cache as a fallback: the demo always shows the latest version and still opens offline.
   Own files are re-checked with the server on every load, so a new upload shows up at once (not after the 10-minute browser cache). */
var CACHE = 'mynb-demo-v2';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
function fresh(req) {
  if (req.url.indexOf(self.location.origin) !== 0) return fetch(req);
  return fetch(req.url, { cache: 'no-cache' }).then(function (res) { return res.redirected ? fetch(req) : res; });
}
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(fresh(e.request).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
    return res;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
