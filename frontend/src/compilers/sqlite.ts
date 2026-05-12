const ASSETS = [
    '/compilers/sqlite/sql-wasm.js',
    '/compilers/sqlite/sql-wasm.wasm',
]

const CACHE_NAME = 'wasm-compiler-sqlite'
const RUN_TIMEOUT_MS = 5_000
const INIT_TIMEOUT_MS = 30_000

let worker: Worker | null = null

async function createWorker(): Promise<void> {
    worker = new Worker(
        new URL('../workers/sqlite.worker.ts', import.meta.url),
        { type: 'module' },
    )
    await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => {
            worker?.terminate(); worker = null
            reject(new Error('Timeout инициализации SQLite'))
        }, INIT_TIMEOUT_MS)
        worker!.onmessage = ({ data }) => {
            clearTimeout(t)
            if (data.type === 'ready') resolve()
            else { worker?.terminate(); worker = null; reject(new Error(data.message)) }
        }
        worker!.postMessage({ type: 'init' })
    })
}

export const SQLiteCompiler = {
    id: 'sqlite',
    name: 'SQLite 3 (WASM)',
    monacoLang: 'sql',
    template: '-- Лабораторная работа по SQLite\n' +
        'CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, email TEXT);\n' +
        'INSERT INTO users (username, email) VALUES ("admin", "admin@v-lab.local");\n' +
        'SELECT * FROM users;',

    async isDownloaded(): Promise<boolean> {
        const cache = await caches.open(CACHE_NAME)
        return !!(await cache.match(ASSETS[0]))
    },

    async downloadForOffline(onProgress: (p: number) => void): Promise<void> {
        const cache = await caches.open(CACHE_NAME)
        for (let i = 0; i < ASSETS.length; i++) {
            const res = await fetch(new Request(ASSETS[i], { cache: 'no-store' }))
            await cache.put(ASSETS[i], res)
            onProgress(Math.round(((i + 1) / ASSETS.length) * 100))
        }
    },

    async checkForUpdates(): Promise<boolean> {
        try {
            const cache = await caches.open(CACHE_NAME)
            const cached = await cache.match(ASSETS[0])
            if (!cached) return false
            const net = await fetch(ASSETS[0], { method: 'HEAD', cache: 'no-cache' })
            return cached.headers.get('last-modified') !== net.headers.get('last-modified')
        } catch { return false }
    },

    async init(): Promise<void> {
        if (worker) return
        await createWorker()
    },

    async run(
        files: Record<string, string>,
        logOutput: (out: string) => void,
        _stdin?: string,
    ): Promise<void> {
        if (!worker) await createWorker()

        await new Promise<void>((resolve) => {
            const t = setTimeout(() => {
                worker?.terminate(); worker = null
                logOutput('❌ Превышен лимит времени (5 с). Запрос прерван.')
                resolve()
            }, RUN_TIMEOUT_MS)
            worker!.onmessage = ({ data }) => {
                clearTimeout(t)
                logOutput(data.output)
                resolve()
            }
            worker!.postMessage({ type: 'run', files })
        })
    },

    async removeOffline(): Promise<void> {
        worker?.terminate(); worker = null
        await caches.delete(CACHE_NAME)
    },
}
