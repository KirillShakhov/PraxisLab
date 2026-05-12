import { createContext, useContext } from 'react'
import type { Course } from '../types'
import type { SyncStatus } from '../hooks/useCourseSyncManager'

export interface SyncContextValue {
  syncStatus: SyncStatus
  lastSyncAt: number | null
  pushCourse: (course: Course) => Promise<void>
  deleteFromServer: (id: string) => Promise<void>
}

export const SyncContext = createContext<SyncContextValue>({
  syncStatus: 'idle',
  lastSyncAt: null,
  pushCourse: async () => {},
  deleteFromServer: async () => {},
})

export const useSyncContext = () => useContext(SyncContext)
