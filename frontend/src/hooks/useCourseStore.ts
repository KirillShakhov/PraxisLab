import { useState, useEffect, useCallback } from 'react'
import type { Course, Session } from '../types'
import { courseDB, sessionDB } from '../db'

// ─── Courses ─────────────────────────────────────────────────────────────────

export function useCourseStore(
  authorId: string | undefined,
  onPush?: (course: Course) => void,
  onDelete?: (id: string) => void,
) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const all = await courseDB.getAll()
      setCourses(all.sort((a, b) => b.updatedAt - a.updatedAt))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const saveCourse = useCallback(async (course: Course) => {
    await courseDB.save(course)
    onPush?.(course)
    await reload()
  }, [reload, onPush])

  const deleteCourse = useCallback(async (id: string) => {
    await courseDB.delete(id)
    onDelete?.(id)
    setCourses(prev => prev.filter(c => c.id !== id))
  }, [onDelete])

  const myCourses = authorId
    ? courses.filter(c => c.authorId === authorId)
    : courses

  return { courses, myCourses, loading, saveCourse, deleteCourse, reload }
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export function useRecentSessions() {
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    sessionDB.getRecent(8).then(setSessions)
  }, [])

  const createSession = useCallback(async (
    labId: string,
    courseId: string,
    labTitle: string,
    courseTitle: string,
    language: string,
  ): Promise<string> => {
    const session: Session = {
      id: crypto.randomUUID(),
      labId,
      courseId,
      labTitle,
      courseTitle,
      language,
      createdAt: Date.now(),
      lastActive: Date.now(),
    }
    await sessionDB.save(session)
    setSessions(prev => [session, ...prev.slice(0, 7)])
    return session.id
  }, [])

  const touchSession = useCallback(async (sessionId: string) => {
    const s = await sessionDB.get(sessionId)
    if (s) await sessionDB.save({ ...s, lastActive: Date.now() })
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    await sessionDB.delete(sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
  }, [])

  return { sessions, createSession, touchSession, deleteSession }
}
