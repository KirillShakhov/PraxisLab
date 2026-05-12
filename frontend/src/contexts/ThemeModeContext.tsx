import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'

type ThemeMode = 'auto' | 'light' | 'dark'

interface ThemeModeContextValue {
  mode: ThemeMode
  effectiveMode: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'auto',
  effectiveMode: 'light',
  setMode: () => {},
})

const STORAGE_KEY = 'praxis_theme_mode'

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return (saved as ThemeMode) || 'auto'
  })

  const [systemIsDark, setSystemIsDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const effectiveMode = useMemo<'light' | 'dark'>(() => {
    if (mode === 'auto') return systemIsDark ? 'dark' : 'light'
    return mode
  }, [mode, systemIsDark])

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(STORAGE_KEY, newMode)
  }

  return (
    <ThemeModeContext.Provider value={{ mode, effectiveMode, setMode }}>
      {children}
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode() {
  return useContext(ThemeModeContext)
}
