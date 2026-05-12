
export async function getCacheSize(cacheName: string): Promise<number> {
    if (!('caches' in window)) return 0;
    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        let totalSize = 0;

        for (const key of keys) {
            const response = await cache.match(key);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
        return totalSize;
    } catch (e) {
        return 0;
    }
}

export const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};