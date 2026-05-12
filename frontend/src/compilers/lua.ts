const ASSETS = [
    '/compilers/lua/wasmoon.js',
    '/compilers/lua/wasmoon.wasm',
]

const CACHE_NAME = 'wasm-compiler-lua'
const RUN_TIMEOUT_MS = 5_000
const INIT_TIMEOUT_MS = 30_000

let worker: Worker | null = null

async function createWorker(): Promise<void> {
    worker = new Worker(
        new URL('../workers/lua.worker.ts', import.meta.url),
        { type: 'module' },
    )
    await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => {
            worker?.terminate(); worker = null
            reject(new Error('Timeout инициализации Lua VM'))
        }, INIT_TIMEOUT_MS)
        worker!.onmessage = ({ data }) => {
            clearTimeout(t)
            if (data.type === 'ready') resolve()
            else { worker?.terminate(); worker = null; reject(new Error(data.message)) }
        }
        worker!.postMessage({ type: 'init' })
    })
}

export const LuaCompiler = {
    id: 'lua',
    name: 'Lua 5.4 (WASM)',
    monacoLang: 'lua',
    template: '-- Лабораторная работа по Lua\n' +
        'print("Движок Wasmoon 1.16.0 запущен!")\n' +
        'print("Версия рантайма: " .. _VERSION)\n\n' +
        'local data = { 10, 20, 30, 40, 50 }\n' +
        'local sum = 0\n' +
        'for _, v in ipairs(data) do sum = sum + v end\n' +
        'print("Сумма элементов таблицы: " .. sum)',

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
