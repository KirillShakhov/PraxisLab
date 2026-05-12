import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar, Toolbar, Box, Button, Chip, IconButton,
    Tooltip, Divider, Avatar, Typography, CircularProgress,
} from '@mui/material';
import { sessionDB } from '../../db';
import InstallDesktopIcon from '@mui/icons-material/InstallDesktop';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import SyncIcon from '@mui/icons-material/Sync';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { useThemeMode } from '../../contexts/ThemeModeContext';
import { useSyncContext } from '../../contexts/SyncContext';
import type { User } from '../../types';

type ThemeMode = 'auto' | 'light' | 'dark'

interface Props {
    appManager: any;
    user?: User | null;
}

export default function TopBar({ appManager, user }: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const { mode, setMode } = useThemeMode();
    const { syncStatus, lastSyncAt } = useSyncContext();

    const {
        isOnline, installPrompt, isLabCached, isLabDownloading, hasLabUpdate,
        handleInstallApp, handleDownloadLabCore, handleUpdateLabCore, handleDeleteLabCore,
    } = appManager;

    const isSettingsPage = location.pathname === '/settings';
    const isHomePage = location.pathname === '/';
    const isSession = location.pathname.startsWith('/session/');

    const [sessionContext, setSessionContext] = useState<{ labTitle: string; courseTitle: string } | null>(null);

    useEffect(() => {
        if (!isSession) { setSessionContext(null); return; }
        const sessionId = location.pathname.split('/session/')[1];
        if (!sessionId) return;
        sessionDB.get(sessionId).then(s => {
            if (s) setSessionContext({ labTitle: s.labTitle, courseTitle: s.courseTitle });
        });
    }, [location.pathname, isSession]);

    const cycleTheme = () => {
        const next: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'auto' }
        setMode(next[mode])
    }

    const themeIcon = mode === 'light'
        ? <LightModeIcon fontSize="small" />
        : mode === 'dark'
            ? <DarkModeIcon fontSize="small" />
            : <SettingsBrightnessIcon fontSize="small" />

    const themeLabel = mode === 'auto' ? 'Авто' : mode === 'light' ? 'Светлая' : 'Тёмная'

    return (
        <AppBar
            position="static"
            elevation={0}
            sx={{
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
                zIndex: (theme) => theme.zIndex.drawer + 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
        >
            <Toolbar sx={{ justifyContent: 'space-between', minHeight: 60 }}>

                {/* Лого + навигация */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                        onClick={() => navigate('/')}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 1,
                            cursor: 'pointer', userSelect: 'none',
                            '&:hover': { opacity: 0.85 },
                        }}
                    >
                        <Box sx={{
                            width: 30, height: 30, borderRadius: '8px',
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 14, lineHeight: 1 }}>
                                P
                            </Typography>
                        </Box>
                        <Typography
                            variant="h6"
                            fontWeight={700}
                            sx={{ color: 'text.primary', fontSize: 16 }}
                        >
                            Praxis
                        </Typography>
                    </Box>

                    {!isHomePage && (
                        <Tooltip title="Главная">
                            <IconButton
                                size="small"
                                onClick={() => navigate('/')}
                                sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}
                            >
                                <HomeIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}

                    {isSession && sessionContext && (
                        <>
                            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: 'divider' }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 240 }}>
                                    {sessionContext.courseTitle}
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="text.primary" noWrap sx={{ maxWidth: 240 }}>
                                    {sessionContext.labTitle}
                                </Typography>
                            </Box>
                        </>
                    )}
                </Box>

                {/* Правая часть */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>

                    {!isSession && (
                        <>
                            {isLabDownloading && (
                                <Chip label="Загрузка ядра..." size="small" color="primary" variant="outlined" />
                            )}

                            {!isLabCached && !isLabDownloading && isOnline && (
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<CloudDownloadIcon />}
                                    onClick={handleDownloadLabCore}
                                >
                                    Скачать оффлайн
                                </Button>
                            )}

                            {isLabCached && !isLabDownloading && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {hasLabUpdate && isOnline ? (
                                        <Button
                                            variant="contained"
                                            color="warning"
                                            size="small"
                                            startIcon={<SyncIcon />}
                                            onClick={handleUpdateLabCore}
                                        >
                                            Обновить
                                        </Button>
                                    ) : (
                                        <Chip
                                            icon={<CloudDoneIcon />}
                                            label="Offline"
                                            size="small"
                                            variant="outlined"
                                            color="success"
                                        />
                                    )}
                                    <Tooltip title="Удалить из кэша">
                                        <IconButton color="error" onClick={handleDeleteLabCore} size="small">
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            )}

                            <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider', mx: 0.5 }} />
                        </>
                    )}

                    {/* Индикатор синхронизации курсов */}
                    {syncStatus === 'syncing' && (
                        <Chip
                            icon={<CircularProgress size={12} sx={{ color: 'primary.main !important' }} />}
                            label="Синхронизация..."
                            size="small"
                            variant="outlined"
                            color="primary"
                        />
                    )}
                    {syncStatus === 'done' && lastSyncAt && (
                        <Tooltip title={`Синхронизировано в ${new Date(lastSyncAt).toLocaleTimeString('ru')}`}>
                            <Chip
                                icon={<CloudDoneIcon sx={{ fontSize: '14px !important' }} />}
                                label="Синхронизировано"
                                size="small"
                                variant="outlined"
                                color="success"
                            />
                        </Tooltip>
                    )}
                    {syncStatus === 'error' && (
                        <Chip
                            icon={<WarningAmberIcon sx={{ fontSize: '14px !important' }} />}
                            label="Ошибка синхр."
                            size="small"
                            color="warning"
                        />
                    )}

                    <Chip
                        icon={isOnline
                            ? <CloudDoneIcon sx={{ fontSize: '14px !important' }} />
                            : <CloudOffIcon sx={{ fontSize: '14px !important' }} />
                        }
                        label={isOnline ? 'Online' : 'Offline'}
                        size="small"
                        sx={{
                            bgcolor: isOnline ? 'rgba(5,150,105,0.08)' : 'rgba(217,119,6,0.08)',
                            color: isOnline ? '#059669' : '#d97706',
                            border: `1px solid ${isOnline ? 'rgba(5,150,105,0.25)' : 'rgba(217,119,6,0.25)'}`,
                            fontWeight: 600,
                        }}
                    />

                    <Tooltip title={`Тема: ${themeLabel}`}>
                        <IconButton
                            size="small"
                            onClick={cycleTheme}
                            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}
                        >
                            {themeIcon}
                        </IconButton>
                    </Tooltip>

                    {installPrompt && (
                        <Tooltip title="Установить как приложение">
                            <IconButton color="primary" onClick={handleInstallApp} size="small">
                                <InstallDesktopIcon />
                            </IconButton>
                        </Tooltip>
                    )}

                    <Tooltip title="Настройки хранилища">
                        <IconButton
                            size="small"
                            onClick={() => navigate('/settings')}
                            sx={{
                                color: isSettingsPage ? 'primary.main' : 'text.secondary',
                                bgcolor: isSettingsPage ? 'rgba(79,70,229,0.08)' : 'transparent',
                                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                            }}
                        >
                            <SettingsIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {user && (
                        <Tooltip title={user.username}>
                            <Avatar
                                sx={{
                                    width: 32, height: 32,
                                    bgcolor: user.color,
                                    fontSize: 13, fontWeight: 700,
                                    cursor: 'default',
                                    boxShadow: '0 0 0 2px #fff, 0 0 0 3px rgba(79,70,229,0.2)',
                                }}
                            >
                                {user.username.charAt(0).toUpperCase()}
                            </Avatar>
                        </Tooltip>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
}
