const manifestAssets = self.__WB_MANIFEST || [];
let coreUrls = manifestAssets.map(entry => {
    const url = typeof entry === 'string' ? entry : entry.url;
    return url.startsWith('/') ? url : `/${url}`;
});
if (!coreUrls.includes('/')) coreUrls.push('/');
coreUrls = [...new Set(coreUrls)];

// ИМЯ ТЕКУЩЕГО КЭША (важно для ротации)
const CURRENT_CORE_CACHE = 'lab-core-cache';

self.addEventListener('install', () => self.skipWaiting());

// АГРЕССИВНАЯ АКТИВАЦИЯ
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        // Удаляем ВСЁ, что не является компилятором и не является текущим кэшем ядра
                        const isCompiler = name.includes('wasm-compiler') || name.includes('pyodide') || name.includes('sql');
                        return !isCompiler && name !== CURRENT_CORE_CACHE;
                    })
                    .map((name) => {
                        console.log('[PWA SW] Удаление устаревшего/дублирующего кэша:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('message', async (event) => {
    if (!event.data) return;

    if (event.data.type === 'CACHE_LAB') {
        console.log('[PWA SW] Принудительная перезапись системы...');
        try {
            // ПЕРЕД ЗАГРУЗКОЙ: Полностью сносим старый кэш, чтобы не было наслоения (утечки)
            await caches.delete(CURRENT_CORE_CACHE);

            const cache = await caches.open(CURRENT_CORE_CACHE);
            let cachedCount = 0;

            for (const url of coreUrls) {
                try {
                    const response = await fetch(new Request(url, { cache: 'no-store' }));
                    if (response.ok) {
                        await cache.put(url, response);
                        cachedCount++;
                    }
                } catch (err) {
                    console.error(`[PWA SW] Ошибка загрузки ${url}`, err);
                }
            }
            console.log(`[PWA SW] Система обновлена. Файлов: ${cachedCount}`);
            event.source.postMessage({ type: 'LAB_CACHED_SUCCESS' });
        } catch (err) {
            event.source.postMessage({ type: 'LAB_CACHED_ERROR', error: err.message });
        }
    }

    if (event.data.type === 'CLEAR_LAB_CACHE') {
        console.log('[PWA SW] Команда на полную зачистку ресурсов системы');
        const names = await caches.keys();
        await Promise.all(
            names
                .filter(n => !n.includes('wasm-compiler') && !n.includes('pyodide') && !n.includes('sql'))
                .map(n => caches.delete(n))
        );
        event.source.postMessage({ type: 'LAB_CLEARED_SUCCESS' });
    }
});

// ПЕРЕХВАТЧИК (Fetch)
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/hub') || url.pathname.startsWith('/api')) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            // Если в кэше есть — отдаем, иначе идем в сеть
            // Это предотвращает бесконечный рост, так как мы не пишем в кэш здесь "на лету"
            return cached || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') return caches.match('/');
                return new Response("Offline", { status: 503 });
            });
        })
    );
});
