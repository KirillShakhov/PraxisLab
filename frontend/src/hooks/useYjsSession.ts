import { useState, useEffect, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr'
import { MessagePackHubProtocol } from '@microsoft/signalr-protocol-msgpack'
import type { User, Participant } from '../types'

// ─── Утилиты localStorage ────────────────────────────────────────────────────

function uint8ToBase64(u8: Uint8Array): string {
  let binary = ''
  u8.forEach(b => binary += String.fromCharCode(b))
  return btoa(binary)
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64)
  const u8 = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i)
  return u8
}

// ─── Хук ─────────────────────────────────────────────────────────────────────

export function useYjsSession(
  roomId: string,
  isOnline: boolean,
  initialFiles: Record<string, string>,
  currentUser?: User | null,
) {
  // Y.Doc инициализируется до вызовов useState, чтобы fileList и activeFile
  // были корректны уже на первом рендере (иначе редактор монтировался без файла
  // и MonacoBinding не создавался до переключения вкладок)
  const ydocRef = useRef<Y.Doc | null>(null)
  const awarenessRef = useRef<Awareness | null>(null)

  if (!ydocRef.current) {
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc
    const yfiles = ydoc.getMap<Y.Text>('files')

    // 1. Пытаемся восстановить Y.Doc из localStorage (предыдущая сессия)
    const saved = localStorage.getItem(`praxis_ydoc_${roomId}`)
    if (saved) {
      try {
        Y.applyUpdate(ydoc, base64ToUint8(saved))
      } catch {
        console.warn('[Yjs] Не удалось восстановить состояние из localStorage')
      }
    }

    // 2. Если файлов нет — инициализируем из шаблона лабораторной
    if (yfiles.size === 0 && Object.keys(initialFiles).length > 0) {
      ydoc.transact(() => {
        for (const [path, content] of Object.entries(initialFiles)) {
          const ytext = new Y.Text()
          if (content) ytext.insert(0, content)
          yfiles.set(path, ytext)
        }
      })
    }
  }

  const ydoc = ydocRef.current!
  const yfiles = ydoc.getMap<Y.Text>('files')
  const ypresence = ydoc.getMap<any>('presence')

  if (!awarenessRef.current) {
    awarenessRef.current = new Awareness(ydoc)
  }
  const awareness = awarenessRef.current

  const connectionRef = useRef<any>(null)

  // Инициализируем из yfiles синхронно — редактор получит правильный файл сразу
  const [fileList, setFileList] = useState<string[]>(() => Array.from(yfiles.keys()).sort())
  const [activeFile, setActiveFile] = useState<string>(() => {
    const keys = Array.from(yfiles.keys()).sort()
    return keys[0] ?? ''
  })
  const [participants, setParticipants] = useState<Participant[]>([])

  // ── Presence + Awareness: вписываем себя при монтировании ───────────────────

  useEffect(() => {
    if (!currentUser) return
    ypresence.set(currentUser.id, {
      username: currentUser.username,
      color: currentUser.color,
      role: 'student' as const,
    })
    awareness.setLocalStateField('user', {
      userId: currentUser.id,
      username: currentUser.username,
      color: currentUser.color,
    })
    return () => {
      ypresence.delete(currentUser.id)
      awareness.setLocalState(null)
    }
  }, [currentUser?.id])

  // ── Реактивный список участников ─────────────────────────────────────────

  useEffect(() => {
    const sync = () => {
      const list: Participant[] = []
      ypresence.forEach((data: any, userId: string) => {
        list.push({
          userId,
          username: data.username ?? 'Аноним',
          role: data.role ?? 'student',
          color: data.color ?? '#666',
        })
      })
      setParticipants(list)
    }
    sync()
    ypresence.observe(sync)
    return () => ypresence.unobserve(sync)
  }, [])

  // ── Реактивный список файлов ──────────────────────────────────────────────

  useEffect(() => {
    const sync = () => {
      const keys = Array.from(yfiles.keys()).sort()
      setFileList(keys)
      setActiveFile(prev => (prev && yfiles.has(prev) ? prev : keys[0] ?? ''))
    }
    sync()
    yfiles.observe(sync)
    return () => yfiles.unobserve(sync)
  }, [])

  // ── Персистентность через localStorage ───────────────────────────────────

  useEffect(() => {
    const persist = () => {
      try {
        const state = Y.encodeStateAsUpdate(ydoc)
        localStorage.setItem(`praxis_ydoc_${roomId}`, uint8ToBase64(state))
      } catch { /* quota exceeded — игнорируем */ }
    }
    ydoc.on('update', persist)
    return () => ydoc.off('update', persist)
  }, [roomId])

  // ── SignalR синхронизация ─────────────────────────────────────────────────

  useEffect(() => {
    if (!isOnline) return

    const connection = new HubConnectionBuilder()
      .withUrl('/sync-hub')
      .withAutomaticReconnect()
      .withHubProtocol(new MessagePackHubProtocol())
      .configureLogging(LogLevel.Warning)
      .build()

    connectionRef.current = connection

    // Принимаем обновление от других участников
    connection.on('ReceiveDocumentUpdate', (updateAsArray: number[]) => {
      Y.applyUpdate(ydoc, new Uint8Array(updateAsArray), 'signalr')
    })

    // Когда новый участник подключается — отправляем ему полное состояние
    connection.on('UserJoined', () => {
      if (connection.state === HubConnectionState.Connected) {
        const fullState = Y.encodeStateAsUpdate(ydoc)
        connection.invoke('SendDocumentUpdate', roomId, Array.from(fullState))
          .catch(() => {})
      }
    })

    // Отправляем локальные изменения в relay
    const sendUpdate = (update: Uint8Array, origin: any) => {
      if (origin !== 'signalr' && connection.state === HubConnectionState.Connected) {
        connection.invoke('SendDocumentUpdate', roomId, Array.from(update))
          .catch(err => console.error('[SignalR] Ошибка отправки:', err))
      }
    }
    ydoc.on('update', sendUpdate)

    const start = async () => {
      try {
        await connection.start()
        await connection.invoke('JoinRoom', roomId)
        console.log('[SignalR] Совместная работа активна.')
      } catch {
        console.warn('[SignalR] Сервер недоступен — локальный режим.')
      }
    }
    start()

    return () => {
      ydoc.off('update', sendUpdate)
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.invoke('LeaveRoom', roomId).catch(() => {})
        connection.stop()
      }
      connectionRef.current = null
    }
  }, [roomId, isOnline])

  // ── Файловые операции ─────────────────────────────────────────────────────

  const addFile = useCallback((path: string, content = '') => {
    if (yfiles.has(path)) return
    ydoc.transact(() => {
      const ytext = new Y.Text()
      if (content) ytext.insert(0, content)
      yfiles.set(path, ytext)
    })
    setActiveFile(path)
  }, [])

  const deleteFile = useCallback((path: string) => {
    yfiles.delete(path)
    // setActiveFile обновится через observe → sync
  }, [])

  const renameFile = useCallback((oldPath: string, newPath: string) => {
    if (!yfiles.has(oldPath) || yfiles.has(newPath)) return
    const content = yfiles.get(oldPath)!.toString()
    ydoc.transact(() => {
      yfiles.delete(oldPath)
      const ytext = new Y.Text()
      if (content) ytext.insert(0, content)
      yfiles.set(newPath, ytext)
    })
    setActiveFile(newPath)
  }, [])

  // Возвращает снимок всех файлов для компилятора
  const getFiles = useCallback((): Record<string, string> => {
    const result: Record<string, string> = {}
    yfiles.forEach((ytext, path) => { result[path] = ytext.toString() })
    return result
  }, [])

  const setMyRole = useCallback((roleId: string) => {
    if (!currentUser) return
    const existing = ypresence.get(currentUser.id) ?? {}
    ypresence.set(currentUser.id, { ...existing, labRole: roleId })
    awareness.setLocalStateField('labRole', roleId)
  }, [currentUser?.id])

  const myRole: string | undefined = currentUser
    ? ypresence.get(currentUser.id)?.labRole
    : undefined

  return {
    ydoc,
    yfiles,
    awareness,
    fileList,
    activeFile,
    setActiveFile,
    addFile,
    deleteFile,
    renameFile,
    getFiles,
    participants,
    myRole,
    setMyRole,
  }
}
