import type { Course, Session } from '../types'

const DB_NAME = 'praxis-main'
const DB_VERSION = 1

let _db: IDBDatabase | null = null

function getDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('courses')) {
        db.createObjectStore('courses', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'id' })
        store.createIndex('by_lastActive', 'lastActive', { unique: false })
      }
    }

    req.onsuccess = () => {
      _db = req.result
      _db.onclose = () => { _db = null }
      resolve(_db)
    }

    req.onerror = () => reject(req.error)
  })
}

function run<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return getDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export const courseDB = {
  save(course: Course): Promise<void> {
    return run('courses', 'readwrite', s => s.put(course)) as Promise<unknown> as Promise<void>
  },

  get(id: string): Promise<Course | undefined> {
    return run('courses', 'readonly', s => s.get(id))
  },

  getAll(): Promise<Course[]> {
    return run('courses', 'readonly', s => s.getAll())
  },

  delete(id: string): Promise<void> {
    return run('courses', 'readwrite', s => s.delete(id)) as Promise<unknown> as Promise<void>
  },
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export const sessionDB = {
  save(session: Session): Promise<void> {
    return run('sessions', 'readwrite', s => s.put(session)) as Promise<unknown> as Promise<void>
  },

  get(id: string): Promise<Session | undefined> {
    return run('sessions', 'readonly', s => s.get(id))
  },

  getRecent(limit = 10): Promise<Session[]> {
    return getDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly')
      const index = tx.objectStore('sessions').index('by_lastActive')
      const req = index.openCursor(null, 'prev')
      const results: Session[] = []
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor && results.length < limit) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      req.onerror = () => reject(req.error)
    }))
  },

  getAll(): Promise<Session[]> {
    return run('sessions', 'readonly', s => s.getAll())
  },

  delete(id: string): Promise<void> {
    return run('sessions', 'readwrite', s => s.delete(id)) as Promise<unknown> as Promise<void>
  },
}
