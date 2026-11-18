const CACHE_NAME = 'arcade-infinito-v1.2.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png',
  './src/config.js',
  './src/engine/PixelSprites.js',
  './src/utils/sanitize.js',
  './src/styles/global.css',
  './src/styles/components.css',
  './src/styles/games.css',
  './src/app/main.js',
  './src/app/router.js',
  './src/app/navigation.js',
  './src/services/StorageService.js',
  './src/services/AchievementService.js',
  './src/services/StatisticsService.js',
  './src/engine/ChiptuneSoundtrack.js',
  './src/engine/AudioManager.js',
  './src/engine/CollisionManager.js',
  './src/engine/DifficultyManager.js',
  './src/engine/ScoreManager.js',
  './src/engine/LevelManager.js',
  './src/engine/InputManager.js',
  './src/engine/GameLoop.js',
  './src/engine/GameEngine.js',
  './src/engine/GameRegistry.js',
  './src/components/Header.js',
  './src/components/GameCard.js',
  './src/components/GameGrid.js',
  './src/components/ScoreDisplay.js',
  './src/components/PauseMenu.js',
  './src/components/GameOverScreen.js',
  './src/components/GameModal.js',
  './src/components/StatsModal.js',
  './src/components/Settings.js',
  './src/games/snake/index.js',
  './src/games/pacman/index.js',
  './src/games/pong/index.js',
  './src/games/breakout/index.js',
  './src/games/spaceinvaders/index.js',
  './src/games/asteroids/index.js',
  './src/games/flappy/index.js',
  './src/games/tetris/index.js',
  './src/games/minesweeper/index.js',
  './src/games/memory/index.js',
  './src/games/2048/index.js',
  './src/games/reaction/index.js',
  './src/games/bomberman/index.js',
  './src/games/shmup/index.js',
  './src/games/metalslug/index.js',
  './src/games/sunsetriders/index.js',
  './src/games/donkeykong/index.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Estrategia para navegación HTML: Cache First con actualización en segundo plano y fallback a index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
            }
            return networkResponse;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Estrategia Cache First para recursos estáticos locales (JS, CSS, SVG, PNG, Manifest)
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
