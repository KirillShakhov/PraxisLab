import { useState, useCallback } from 'react'
import type { TestCase } from '../types'

export type TestStatus = 'pending' | 'running' | 'pass' | 'fail' | 'error'

export interface TestResult {
  testId: string
  status: TestStatus
  actualOutput: string
  expectedOutput: string
  executionMs: number
}

// Нормализация вывода: убираем trailing whitespace и Windows line endings
function normalize(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim()
}

export function useTestRunner(
  getFiles: () => Record<string, string>,
  compiler: any,
) {
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)

  const runTests = useCallback(async (testCases: TestCase[]) => {
    if (!compiler || running) return

    setRunning(true)

    // Инициализируем все тесты как pending
    setResults(testCases.map(tc => ({
      testId: tc.id,
      status: 'pending',
      actualOutput: '',
      expectedOutput: tc.expectedOutput,
      executionMs: 0,
    })))

    // Запускаем тесты последовательно (WASM движки однопоточные)
    for (const tc of testCases) {
      // Помечаем текущий тест как running
      setResults(prev =>
        prev.map(r => r.testId === tc.id ? { ...r, status: 'running' } : r)
      )

      const files = getFiles()
      const start = performance.now()
      let actualOutput = ''
      let status: TestStatus = 'error'

      try {
        await compiler.run(
          files,
          (out: string) => { actualOutput = out },
          tc.input,
        )
        const ms = performance.now() - start
        const passed = normalize(actualOutput) === normalize(tc.expectedOutput)
        status = passed ? 'pass' : 'fail'

        setResults(prev =>
          prev.map(r => r.testId === tc.id
            ? { ...r, status, actualOutput, executionMs: Math.round(ms) }
            : r
          )
        )
      } catch (err: any) {
        const ms = performance.now() - start
        actualOutput = err.message ?? 'Неизвестная ошибка'
        setResults(prev =>
          prev.map(r => r.testId === tc.id
            ? { ...r, status: 'error', actualOutput, executionMs: Math.round(ms) }
            : r
          )
        )
      }
    }

    setRunning(false)
  }, [getFiles, compiler, running])

  const clearResults = useCallback(() => setResults([]), [])

  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail' || r.status === 'error').length,
    pending: results.filter(r => r.status === 'pending' || r.status === 'running').length,
  }

  return { results, running, runTests, clearResults, summary }
}
