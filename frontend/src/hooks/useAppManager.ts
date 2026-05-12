import { useState, useEffect } from 'react';

const CORE_CACHE_PREFIX = 'lab-core';

export function useAppManager() {
    const [isAppReady, setIsAppReady] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    const [installPrompt, setInstallPrompt] = useState(null);
    const [isLabCached, setIsLabCached] = useState(false);
    const [isLabDownloading, setIsLabDownloading] = useState(false);
    const [hasLabUpdate, setHasLabUpdate] = useState(false);

    // 1. Инициализация и проверка сети
    useEffect(() => {
        let isMounted = true;
        const initializeApp = async () => {
            if ('serviceWorker' in navigator) {
                const isWiped = localStorage.getItem('PRAXIS_WIPED_LOCK');
                if (!isWiped) {
                    navigator.serviceWorker.register('/sw.js')
                        .then(() => console.log("Service Worker зарегистрирован"))
                        .catch(err => console.error("Ошибка регистрации SW:", err));
                } else {
                    console.warn("Регистрация SW заблокирована после удаления кэша.");
                }
            }

            const hasCache = await caches.has('lab-core-cache');
            let currentlyOnline = navigator.onLine;
            if (currentlyOnline) {
                try {
                    await fetch('/', { method: 'HEAD', cache: 'no-store' });
                } catch (error) {
                    currentlyOnline = false;
                }
            }
            if (isMounted) {
                setIsLabCached(hasCache);
                setIsOnline(currentlyOnline);
                setIsAppReady(true);
            }
        };

        initializeApp();

        const networkInterval = setInterval(async () => {
            let currentlyOnline = navigator.onLine;
            if (currentlyOnline) {
                try {
                    await fetch('/', { method: 'HEAD', cache: 'no-store' });
                } catch (error) {
                    currentlyOnline = false;
                }
            }
            if (isMounted) setIsOnline(currentlyOnline);
        }, 5000);

        return () => {
            isMounted = false;
            clearInterval(networkInterval);
        };
    }, []);

    // 2. Проверка обновлений кэша
    useEffect(() => {
        const checkLabUpdate = async () => {
            try {
                const cache = await caches.open('lab-core-cache');
                const cachedRes = await cache.match('/index.html');
                if (!cachedRes) return;

                const netRes = await fetch('/index.html', { method: 'HEAD', cache: 'no-store' });

                const cachedDate = cachedRes.headers.get('last-modified');
                const netDate = netRes.headers.get('last-modified');
                const cachedEtag = cachedRes.headers.get('etag');
                const netEtag = netRes.headers.get('etag');

                if ((cachedEtag && netEtag && cachedEtag !== netEtag) ||
                    (cachedDate && netDate && cachedDate !== netDate)) {
                    setHasLabUpdate(true);
                } else {
                    setHasLabUpdate(false);
                }
            } catch (e) {} // Игнорируем ошибки сети
        };

        if (isAppReady && isOnline && isLabCached) checkLabUpdate();
    }, [isAppReady, isOnline, isLabCached]);

    // 3. Перехват PWA событий
    useEffect(() => {
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        const handleSWMessage = (event) => {
            if (event.data && event.data.type === 'LAB_CACHED_SUCCESS') {
                setIsLabCached(true);
                setIsLabDownloading(false);
                setHasLabUpdate(prev => {
                    if (prev) window.location.reload();
                    return false;
                });
            }
            if (event.data && event.data.type === 'LAB_CACHED_ERROR') {
                alert(`Ошибка скачивания: ${event.data.error}`);
                setIsLabDownloading(false);
            }
            if (event.data && event.data.type === 'LAB_CLEARED_SUCCESS') {
                console.log("Кэш успешно очищен воркером");
                setIsLabCached(false);
                setHasLabUpdate(false);
                window.location.reload(true);
            }
        };
        navigator.serviceWorker.addEventListener('message', handleSWMessage);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            navigator.serviceWorker.removeEventListener('message', handleSWMessage);
        };
    }, []);

    // 4. Методы управления
    const handleInstallApp = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') setInstallPrompt(null);
    };

    const handleDownloadLabCore = async () => {
        localStorage.removeItem('PRAXIS_WIPED_LOCK');

        if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.register('/sw.js');
        }

        if (navigator.serviceWorker.controller) {
            setIsLabDownloading(true);
            navigator.serviceWorker.controller.postMessage({ type: 'CACHE_LAB' });
        } else {
            alert("Инициализация загрузчика... Нажмите кнопку скачивания еще раз через секунду.");
            window.location.reload();
        }
    };

    const handleUpdateLabCore = async () => {
        setIsLabDownloading(true);
        await caches.delete('lab-core-cache');
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'CACHE_LAB' });
        }
    };

    // ТОЛЬКО УДАЛЕНИЕ СИСТЕМЫ (Компиляторы остаются)
    const handleDeleteLabCore = async () => {
        if (window.confirm("Удалить только оболочку системы (компиляторы останутся)?")) {
            try {
                console.log("[Wipe] Удаление системы...");

                localStorage.setItem('PRAXIS_WIPED_LOCK', 'true');

                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    await reg.unregister();
                }

                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => {
                    // Оставляем кэши компиляторов нетронутыми
                    const isCompiler = name.includes('wasm-compiler') || name.includes('pyodide') || name.includes('sql');
                    if (!isCompiler) {
                        console.log(`[Wipe] Удаляем системный кэш: ${name}`);
                        return caches.delete(name);
                    }
                }));

                if (window.indexedDB && window.indexedDB.databases) {
                    const dbs = await window.indexedDB.databases();
                    for (const db of dbs) {
                        if (db.name && (db.name.includes('workbox') || db.name.includes('lab-core'))) {
                            console.log(`[Wipe] Удаляем базу IndexedDB: ${db.name}`);
                            window.indexedDB.deleteDatabase(db.name);
                        }
                    }
                }

                setIsLabCached(false);
                setHasLabUpdate(false);
                window.location.replace('/');
            } catch (err) {
                console.error("Ошибка при удалении системы:", err);
            }
        }
    };

    // ПОЛНОЕ УНИЧТОЖЕНИЕ ВСЕХ ДАННЫХ (Система + Компиляторы + Настройки)
    const handleNuclearWipe = async () => {
        if (window.confirm("ВНИМАНИЕ: Это удалит ВООБЩЕ ВСЕ данные В-Лабы (включая оболочку и все скачанные компиляторы). Продолжить?")) {
            try {
                console.log("[Nuclear Wipe] Инициализация протокола полного уничтожения...");

                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    console.log(`[Nuclear Wipe] Отключение SW: ${reg.scope}`);
                    await reg.unregister();
                }

                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => {
                    console.log(`[Nuclear Wipe] Удаление кэша: ${name}`);
                    return caches.delete(name); // Удаляем ВООБЩЕ ВСЁ
                }));

                if (window.indexedDB && window.indexedDB.databases) {
                    const dbs = await window.indexedDB.databases();
                    for (const db of dbs) {
                        if (db.name) {
                            console.log(`[Nuclear Wipe] Удаление БД: ${db.name}`);
                            window.indexedDB.deleteDatabase(db.name);
                        }
                    }
                }

                // Очищаем локальные хранилища (настройки, код в редакторе и т.д.)
                localStorage.clear();
                sessionStorage.clear();

                // ВАЖНО: Так как мы сделали localStorage.clear(), наш флаг блокировки тоже удалился.
                // Ставим его заново, чтобы SW не воскрес!
                localStorage.setItem('PRAXIS_WIPED_LOCK', 'true');

                setIsLabCached(false);
                setHasLabUpdate(false);

                console.log("[Nuclear Wipe] Зачистка успешно завершена. Перезагрузка...");
                window.location.replace('/');
            } catch (err) {
                console.error("[Nuclear Wipe] Ошибка при зачистке:", err);
                alert("Не удалось полностью очистить память. Откройте DevTools -> Application -> Clear Site Data.");
            }
        }
    };

    return {
        isAppReady, isOnline, installPrompt, isLabCached,
        isLabDownloading, hasLabUpdate,
        handleInstallApp, handleDownloadLabCore, handleUpdateLabCore,
        handleDeleteLabCore, handleNuclearWipe
    };
}