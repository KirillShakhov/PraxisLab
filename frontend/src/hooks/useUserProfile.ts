import { useState, useCallback } from 'react'
import type { User } from '../types'

const STORAGE_KEY = 'praxis_user_profile'

const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
]

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

function loadFromStorage(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function useUserProfile() {
  const [user, setUser] = useState<User | null>(() => loadFromStorage())

  const createProfile = useCallback((username: string): User => {
    const newUser: User = {
      id: crypto.randomUUID(),
      username: username.trim(),
      color: randomColor(),
      createdAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
    setUser(newUser)
    return newUser
  }, [])

  const updateUsername = useCallback((username: string) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, username: username.trim() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return {
    user,
    isProfileReady: user !== null,
    createProfile,
    updateUsername,
  }
}
