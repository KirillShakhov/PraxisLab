const ASSETS = [
    '/compilers/pyodide/pyodide.mjs',
    '/compilers/pyodide/pyodide.asm.wasm',
    '/compilers/pyodide/pyodide.asm.js',
    '/compilers/pyodide/python_stdlib.zip',
    '/compilers/pyodide/repodata.json',
]

const CACHE_NAME = 'wasm-compiler-python'
const RUN_TIMEOUT_MS = 5_000
const INIT_TIMEOUT_MS = 60_000

let worker: Worker | null = null

async function createWorker(): Promise<void> {
    worker = new Worker(
        new URL('../workers/python.worker.ts', import.meta.url),
        { type: 'module' },
    )
    await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => {
            worker?.terminate(); worker = null
            reject(new Error('Timeout инициализации Pyodide (>60 с)'))
        }, INIT_TIMEOUT_MS)
        worker!.onmessage = ({ data }) => {
            clearTimeout(t)
            if (data.type === 'ready') resolve()
            else { worker?.terminate(); worker = null; reject(new Error(data.message)) }
        }
        worker!.postMessage({ type: 'init' })
    })
}

export const PythonCompiler = {
    id: 'python',
    name: 'Python (Pyodide WASM)',
    monacoLang: 'python',
    template: 'def greet(name):\n    print(f"Привет, {name}! Локальный Python работает.")\n\ngreet("В-Лаба")\n',

    async isDownloaded(): Promise<boolean> {
        const cache = await caches.open(CACHE_NAME)
        return !!(await cache.match(ASSETS[0]))
    },

    async downloadForOffline(onProgress: (progress: number) => void): Promise<void> {
        const cache = await caches.open(CACHE_NAME)
        for (let i = 0; i < ASSETS.length; i++) {
            await cache.add(ASSETS[i])
            onProgress(Math.round(((i + 1) / ASSETS.length) * 100))
        }
    },

    async init(): Promise<void> {
        if (worker) return
        await createWorker()
    },

    async run(
        files: Record<string, string>,
        logOutput: (out: string) => void,
        stdin?: string,
    ): Promise<void> {
        if (!worker) await createWorker()

        await new Promise<void>((resolve) => {
            const t = setTimeout(() => {
                worker?.terminate(); worker = null
                logOutput('❌ Превышен лимит времени (5 с). Бесконечный цикл прерван.')
                resolve()
            }, RUN_TIMEOUT_MS)
            worker!.onmessage = ({ data }) => {
                clearTimeout(t)
                logOutput(data.output)
                resolve()
            }
            worker!.postMessage({ type: 'run', files, stdin: stdin ?? '' })
        })
    },

    async checkForUpdates(): Promise<boolean> {
        try {
            const cache = await caches.open(CACHE_NAME)
            const cached = await cache.match(ASSETS[0])
            if (!cached) return false
            const net = await fetch(ASSETS[0], { method: 'HEAD', cache: 'no-cache' })
            const cachedDate = cached.headers.get('last-modified')
            const netDate = net.headers.get('last-modified')
            if (cachedDate && netDate && cachedDate !== netDate) return true
            const cachedSize = cached.headers.get('content-length')
            const netSize = net.headers.get('content-length')
            if (cachedSize && netSize && cachedSize !== netSize) return true
            return false
        } catch { return false }
    },

    async removeOffline(): Promise<void> {
        worker?.terminate(); worker = null
        await caches.delete(CACHE_NAME)
    },
}
