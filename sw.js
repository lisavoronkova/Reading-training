/*
 * Работа без интернета. Сначала берём свежие файлы из сети (так обновления
 * приходят сами), а если сети нет — из сохранённой копии.
 */
var CACHE = 'olya-zoya-reading';
var SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/game.css',
  'js/sklady.js', 'js/words.js', 'js/levels.js', 'js/audio.js', 'js/store.js', 'js/characters.js',
  'js/core.js', 'js/cloud.js', 'js/screen-home.js', 'js/screen-play.js', 'js/screen-check.js',
  'js/screen-extras.js', 'js/screen-parents.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined);
      });
    })
  );
});
