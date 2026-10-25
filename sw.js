// Service worker: офлайн-работа.
// Стратегия: сеть в первую очередь (всегда свежие файлы при разработке), при ошибке — кэш.
// Файлы модулей и озвучка попадают в кэш при первом открытии (ядро шлёт список через postMessage).

const CACHE = 'school-v2';

// Файлы ядра. Добавили новый файл в core/ — допишите его сюда.
const CORE_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'core/main.js',
  'core/config.js',
  'core/cycles.js',
  'core/dom.js',
  'core/strings.js',
  'core/storage.js',
  'core/speech.js',
  'core/sounds.js',
  'core/rewards.js',
  'core/registry.js',
  'core/context.js',
  'core/screens/menu.js',
  'core/screens/result.js',
  'core/screens/gate.js',
  'core/screens/limit.js',
  'core/screens/stickers.js',
  'core/screens/parent.js',
  'core/styles/base.css',
  'core/styles/screens.css',
  'modules/registry.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'precache' || !Array.isArray(data.urls)) return;
  const urls = data.urls
    .map((u) => new URL(u, self.location.href))
    .filter((u) => u.origin === self.location.origin)
    .map((u) => u.href);
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(urls.map(async (u) => {
        // Озвучка почти не меняется — скачиваем только недостающие mp3, а не весь набор при каждом запуске.
        if (u.endsWith('.mp3') && (await cache.match(u))) return;
        try {
          await cache.add(u);
        } catch (err) {
          // файла нет или нет сети — не страшно, он подтянется при использовании
        }
      }))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetchWithTimeout(req, 4000);
    if (res.status === 200) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return req.headers.has('range') ? rangeResponse(req, cached) : cached;
    if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
    return Response.error();
  }
}

function fetchWithTimeout(req, ms) {
  if (req.mode === 'navigate') return fetch(req);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  // no-cache: всегда сверяться с сервером, а не брать устаревшую копию из HTTP-кэша браузера.
  return fetch(req, { signal: ctrl.signal, cache: 'no-cache' }).finally(() => clearTimeout(timer));
}

// Аудио-элемент запрашивает файл по диапазонам байт; из кэша отдаём нужный кусок.
async function rangeResponse(req, res) {
  const match = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range'));
  if (!match) return res;
  const buf = await res.arrayBuffer();
  const start = match[1] ? parseInt(match[1], 10) : 0;
  const end = match[2] ? Math.min(parseInt(match[2], 10), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
      'Content-Length': String(end - start + 1),
    },
  });
}
