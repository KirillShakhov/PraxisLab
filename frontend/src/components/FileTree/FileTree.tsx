import React, { useState, useRef } from 'react'
import {
  Box, Typography, IconButton, Tooltip, List, ListItemButton,
  ListItemText, ListItemIcon, TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import LockIcon from '@mui/icons-material/Lock'

const FILE_ICONS: Record<string, string> = {
  py: '🐍', js: '🟨', ts: '🔷', lua: '🌙',
  sql: '🗄️', java: '☕', json: '{}', md: '📝',
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop() ?? ''
  return FILE_ICONS[ext] ?? '📄'
}

interface Props {
  fileList: string[]
  activeFile: string
  readOnlyFiles?: string[]
  labFiles?: string[]        // файлы из шаблона лабы — нельзя удалять
  onSelect: (path: string) => void
  onAdd: (path: string) => void
  onDelete: (path: string) => void
}

export default function FileTree({
  fileList, activeFile, readOnlyFiles = [], labFiles = [],
  onSelect, onAdd, onDelete,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [nameError, setNameError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startAdding = () => {
    setAdding(true)
    setNewName('')
    setNameError('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const confirmAdd = () => {
    const name = newName.trim()
    if (!name) { setNameError('Введите имя'); return }
    if (!/^[\w\-. ]+$/.test(name)) { setNameError('Недопустимые символы'); return }
    if (fileList.includes(name)) { setNameError('Файл уже существует'); return }
    onAdd(name)
    setAdding(false)
    setNewName('')
  }

  const cancelAdd = () => {
    setAdding(false)
    setNewName('')
    setNameError('')
  }

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      height: '100%', borderRight: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.default', minWidth: 0,
    }}>
      {/* Заголовок */}
      <Box sx={{
        px: 1.5, py: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,
        bgcolor: 'background.paper',
      }}>
        <Typography variant="caption" sx={{
          color: 'text.secondary', fontWeight: 700,
          letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 10,
        }}>
          Файлы
        </Typography>
        <Tooltip title="Новый файл">
          <IconButton
            size="small"
            onClick={startAdding}
            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'rgba(79,70,229,0.08)' } }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Список файлов */}
      <List dense disablePadding sx={{ flexGrow: 1, overflow: 'auto', px: 0.5, py: 0.5 }}>
        {fileList.map(path => {
          const isActive = path === activeFile
          const isReadOnly = readOnlyFiles.includes(path)
          const isLabFile = labFiles.includes(path)
          return (
            <ListItemButton
              key={path}
              selected={isActive}
              onClick={() => onSelect(path)}
              sx={{
                px: 1.25, py: 0.5, borderRadius: '6px',
                borderLeft: isActive ? '2px solid' : '2px solid transparent',
                borderLeftColor: isActive ? 'primary.main' : 'transparent',
                '&.Mui-selected': {
                  bgcolor: 'rgba(79,70,229,0.08)',
                  '&:hover': { bgcolor: 'rgba(79,70,229,0.1)' },
                },
                '&:hover .delete-btn': { opacity: 1 },
                '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 26, fontSize: 13 }}>
                {getFileIcon(path)}
              </ListItemIcon>
              <ListItemText
                primary={path}
                primaryTypographyProps={{
                  variant: 'body2',
                  noWrap: true,
                  sx: {
                    color: isActive ? 'primary.main' : 'text.primary',
                    fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                    fontFamily: '"JetBrains Mono", monospace',
                  },
                }}
              />
              {isReadOnly ? (
                <Tooltip title="Только для чтения">
                  <LockIcon sx={{ fontSize: 13, color: 'text.disabled', flexShrink: 0 }} />
                </Tooltip>
              ) : !isLabFile ? (
                <Tooltip title="Удалить файл">
                  <IconButton
                    className="delete-btn"
                    size="small"
                    onClick={e => {
                      e.stopPropagation()
                      if (confirm(`Удалить файл "${path}"?`)) onDelete(path)
                    }}
                    sx={{
                      opacity: 0, transition: 'opacity 0.15s',
                      color: 'text.secondary', '&:hover': { color: 'error.main' },
                      p: 0.25,
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              ) : null}
            </ListItemButton>
          )
        })}

        {adding && (
          <Box sx={{ px: 1, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              inputRef={inputRef}
              size="small"
              placeholder="main.py"
              value={newName}
              onChange={e => { setNewName(e.target.value); setNameError('') }}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmAdd()
                if (e.key === 'Escape') cancelAdd()
              }}
              error={!!nameError}
              helperText={nameError}
              inputProps={{ style: { fontSize: 12, padding: '4px 8px', fontFamily: 'monospace' } }}
              sx={{ flexGrow: 1 }}
            />
            <IconButton size="small" onClick={confirmAdd} sx={{ color: 'success.main' }}>
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={cancelAdd} sx={{ color: 'text.secondary' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </List>
    </Box>
  )
}
