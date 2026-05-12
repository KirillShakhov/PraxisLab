const CACHE_NAME = 'wasm-compiler-javascript'
const RUN_TIMEOUT_MS = 5_000

let worker: Worker | null = null

async function createWorker(): Promise<void> {
    worker = new Worker(
        new URL('../workers/javascript.worker.ts', import.meta.url),
        { type: 'module' },
    )
    await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => {
            worker?.terminate(); worker = null
            reject(new Error('Timeout инициализации JS Worker'))
        }, 5_000)
        worker!.onmessage = ({ data }) => {
            clearTimeout(t)
            if (data.type === 'ready') resolve()
            else { worker?.terminate(); worker = null; reject(new Error(data.message)) }
        }
        worker!.postMessage({ type: 'init' })
    })
}

export const JavascriptCompiler = {
    id: 'javascript',
    name: 'JavaScript (Native V8)',
    monacoLang: 'javascript',
    template: 'console.log("JS работает мгновенно!");\n',

    async isDownloaded(): Promise<boolean> {
        return caches.has(CACHE_NAME)
    },

    async downloadForOffline(onProgress: (p: number) => void): Promise<void> {
        onProgress(50)
        const cache = await caches.open(CACHE_NAME)
        await cache.put('/v8-stub.txt', new Response('JS_READY'))
        onProgress(100)
    },

    async init(): Promise<void> {
        if (worker) return
        const downloaded = await caches.has(CACHE_NAME)
        if (!downloaded) {
            const cache = await caches.open(CACHE_NAME)
            await cache.put('/v8-stub.txt', new Response('JS_READY'))
        }
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
                logOutput('❌ Превышен лимит времени (5 с). Бесконечный цикл прерван.')
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

    async checkForUpdates() { return false },

    async removeOffline(): Promise<void> {
        worker?.terminate(); worker = null
        await caches.delete(CACHE_NAME)
    },
}
