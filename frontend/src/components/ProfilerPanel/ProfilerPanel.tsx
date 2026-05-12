import React, { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, Typography, Chip, LinearProgress,
  ToggleButton, ToggleButtonGroup, Divider, Tooltip,
  IconButton, Alert,
} from '@mui/material'
import SpeedIcon from '@mui/icons-material/Speed'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CloseIcon from '@mui/icons-material/Close'
import type { BenchmarkResult } from '../../hooks/useProfiler'

function Histogram({ times }: { times: number[] }) {
  if (times.length === 0) return null
  const BINS = 20
  const min = Math.min(...times)
  const max = Math.max(...times)
  const range = max - min || 1
  const binSize = range / BINS
  const bins = Array(BINS).fill(0)
  times.forEach(t => {
    const idx = Math.min(Math.floor((t - min) / binSize), BINS - 1)
    bins[idx]++
  })
  const maxCount = Math.max(...bins)
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
        Распределение времени выполнения
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 60 }}>
        {bins.map((count, i) => {
          const height = maxCount > 0 ? (count / maxCount) * 100 : 0
          const isP95 = i >= Math.floor(BINS * 0.95)
          return (
            <Tooltip key={i} title={`${Math.round(min + i * binSize)}–${Math.round(min + (i + 1) * binSize)} мс: ${count} замеров`}>
              <Box sx={{
                flex: 1,
                height: `${Math.max(height, count > 0 ? 4 : 0)}%`,
                bgcolor: isP95 ? 'warning.main' : 'primary.main',
                borderRadius: '2px 2px 0 0',
                opacity: 0.85,
                '&:hover': { opacity: 1 },
                cursor: 'default',
              }} />
            </Tooltip>
          )
        })}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
        <Typography variant="caption" color="text.secondary">{Math.round(min)} мс</Typography>
        <Typography variant="caption" color="text.secondary">{Math.round(max)} мс</Typography>
      </Box>
    </Box>
  )
}

function CompareRow({ label, client, server, serverLabel, highlight }: {
  label: string; client: string; server: string; serverLabel?: string; highlight?: boolean
}) {
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
      px: 1.5, py: 0.75,
      bgcolor: highlight ? 'rgba(33,150,243,0.08)' : 'transparent',
      borderRadius: 1,
    }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={highlight ? 'bold' : 'normal'} sx={{ color: 'success.main' }}>{client}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" sx={{ color: 'error.main' }}>{server}</Typography>
        {serverLabel && (
          <Chip label={serverLabel} size="small" sx={{ height: 16, fontSize: 10,
            bgcolor: serverLabel === 'реальный' ? 'rgba(5,150,105,0.12)' : 'rgba(100,100,100,0.12)',
            color: serverLabel === 'реальный' ? 'success.main' : 'text.secondary',
          }} />
        )}
      </Box>
    </Box>
  )
}

function generateMarkdown(result: BenchmarkResult, rtt: number | null, mode: 'wasm-only' | 'compare'): string {
  const hasServer = mode === 'compare' && !!result.serverStats
  const serverAvg = result.serverStats?.avg
  const speedup = hasServer && serverAvg ? (serverAvg / result.stats.avg).toFixed(1) : null
  const clientLabel = result.language === 'javascript' ? 'клиентский Worker' : 'клиентское выполнение'

  return [
    `## Результаты бенчмарка — ${result.language.toUpperCase()} (${new Date(result.timestamp).toLocaleDateString('ru')})`,
    '',
    `**Итераций:** ${result.iterations} | **Прогрев:** ${result.warmupIterations} | **RTT до сервера:** ${rtt != null ? rtt + ' мс' : 'н/д'} | **Режим:** ${hasServer ? 'реальный серверный замер' : 'только клиент'}`,
    '',
    `| Метрика | ${clientLabel} | Серверный подход${hasServer ? ' (реальный контейнер)' : ''} |`,
    '|---------|:------------:|:-------------------------:|',
    `| Среднее | ${result.stats.avg} мс | ${hasServer ? result.serverStats!.avg + ' мс' : '—'} |`,
    `| Медиана | ${result.stats.median} мс | ${hasServer ? result.serverStats!.median + ' мс' : '—'} |`,
    `| P95 | ${result.stats.p95} мс | ${hasServer ? result.serverStats!.p95 + ' мс' : '—'} |`,
    `| **Отношение server/client** | — | ${speedup ? '**' + speedup + '×**' : '—'} |`,
    '',
    hasServer
      ? `> Серверный замер: фактический round-trip до /api/execute через отдельный execution-контейнер; процессное время сервиса: avg ${result.serverProcessStats?.avg ?? '—'} мс.`
      : `> Серверный замер не выполнялся в этом режиме.`,
  ].join('\n')
}

interface Props {
  open: boolean
  onClose: () => void
  result: BenchmarkResult | null
  running: boolean
  progress: number
  isEngineReady: boolean
  onRunBenchmark: (iterations: number) => void
  mode: 'wasm-only' | 'compare'
  onModeChange: (mode: 'wasm-only' | 'compare') => void
}

