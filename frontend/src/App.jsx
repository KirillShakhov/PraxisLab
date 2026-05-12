import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import TopBar from './components/TopBar/TopBar';
import Settings from './components/Settings/Settings';
import ProfileSetupDialog from './components/ProfileSetupDialog/ProfileSetupDialog';
import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import CourseEditorPage from './pages/CourseEditorPage';
import SessionPage from './pages/SessionPage';
import { useAppManager } from './hooks/useAppManager';
import { useUserProfile } from './hooks/useUserProfile';
import { useCourseSyncManager } from './hooks/useCourseSyncManager';
import { SyncContext } from './contexts/SyncContext';

function App() {
    const appManager = useAppManager();
    const { user, isProfileReady, createProfile } = useUserProfile();
    const syncManager = useCourseSyncManager();

    useEffect(() => {
        if (appManager.isAppReady) {
            syncManager.runStartupSync(appManager.isOnline);
        }
    }, [appManager.isAppReady]);  // eslint-disable-line react-hooks/exhaustive-deps

    if (!appManager.isAppReady) {
        return (
            <Box sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '100vh',
                bgcolor: 'background.default',
            }}>
                <CircularProgress size={56} thickness={4} sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ mt: 3, fontWeight: 700, color: 'text.primary' }}>
                    Инициализация В-Лаборатории...
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                    Проверка децентрализованных узлов и кэша WASM
                </Typography>
            </Box>
        );
    }

    return (
        <SyncContext.Provider value={syncManager}>
        <Router>
                <ProfileSetupDialog
                open={!isProfileReady}
                onConfirm={createProfile}
            />

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                bgcolor: 'background.default',
            }}>
                <TopBar appManager={appManager} user={user} />

                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                    <Routes>
                        <Route path="/" element={user ? <HomePage user={user} /> : null} />
                        <Route path="/courses/new" element={user ? <CourseEditorPage user={user} /> : null} />
                        <Route path="/courses/:courseId/edit" element={user ? <CourseEditorPage user={user} /> : null} />
                        <Route path="/courses/:courseId" element={user ? <CoursePage user={user} /> : null} />
                        <Route
                            path="/session/:sessionId"
                            element={user ? <SessionPage user={user} isOnline={appManager.isOnline} /> : null}
                        />
                        <Route path="/settings" element={<Settings appManager={appManager} />} />
                        <Route path="/room/:id" element={<Navigate to="/" replace />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Box>
            </Box>
        </Router>
        </SyncContext.Provider>
    );
}

export default App;
