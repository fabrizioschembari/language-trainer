
const CACHE_NAME = 'langtrainer-rekit-full-v1';
const ASSETS = [
  'index.html',
  'dict.html',
  'style.css',
  'home.js',
  'dict.js',
  'strings.json',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