export default function ProfilerPanel({
  open, onClose, result, running, progress, isEngineReady, onRunBenchmark, mode, onModeChange,
}: Props) {
  const [iterations, setIterations] = useState(100)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(generateMarkdown(result, result.networkRtt, mode))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sr = result?.serverResult
  const isRealServer = mode === 'compare' && !!result?.serverStats
  const serverAvg = result?.serverStats?.avg ?? null
  const serverLabel = isRealServer ? 'реальный' : undefined
  const speedup = result && serverAvg ? (serverAvg / result.stats.avg).toFixed(1) : null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <SpeedIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
          Профилировщик производительности
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        {/* Режим */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>Режим:</Typography>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && onModeChange(v)}
            size="small"
          >
            <ToggleButton value="wasm-only" sx={{ px: 2 }}>Только клиент</ToggleButton>
            <ToggleButton value="compare" sx={{ px: 2 }}>Реальный сервер</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Настройки запуска */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>Итераций:</Typography>
          <ToggleButtonGroup value={iterations} exclusive onChange={(_, v) => v && setIterations(v)} size="small">
            {[10, 50, 100, 500].map(n => (
              <ToggleButton key={n} value={n} sx={{ px: 2 }}>{n}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button
            variant="contained"
            onClick={() => onRunBenchmark(iterations)}
            disabled={running || !isEngineReady}
            startIcon={<SpeedIcon />}
            sx={{ ml: 'auto', flexShrink: 0 }}
          >
            {running ? `${progress}%` : 'Запустить'}
          </Button>
        </Box>

        {running && <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1 }} />}

        {!isEngineReady && (
          <Alert severity="warning" sx={{ py: 0.5 }}>Сначала инициализируйте движок в рабочей области</Alert>
        )}

        {result && !running && (
          <>
            <Histogram times={result.times} />
            <Divider />

            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', px: 1.5, py: 0.5, mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">Метрика</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">Клиент</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  Сервер ({isRealServer ? 'реальный' : 'нет замера'})
                </Typography>
              </Box>

              <CompareRow label="Минимум"
                client={`${result.stats.min} мс`}
                server={isRealServer ? `${result.serverStats!.min} мс` : '—'}
                serverLabel={serverLabel}
              />
              <CompareRow label="Максимум"
                client={`${result.stats.max} мс`}
                server={isRealServer ? `${result.serverStats!.max} мс` : '—'}
                serverLabel={serverLabel}
              />
              <CompareRow label="Среднее" highlight
                client={`${result.stats.avg} мс`}
                server={isRealServer ? `${serverAvg} мс` : '—'}
                serverLabel={serverLabel}
              />
              <CompareRow label="Медиана"
                client={`${result.stats.median} мс`}
                server={isRealServer ? `${result.serverStats!.median} мс` : '—'}
                serverLabel={serverLabel}
              />
              <CompareRow label="P95"
                client={`${result.stats.p95} мс`}
                server={isRealServer ? `${result.serverStats!.p95} мс` : '—'}
                serverLabel={serverLabel}
              />

              {speedup && (
                <Box sx={{
                  mt: 1.5, p: 1.5, bgcolor: 'rgba(5,150,105,0.06)',
                  border: '1px solid rgba(5,150,105,0.2)', borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Отношение сервер/клиент
                    </Typography>
                    {isRealServer ? (
                      <Typography variant="caption" sx={{ color: 'success.main' }}>
                        Реальный execution-контейнер: {result.serverIterations} запусков · process avg {result.serverProcessStats?.avg ?? '—'} мс
                      </Typography>
                    ) : null}
                  </Box>
                  <Chip
                    label={`${speedup}x`}
                    sx={{ bgcolor: 'rgba(5,150,105,0.12)', color: 'success.main', fontWeight: 700, fontSize: 16, height: 36 }}
                  />
                </Box>
              )}

              {mode === 'compare' && sr?.timedOut && (
                <Alert severity="warning" sx={{ mt: 1 }}>Серверное выполнение превысило таймаут (10 с)</Alert>
              )}
              {mode === 'compare' && !result.serverStats && !running && (
                <Alert severity="info" sx={{ mt: 1 }}>Запустите бенчмарк для получения реального серверного замера</Alert>
              )}
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label={`${result.iterations} итераций`} />
              <Chip size="small" label={result.language.toUpperCase()} />
              {result.networkRtt != null && <Chip size="small" label={`RTT: ${result.networkRtt} мс`} />}
              {isRealServer && <Chip size="small" label={`Сервер: ${result.serverIterations} ит.`} color="success" />}
              <Chip size="small" label={new Date(result.timestamp).toLocaleTimeString('ru')} sx={{ ml: 'auto' }} />
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={handleCopy}
          disabled={!result}
          color={copied ? 'success' : 'primary'}
        >
          {copied ? 'Скопировано!' : 'Копировать как Markdown'}
        </Button>
        <Button onClick={onClose} color="inherit">Закрыть</Button>
      </DialogActions>
    </Dialog>
  )
}
