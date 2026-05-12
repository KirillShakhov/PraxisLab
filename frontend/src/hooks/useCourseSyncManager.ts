import { useState, useCallback } from 'react'
import type { Course } from '../types'
import { courseDB } from '../db'
import {
  fetchAllCoursesFromServer,
  pushCourseToServer,
  deleteCourseOnServer,
} from '../api/courseSyncApi'

export type SyncStatus = 'idle' | 'syncing' | 'done' | 'offline' | 'error'

export function useCourseSyncManager() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)

  const runStartupSync = useCallback(async (isOnline: boolean) => {
    if (!isOnline) { setSyncStatus('offline'); return }

    setSyncStatus('syncing')
    try {
      const [serverCourses, localCourses] = await Promise.all([
        fetchAllCoursesFromServer(),
        courseDB.getAll(),
      ])

      const localMap = new Map(localCourses.map(c => [c.id, c]))
      const serverMap = new Map(serverCourses.map(c => [c.id, c]))
      const allIds = new Set([...localMap.keys(), ...serverMap.keys()])

      await Promise.all([...allIds].map(async id => {
        const local = localMap.get(id)
        const server = serverMap.get(id)

        if (local && server) {
          if (local.updatedAt > server.updatedAt) {
            await pushCourseToServer(local)
          } else if (server.updatedAt > local.updatedAt) {
            await courseDB.save(server)
          }
        } else if (local && !server) {
          await pushCourseToServer(local)
        } else if (server && !local) {
          await courseDB.save(server)
        }
      }))

      setLastSyncAt(Date.now())
      setSyncStatus('done')
    } catch {
      setSyncStatus('error')
    }
  }, [])

  const pushCourse = useCallback(async (course: Course) => {
    try {
      await pushCourseToServer(course)
    } catch { /* offline — ignore */ }
  }, [])

  const deleteFromServer = useCallback(async (id: string) => {
    try {
      await deleteCourseOnServer(id)
    } catch { /* offline — ignore */ }
  }, [])

  return { syncStatus, lastSyncAt, runStartupSync, pushCourse, deleteFromServer }
}
