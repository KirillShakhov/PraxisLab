import React from 'react';
import { Box, Typography, Button, TextField, ToggleButton, ToggleButtonGroup, Chip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ComputerIcon from '@mui/icons-material/Computer';
import CloudIcon from '@mui/icons-material/Cloud';

export type RunMode = 'wasm' | 'server'

interface TerminalProps {
    output: string;
    stdin: string;
    isWasmReady: boolean;
    isRunning: boolean;
    durationMs?: number | null;
    runMode: RunMode;
    onRunModeChange: (mode: RunMode) => void;
    onRunCode: () => void;
    onStdinChange: (value: string) => void;
}

export default function Terminal({
    output, stdin, isWasmReady, isRunning, durationMs, runMode, onRunModeChange, onRunCode, onStdinChange,
}: TerminalProps) {
    const canRun = runMode === 'server' ? true : isWasmReady
    const isDisabled = !canRun || isRunning

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1a1a2e' }}>
            {/* Заголовок */}
            <Box sx={{
                px: 2, py: 0.75,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 1,
                bgcolor: '#16213e',
            }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f57' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#febc2e' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#28c840' }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'monospace', flex: 1 }}>
                    {runMode === 'wasm' ? 'Консоль (WASM / локально)' : 'Консоль (сервер / Docker)'}
                </Typography>
                {durationMs != null && (
                    <Chip
                        label={`${Math.round(durationMs)} мс`}
                        size="small"
                        sx={{
                            height: 18, fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
                            bgcolor: 'rgba(74,222,128,0.12)', color: '#4ade80',
                            border: '1px solid rgba(74,222,128,0.2)',
                        }}
                    />
                )}
            </Box>

            {/* Вывод */}
            <Box sx={{
                flexGrow: 1,
                bgcolor: '#0d1117',
                color: '#4ade80',
                p: 1.5,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: 13,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                overflowY: 'auto',
                letterSpacing: '0.01em',
            }}>
                {output}
            </Box>

            {/* Stdin + Run */}
            <Box sx={{ p: 1.5, bgcolor: '#16213e', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <TextField
                    label="stdin"
                    placeholder="Входные данные для программы"
                    multiline
                    rows={2}
                    value={stdin}
                    onChange={(e) => onStdinChange(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(0,0,0,0.3)', borderRadius: '8px',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                            '&.Mui-focused fieldset': { borderColor: '#818cf8' },
                        },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.35)' },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
                        '& .MuiInputBase-input': {
                            fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
                            color: 'rgba(255,255,255,0.8)',
                        },
                    }}
                />

                {/* Переключатель режима */}
                <ToggleButtonGroup
                    value={runMode}
                    exclusive
                    onChange={(_, v) => v && onRunModeChange(v)}
                    size="small"
                    fullWidth
                    sx={{
                        '& .MuiToggleButton-root': {
                            color: 'rgba(255,255,255,0.45)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            fontSize: 11, py: 0.5, textTransform: 'none',
                            '&.Mui-selected': {
                                color: '#fff',
                                bgcolor: 'rgba(79,70,229,0.35)',
                                borderColor: 'rgba(79,70,229,0.5)',
                            },
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                        },
                    }}
                >
                    <ToggleButton value="wasm">
                        <ComputerIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        Локально (WASM)
                    </ToggleButton>
                    <ToggleButton value="server">
                        <CloudIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        Сервер (Docker)
                    </ToggleButton>
                </ToggleButtonGroup>

                <Button
                    variant="contained"
                    disabled={isDisabled}
                    onClick={onRunCode}
                    startIcon={isRunning ? <HourglassEmptyIcon /> : <PlayArrowIcon />}
                    fullWidth
                    sx={{
                        py: 1, fontWeight: 700, textTransform: 'none', fontSize: 13, borderRadius: '8px',
                        background: !isDisabled
                            ? runMode === 'server'
                                ? 'linear-gradient(135deg, #059669 0%, #0d9488 100%)'
                                : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                            : undefined,
                        boxShadow: !isDisabled ? '0 4px 12px rgba(79,70,229,0.35)' : 'none',
                        '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' },
                    }}
                >
                    {isRunning
                        ? 'Выполнение...'
                        : runMode === 'wasm'
                            ? (isWasmReady ? 'Запустить локально (WASM)' : 'Загрузка рантайма...')
                            : 'Запустить на сервере'}
                </Button>
            </Box>
        </Box>
    );
}
