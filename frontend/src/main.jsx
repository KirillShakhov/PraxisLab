import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeModeProvider, useThemeMode } from './contexts/ThemeModeContext.tsx'

registerSW({ immediate: true })

const shadows = [
    'none',
    '0 1px 2px rgba(0,0,0,0.06)',
    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)',
    '0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)',
    '0 20px 25px rgba(0,0,0,0.08), 0 10px 10px rgba(0,0,0,0.04)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
    '0 25px 50px rgba(0,0,0,0.12)',
]

const commonTypography = {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
}

const commonComponents = {
    MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiAppBar: {
        styleOverrides: {
            root: { backgroundImage: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
        },
    },
    MuiButton: {
        styleOverrides: {
            root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
            contained: {
                boxShadow: 'none',
                '&:hover': { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
            },
        },
    },
    MuiChip: {
        styleOverrides: { root: { borderRadius: 6, fontWeight: 500 } },
    },
    MuiListItemButton: {
        styleOverrides: { root: { borderRadius: 6 } },
    },
}

const lightTheme = createTheme({
    palette: {
        mode: 'light',
        background: { default: '#f8fafc', paper: '#ffffff' },
        primary: { main: '#4f46e5', light: '#818cf8', dark: '#3730a3', contrastText: '#ffffff' },
        secondary: { main: '#7c3aed' },
        success: { main: '#059669' },
        warning: { main: '#d97706' },
        error: { main: '#dc2626' },
        text: { primary: '#1e293b', secondary: '#64748b' },
        divider: '#e2e8f0',
    },
    typography: commonTypography,
    shape: { borderRadius: 10 },
    shadows,
    components: {
        ...commonComponents,
        MuiCssBaseline: {
            styleOverrides: { body: { backgroundColor: '#f8fafc' } },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: { borderRadius: 8 },
                notchedOutline: { borderColor: '#e2e8f0' },
            },
        },
    },
})

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        background: { default: '#0d1117', paper: '#161b22' },
        primary: { main: '#818cf8', light: '#a5b4fc', dark: '#4f46e5', contrastText: '#ffffff' },
        secondary: { main: '#a78bfa' },
        success: { main: '#34d399' },
        warning: { main: '#fbbf24' },
        error: { main: '#f87171' },
        text: { primary: '#e2e8f0', secondary: '#94a3b8' },
        divider: '#30363d',
    },
    typography: commonTypography,
    shape: { borderRadius: 10 },
    shadows,
    components: {
        ...commonComponents,
        MuiCssBaseline: {
            styleOverrides: { body: { backgroundColor: '#0d1117' } },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: 'none',
                    border: '1px solid #30363d',
                    borderRadius: 12,
                    backgroundColor: '#161b22',
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: { borderRadius: 8 },
                notchedOutline: { borderColor: '#30363d' },
            },
        },
    },
})

function ThemeWrapper({ children }) {
    const { effectiveMode } = useThemeMode()
    const theme = effectiveMode === 'dark' ? darkTheme : lightTheme
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    )
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeModeProvider>
            <ThemeWrapper>
                <App />
            </ThemeWrapper>
        </ThemeModeProvider>
    </React.StrictMode>,
)
