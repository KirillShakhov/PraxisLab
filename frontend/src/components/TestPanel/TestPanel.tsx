import React, { useState } from 'react'
import {
  Box, Typography, Button, CircularProgress, Chip,
  Collapse, IconButton, Tooltip, LinearProgress,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import type { TestCase } from '../../types'
import type { TestResult, TestStatus } from '../../hooks/useTestRunner'

function StatusIcon({ status, size = 16 }: { status: TestStatus; size?: number }) {
  const sx = { fontSize: size }
  switch (status) {
    case 'pass':    return <CheckCircleIcon sx={{ ...sx, color: '#4ade80' }} />
    case 'fail':    return <CancelIcon sx={{ ...sx, color: '#f87171' }} />
    case 'error':   return <ErrorIcon sx={{ ...sx, color: '#fb923c' }} />
    case 'running': return <CircularProgress size={size - 2} sx={{ color: '#818cf8' }} />
    default:        return <HourglassEmptyIcon sx={{ ...sx, color: '#475569' }} />
  }
}

function TestRow({
  tc, result, index,
}: {
  tc: TestCase
  result: TestResult | undefined
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const status: TestStatus = result?.status ?? 'pending'
  const canExpand = !tc.isHidden && result && (status === 'fail' || status === 'error' || status === 'pass')

  return (
    <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Box
        onClick={() => canExpand && setExpanded(e => !e)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 0.75,
          cursor: canExpand ? 'pointer' : 'default',
          '&:hover': canExpand ? { bgcolor: 'rgba(255,255,255,0.03)' } : {},
        }}
      >
        <StatusIcon status={status} />

        <Typography variant="body2" sx={{ flexGrow: 1, color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'monospace' }} noWrap>
          #{index + 1} {tc.description || `Тест ${index + 1}`}
        </Typography>

        {tc.isHidden && (
          <Tooltip title="Скрытый тест">
            <VisibilityOffIcon sx={{ fontSize: 13, color: '#475569' }} />
          </Tooltip>
        )}

        {result && result.executionMs > 0 && (
          <Typography variant="caption" sx={{ color: '#475569', fontSize: 10, fontFamily: 'monospace' }}>
            {result.executionMs}ms
          </Typography>
        )}

        {canExpand && (
          <IconButton size="small" sx={{ p: 0.25, color: '#475569' }}>
            {expanded ? <ExpandLessIcon sx={{ fontSize: 13 }} /> : <ExpandMoreIcon sx={{ fontSize: 13 }} />}
          </IconButton>
        )}
      </Box>

      {canExpand && (
        <Collapse in={expanded}>
          <Box sx={{ px: 1.5, pb: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {tc.input && (
              <Box>
                <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 0.4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  stdin:
                </Typography>
                <Box sx={{
                  bgcolor: '#0d1117', p: 0.75, borderRadius: 1, border: '1px solid rgba(255,255,255,0.07)',
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-wrap',
                }}>
                  {tc.input || '(пусто)'}
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 0.4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Ожидаемо:
                </Typography>
                <Box sx={{
                  bgcolor: 'rgba(74,222,128,0.05)', p: 0.75, borderRadius: 1,
                  border: '1px solid rgba(74,222,128,0.12)',
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#4ade80', whiteSpace: 'pre-wrap',
                }}>
                  {tc.expectedOutput || '(пусто)'}
                </Box>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 0.4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Фактически:
                </Typography>
                <Box sx={{
                  bgcolor: status === 'pass' ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.05)',
                  p: 0.75, borderRadius: 1,
                  border: `1px solid ${status === 'pass' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.15)'}`,
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                  color: status === 'pass' ? '#4ade80' : '#f87171',
                  whiteSpace: 'pre-wrap',
                }}>
                  {result.actualOutput || '(пусто)'}
                </Box>
              </Box>
            </Box>
          </Box>
        </Collapse>
      )}
    </Box>
  )
}

interface Props {
  testCases: TestCase[]
  results: TestResult[]
  running: boolean
  summary: { total: number; passed: number; failed: number; pending: number }
  isEngineReady: boolean
  onRunTests: () => void
}

export default function TestPanel({
  testCases, results, running, summary, isEngineReady, onRunTests,
}: Props) {
  if (testCases.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#16213e', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography variant="caption" sx={{ color: '#475569' }}>
          Нет тест-кейсов
        </Typography>
      </Box>
    )
  }

  const hasResults = results.length > 0
  const allDone = hasResults && summary.pending === 0

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      bgcolor: '#16213e', borderTop: '1px solid rgba(255,255,255,0.08)',
      minHeight: 0,
    }}>
      {/* Заголовок + кнопка */}
      <Box sx={{
        px: 1.5, py: 0.75, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        bgcolor: '#0f172a',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{
            color: 'rgba(255,255,255,0.35)', fontWeight: 700,
            letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 10,
          }}>
            Тесты
          </Typography>

          {allDone && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {summary.passed > 0 && (
                <Chip
                  label={`✓ ${summary.passed}`} size="small"
                  sx={{ bgcolor: 'rgba(74,222,128,0.1)', color: '#4ade80', height: 18, fontSize: 10, fontWeight: 600 }}
                />
              )}
              {summary.failed > 0 && (
                <Chip
                  label={`✗ ${summary.failed}`} size="small"
                  sx={{ bgcolor: 'rgba(248,113,113,0.1)', color: '#f87171', height: 18, fontSize: 10, fontWeight: 600 }}
                />
              )}
            </Box>
          )}
        </Box>

        <Button
          size="small"
          variant="contained"
          startIcon={running ? <CircularProgress size={11} color="inherit" /> : <PlayArrowIcon sx={{ fontSize: '14px !important' }} />}
          onClick={onRunTests}
          disabled={running || !isEngineReady}
          sx={{
            py: 0.3, px: 1.25, fontSize: 11, minWidth: 0,
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow: 'none',
            '&:hover': { background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)' },
            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.25)' },
          }}
        >
          {running ? 'Идёт...' : 'Запустить'}
        </Button>
      </Box>

      {running && (
        <LinearProgress
          variant="determinate"
          value={summary.total > 0 ? ((summary.passed + summary.failed) / summary.total) * 100 : 0}
          sx={{
            height: 2, flexShrink: 0,
            bgcolor: 'rgba(255,255,255,0.05)',
            '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' },
          }}
        />
      )}

      <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
        {testCases.map((tc, idx) => (
          <TestRow
            key={tc.id}
            tc={tc}
            index={idx}
            result={results.find(r => r.testId === tc.id)}
          />
        ))}
      </Box>
    </Box>
  )
}
