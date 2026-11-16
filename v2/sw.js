/* This version has been replaced by the demo at the site root. Drop the old offline copy and step aside. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(Promise.all([caches.delete('mynb-demo-v1'), caches.delete('mynb-demo-v2')]).then(function () { return self.registration.unregister(); }));
});
