import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, List, ListItem, ListItemText,
    ListItemSecondaryAction, IconButton, LinearProgress,
    Divider, Button, Card, CardContent, Container
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { COMPILERS } from '../../compilers';
import { getCacheSize, formatBytes } from '../../utils/storage';

// Принимаем appManager через пропсы (убедись, что передаешь его в App.jsx)
export default function Settings({ appManager }) {
    const [stats, setStats] = useState([]);
    const [total, setTotal] = useState(0);
    const [quota, setQuota] = useState(0);

    const loadStats = async () => {
        const data = [];
        let totalSize = 0;

        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            setQuota(estimate.quota || 0);
        }

        // 1. ДОБАВЛЯЕМ СИСТЕМУ (ЯДРО) ПЕРВОЙ СТРОКОЙ
        const coreCacheName = 'lab-core-cache'; // Имя кэша из sw.js
        const coreSize = await getCacheSize(coreCacheName);

        data.push({
            id: 'core',
            name: 'Система (Оболочка В-Лабы)',
            size: coreSize,
            isCore: true // Флаг для особой логики удаления
        });
        totalSize += coreSize;

        // 2. ДОБАВЛЯЕМ КОМПИЛЯТОРЫ
        for (const compiler of Object.values(COMPILERS)) {
            const cacheName = compiler.CACHE_NAME || `wasm-compiler-${compiler.id}`;
            const size = await getCacheSize(cacheName);

            data.push({ ...compiler, size });
            totalSize += size;
        }

        setStats(data);
        setTotal(totalSize);
    };

    useEffect(() => { loadStats(); }, []);

    const handleDelete = async (item: any) => {
        if (item.isCore) {
            // Для системы используем мощный метод из менеджера (он сам вызовет confirm и reload)
            if (appManager && appManager.handleDeleteLabCore) {
                await appManager.handleDeleteLabCore();
            } else {
                alert("Ошибка: appManager не подключен к настройкам.");
            }
        } else {
            // Для компиляторов используем стандартное удаление
            if (window.confirm(`Удалить локальные файлы ${item.name}?`)) {
                await item.removeOffline();
                await loadStats();
            }
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ mb: 3 }}>
                Мониторинг ресурсов
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 320px', xs: '1fr' }, gap: 3 }}>
                <Paper variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider' }}>
                    <List disablePadding>
                        {stats.map((item, index) => (
                            <React.Fragment key={item.id}>
                                <ListItem sx={{ py: 2, px: 2.5 }}>
                                    <ListItemText
                                        primary={
                                            <Typography sx={{ color: item.isCore ? 'primary.main' : 'text.primary', fontWeight: 600 }}>
                                                {item.name}
                                            </Typography>
                                        }
                                        secondary={item.size > 0 ? `Занято: ${formatBytes(item.size)}` : 'Не загружено'}
                                        secondaryTypographyProps={{ sx: { color: item.size > 0 ? 'success.main' : 'text.disabled' } }}
                                    />
                                    <ListItemSecondaryAction>
                                        {item.size > 0 && (
                                            <IconButton color="error" onClick={() => handleDelete(item)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </ListItemSecondaryAction>
                                </ListItem>
                                {index < stats.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                </Paper>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Card sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                                <StorageIcon color="primary" />
                                <Typography variant="h6" fontWeight={600}>Память</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Всего: <strong style={{ color: 'inherit' }}>{formatBytes(total)}</strong>
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={quota ? (total / quota) * 100 : 0}
                                sx={{ height: 6, borderRadius: 3, mb: 2 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                Доступно браузером: {formatBytes(quota)}
                            </Typography>
                        </CardContent>
                    </Card>

                    {appManager?.handleNuclearWipe && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<WarningAmberIcon />}
                            onClick={appManager.handleNuclearWipe}
                            sx={{ borderRadius: 2, py: 1.5 }}
                        >
                            Экстренный сброс данных
                        </Button>
                    )}
                </Box>
            </Box>
        </Container>
    );
}