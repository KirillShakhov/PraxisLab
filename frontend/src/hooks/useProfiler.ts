import { useState, useCallback } from 'react'
import { executeOnServer } from '../api/executeApi'

export interface BenchmarkStats {
  min: number
  max: number
  avg: number
  median: number
  p95: number
}

export interface ServerResult {
  durationMs: number
  e2eMs?: number
  timedOut: boolean
  stdout: string
  stderr: string
}

export interface BenchmarkResult {
  iterations: number
  warmupIterations: number
  times: number[]         // мс на каждый прогон
  stats: BenchmarkStats
  networkRtt: number | null  // RTT до сервера, мс
  language: string
  timestamp: number
  serverResult?: ServerResult
  serverIterations?: number
  serverTimes?: number[]       // полный fetch round-trip до /api/execute
  serverStats?: BenchmarkStats
  serverProcessTimes?: number[] // durationMs из execution-service
  serverProcessStats?: BenchmarkStats
  serverTimedOutCount?: number
}

function calcStats(times: number[]): BenchmarkStats {
  const sorted = [...times].sort((a, b) => a - b)
  const sum = times.reduce((a, b) => a + b, 0)
  return {
    min:    Math.round(sorted[0]),
    max:    Math.round(sorted[sorted.length - 1]),
    avg:    Math.round(sum / times.length),
    median: Math.round(sorted[Math.floor(sorted.length / 2)]),
    p95:    Math.round(sorted[Math.floor(sorted.length * 0.95)]),
  }
}

async function measureNetworkRtt(): Promise<number | null> {
  try {
    const start = performance.now()
    await fetch('/', { method: 'HEAD', cache: 'no-store' })
    return Math.round(performance.now() - start)
  } catch {
    return null
  }
}

async function runServerOnce(
  language: string,
  files: Record<string, string>,
): Promise<ServerResult> {
  const t0 = performance.now()
  const result = await executeOnServer({ language, files })
  return { ...result, e2eMs: performance.now() - t0 }
}

export function useProfiler(
  getFiles: () => Record<string, string>,
  compiler: any,
  language: string,
  mode: 'wasm-only' | 'compare' = 'wasm-only',
) {
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  const runBenchmark = useCallback(async (iterations: number) => {
    if (!compiler || running) return

    setRunning(true)
    setProgress(0)
    setResult(null)

    const files = getFiles()   // снимок состояния файлов
    const times: number[] = []
    const warmupIterations = Math.min(10, Math.max(0, iterations))
    const clientProgressShare = mode === 'compare' ? 50 : 100

    for (let i = 0; i < warmupIterations; i++) {
      try {
        await compiler.run(files, () => {}, '')
      } catch { /* warmup errors do not stop profiling */ }
      if (i % 5 === 4) await new Promise(r => setTimeout(r, 0))
    }

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now()
      try {
        // Запускаем с пустым stdin, результат выбрасываем
        await compiler.run(files, () => {}, '')
      } catch { /* подавляем ошибки при бенчмарке */ }
      times.push(performance.now() - t0)
      setProgress(Math.round(((i + 1) / iterations) * clientProgressShare))

      // Дышим между итерациями чтобы не блокировать UI
      if (i % 10 === 9) await new Promise(r => setTimeout(r, 0))
    }

    const [stats, networkRtt] = await Promise.all([
      Promise.resolve(calcStats(times)),
      measureNetworkRtt(),
    ])

    let serverResult: ServerResult | undefined
    let serverTimes: number[] | undefined
    let serverProcessTimes: number[] | undefined
    let serverStats: BenchmarkStats | undefined
    let serverProcessStats: BenchmarkStats | undefined
    let serverTimedOutCount: number | undefined
    let serverIterations: number | undefined

    if (mode === 'compare') {
      try {
        const serverWarmupIterations = Math.min(10, Math.max(0, iterations))
        const serverWarmupProgressShare = serverWarmupIterations > 0 ? 5 : 0
        const serverProgressBase = clientProgressShare + serverWarmupProgressShare
        for (let i = 0; i < serverWarmupIterations; i++) {
          await runServerOnce(language, files)
          setProgress(clientProgressShare + Math.round(((i + 1) / serverWarmupIterations) * serverWarmupProgressShare))
        }

        serverTimes = []
        serverProcessTimes = []
        serverTimedOutCount = 0
        serverIterations = iterations

        for (let i = 0; i < iterations; i++) {
          serverResult = await runServerOnce(language, files)
          serverTimes.push(serverResult.e2eMs ?? serverResult.durationMs)
          serverProcessTimes.push(serverResult.durationMs)
          if (serverResult.timedOut) serverTimedOutCount++
          setProgress(serverProgressBase + Math.round(((i + 1) / iterations) * (100 - serverProgressBase)))
          if (i % 10 === 9) await new Promise(r => setTimeout(r, 0))
        }

        serverStats = calcStats(serverTimes)
        serverProcessStats = calcStats(serverProcessTimes)
      } catch { /* server unavailable — omit */ }
    }

    setResult({
      iterations,
      warmupIterations,
      times,
      stats,
      networkRtt,
      language,
      timestamp: Date.now(),
      serverResult,
      serverIterations,
      serverTimes,
      serverStats,
      serverProcessTimes,
      serverProcessStats,
      serverTimedOutCount,
    })
    setRunning(false)
    setProgress(0)
  }, [getFiles, compiler, language, running, mode])

  const clearResult = useCallback(() => setResult(null), [])

  return { result, running, progress, runBenchmark, clearResult }
}
