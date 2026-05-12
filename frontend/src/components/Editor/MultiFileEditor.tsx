import React, { useRef, useEffect, useCallback, useState } from 'react'
import Editor from '@monaco-editor/react'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { MonacoBinding } from 'y-monaco'
import { Box, IconButton, useTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

function monacoLang(filePath: string): string {
  const ext = filePath.split('.').pop() ?? ''
  const map: Record<string, string> = {
    py: 'python', js: 'javascript', ts: 'typescript',
    lua: 'lua', sql: 'sql', java: 'java',
    json: 'json', md: 'markdown', html: 'html', css: 'css',
  }
  return map[ext] ?? 'plaintext'
}

interface Props {
  yfiles: Y.Map<Y.Text>
  activeFile: string
  openFiles: string[]
  onCloseTab: (path: string) => void
  onSwitchTab: (path: string) => void
  awareness?: Awareness
  readOnlyFiles?: string[]
}

const FILE_ICONS: Record<string, string> = {
  py: '🐍', js: '🟨', ts: '🔷', lua: '🌙',
  sql: '🗄️', java: '☕', json: '{}', md: '📝',
}
function getTabIcon(path: string) {
  const ext = path.split('.').pop() ?? ''
  return FILE_ICONS[ext] ?? '📄'
}

export default function MultiFileEditor({
  yfiles, activeFile, openFiles, onCloseTab, onSwitchTab, awareness, readOnlyFiles = [],
}: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const tabBarBg = isDark ? '#252526' : '#f1f5f9'
  const tabBarBorder = isDark ? '#1e1e1e' : theme.palette.divider
  const tabActiveBg = isDark ? '#1e1e1e' : '#ffffff'
  const tabHoverBg = isDark ? '#2a2d2e' : '#e8ecf0'
  const tabTextActive = isDark ? '#e2e8f0' : '#1e293b'
  const tabTextInactive = isDark ? '#8b9baf' : '#64748b'
  const editorBg = isDark ? '#1e1e1e' : '#ffffff'
  const monacoTheme = isDark ? 'vs-dark' : 'vs'

  const [filesVersion, setFilesVersion] = useState(0)
  const resolvedActiveFile = activeFile || openFiles[0] || ''
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const modelsRef = useRef<Map<string, any>>(new Map())
  const activeBindingRef = useRef<MonacoBinding | null>(null)
  const activeBindingPathRef = useRef<string>('')

  const disposeActiveBinding = useCallback(() => {
    if (activeBindingRef.current) {
      activeBindingRef.current.destroy()
      activeBindingRef.current = null
      activeBindingPathRef.current = ''
    }
  }, [])

  useEffect(() => {
    const bumpVersion = () => setFilesVersion(v => v + 1)
    yfiles.observe(bumpVersion)
    return () => yfiles.unobserve(bumpVersion)
  }, [yfiles])

  const openInEditor = useCallback((editor: any, monacoInstance: any, filePath: string) => {
    if (!filePath || !monacoInstance) return
    const ytext = yfiles.get(filePath)
    if (!ytext) return

    const lang = monacoLang(filePath)
    const ytextValue = ytext.toString()

    if (!modelsRef.current.has(filePath)) {
      const uri = monacoInstance.Uri.parse(`file:///${filePath}`)
      const existing = monacoInstance.editor.getModel(uri)
      const model = existing ?? monacoInstance.editor.createModel(ytextValue, lang, uri)
      if (existing && existing.getLanguageId() !== lang) {
        monacoInstance.editor.setModelLanguage(existing, lang)
      }
      if (existing && existing.getValue() !== ytextValue) {
        existing.setValue(ytextValue)
      }
      modelsRef.current.set(filePath, model)
    }

    const model = modelsRef.current.get(filePath)!
    if (model.getLanguageId() !== lang) {
      monacoInstance.editor.setModelLanguage(model, lang)
    }

    editor.setModel(model)
    editor.updateOptions({ readOnly: readOnlyFiles.includes(filePath) })

    if (activeBindingPathRef.current === filePath && activeBindingRef.current) {
      return
    }

    disposeActiveBinding()
    activeBindingRef.current = new MonacoBinding(ytext, model, new Set([editor]), awareness)
    activeBindingPathRef.current = filePath
  }, [yfiles, disposeActiveBinding, awareness, readOnlyFiles])

  useEffect(() => {
    if (editorRef.current && monacoRef.current && resolvedActiveFile) {
      openInEditor(editorRef.current, monacoRef.current, resolvedActiveFile)
      const rafId = window.requestAnimationFrame(() => {
        if (editorRef.current && monacoRef.current) {
          openInEditor(editorRef.current, monacoRef.current, resolvedActiveFile)
          editorRef.current.layout?.()
        }
      })
      return () => window.cancelAnimationFrame(rafId)
    }
  }, [resolvedActiveFile, filesVersion, openInEditor])

  useEffect(() => {
    if (!activeFile && openFiles.length > 0) {
      onSwitchTab(openFiles[0])
    }
  }, [activeFile, openFiles, onSwitchTab])

  useEffect(() => {
    const currentPaths = new Set(Array.from(yfiles.keys()))
    modelsRef.current.forEach((model, path) => {
      if (!currentPaths.has(path)) {
        if (activeBindingPathRef.current === path) {
          disposeActiveBinding()
        }
        model.dispose()
        modelsRef.current.delete(path)
      }
    })
  }, [filesVersion, yfiles, disposeActiveBinding])

  const handleMount = (editor: any, monacoInstance: any) => {
    editorRef.current = editor
    monacoRef.current = monacoInstance
    if (resolvedActiveFile) openInEditor(editor, monacoInstance, resolvedActiveFile)
  }

  useEffect(() => {
    return () => {
      disposeActiveBinding()
      modelsRef.current.forEach(m => m.dispose())
      modelsRef.current.clear()
    }
  }, [disposeActiveBinding])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: editorBg }}>
      {/* Вкладки */}
      <Box sx={{
        borderBottom: `1px solid ${tabBarBorder}`,
        bgcolor: tabBarBg,
        display: 'flex', alignItems: 'center', minHeight: 36, overflowX: 'auto',
        flexShrink: 0,
      }}>
        {openFiles.map(path => {
          const isActive = path === resolvedActiveFile
          return (
            <Box
              key={path}
              onClick={() => onSwitchTab(path)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                px: 1.5, py: 0.5, cursor: 'pointer', flexShrink: 0,
                borderRight: `1px solid ${tabBarBorder}`,
                bgcolor: isActive ? tabActiveBg : 'transparent',
                borderBottom: isActive ? '2px solid #818cf8' : '2px solid transparent',
                '&:hover .tab-close': { opacity: 1 },
                '&:hover': { bgcolor: isActive ? tabActiveBg : tabHoverBg },
              }}
            >
              <span style={{ fontSize: 12 }}>{getTabIcon(path)}</span>
              <span style={{
                fontSize: 12.5,
                color: isActive ? tabTextActive : tabTextInactive,
                maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: isActive ? 500 : 400,
              }}>
                {path}
              </span>
              {openFiles.length > 1 && (
                <IconButton
                  className="tab-close"
                  size="small"
                  onClick={e => { e.stopPropagation(); onCloseTab(path) }}
                  sx={{
                    opacity: 0, transition: 'opacity 0.15s',
                    p: 0.1,
                    color: isDark ? '#666' : '#94a3b8',
                    '&:hover': { color: isDark ? '#ccc' : '#1e293b' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              )}
            </Box>
          )
        })}
      </Box>

      {/* Monaco Editor */}
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <Editor
          path={resolvedActiveFile || 'untitled://empty'}
          language={resolvedActiveFile ? monacoLang(resolvedActiveFile) : 'plaintext'}
          defaultValue={resolvedActiveFile ? (yfiles.get(resolvedActiveFile)?.toString() ?? '') : ''}
          height="100%"
          theme={monacoTheme}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 22,
            padding: { top: 12 },
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontLigatures: true,
          }}
        />
      </Box>
    </Box>
  )
}
