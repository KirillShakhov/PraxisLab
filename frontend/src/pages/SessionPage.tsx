import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, Button, CircularProgress } from '@mui/material'
import type { Lab, Course, Session, User } from '../types'
import { sessionDB, courseDB } from '../db'
import Workspace from '../components/Workspace/Workspace'
import { markLabComplete, getCompletedLabs } from '../utils/progress'

interface Props {
  user: User
  isOnline: boolean
}

export default function SessionPage({ user, isOnline }: Props) {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [lab, setLab] = useState<Lab | undefined>(undefined)
  const [course, setCourse] = useState<Course | null>(null)
  const [nextLab, setNextLab] = useState<Lab | null>(null)
  const [labIndex, setLabIndex] = useState(1)
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) { setLoading(false); return }

    const load = async () => {
      const session = await sessionDB.get(sessionId)
      if (!session) {
        // Collaborator joining via shared link — no local session data.
        // Workspace will sync lab info from Yjs.
        setLoading(false)
        return
      }

      await sessionDB.save({ ...session, lastActive: Date.now() })

      const c = await courseDB.get(session.courseId)
      if (!c) { setLoading(false); return }

      const foundLab = c.labs.find(l => l.id === session.labId)
      if (!foundLab) { setLoading(false); return }

      const sorted = c.labs.slice().sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex(l => l.id === session.labId)
      const next = idx >= 0 ? (sorted[idx + 1] ?? null) : null

      setCourse(c)
      setLab(foundLab)
      setNextLab(next)
      setLabIndex(idx + 1)
      setCompletedCount(getCompletedLabs(c.id).size)
      setLoading(false)
    }

    load()
  }, [sessionId])

  const handleLabComplete = useCallback(() => {
    if (!course || !lab) return
    markLabComplete(course.id, lab.id)
    setCompletedCount(getCompletedLabs(course.id).size)
  }, [course, lab])

  const handleNavigateNext = useCallback(async () => {
    if (!nextLab || !course) return
    const newSession: Session = {
      id: crypto.randomUUID(),
      labId: nextLab.id,
      courseId: course.id,
      labTitle: nextLab.title,
      courseTitle: course.title,
      language: nextLab.language,
      createdAt: Date.now(),
      lastActive: Date.now(),
    }
    await sessionDB.save(newSession)
    navigate(`/session/${newSession.id}`)
  }, [nextLab, course, navigate])

  const handleClearSession = useCallback(async () => {
    if (!sessionId || !course || !lab) return
    // Удаляем Yjs-состояние из localStorage
    localStorage.removeItem(`praxis_ydoc_${sessionId}`)
    // Удаляем текущую сессию
    await sessionDB.delete(sessionId)
    // Создаём новую сессию для той же лабы
    const newSession: Session = {
      id: crypto.randomUUID(),
      labId: lab.id,
      courseId: course.id,
      labTitle: lab.title,
      courseTitle: course.title,
      language: lab.language,
      createdAt: Date.now(),
      lastActive: Date.now(),
    }
    await sessionDB.save(newSession)
    navigate(`/session/${newSession.id}`)
  }, [sessionId, course, lab, navigate])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary">Загрузка сессии...</Typography>
      </Box>
    )
  }

  if (!sessionId) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">Сессия не найдена</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Возможно, она была удалена или ссылка устарела
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/')}>На главную</Button>
      </Box>
    )
  }

  return (
    <Workspace
      key={sessionId}
      roomId={sessionId}
      isOnline={isOnline}
      lab={lab}
      user={user}
      nextLab={nextLab}
      labIndex={labIndex}
      totalLabs={course?.labs.length ?? 0}
      completedCount={completedCount}
      onLabComplete={handleLabComplete}
      onNavigateNext={handleNavigateNext}
      onClearSession={lab ? handleClearSession : undefined}
    />
  )
}
