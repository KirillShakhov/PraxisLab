import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Typography, TextField, Button, Card, CardContent,
  IconButton, Tooltip, FormControlLabel, Switch, Select,
  MenuItem, FormControl, InputLabel, Accordion, AccordionSummary,
  AccordionDetails, Chip, Divider, Breadcrumbs, Link, Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import SaveIcon from '@mui/icons-material/Save'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import type { Course, Lab, TestCase, FileTemplate, User } from '../types'
import { courseDB } from '../db'

const COMPILERS = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'lua', label: 'Lua' },
  { id: 'sqlite', label: 'SQLite' },
]

const LANG_EXTENSIONS: Record<string, string> = {
  python: 'py', javascript: 'js', lua: 'lua', sqlite: 'sql',
}

const DEFAULT_TEMPLATES: Record<string, string> = {
  python: 'def solution():\n    pass\n\nsolution()\n',
  javascript: 'function solution() {\n  // ваш код\n}\n\nsolution();\n',
  lua: 'local function solution()\n  -- ваш код\nend\n\nsolution()\n',
  sqlite: '-- Создайте таблицу и выполните запросы\nSELECT 1;\n',
}

function newLab(order: number, language = 'python'): Lab {
  const ext = LANG_EXTENSIONS[language] ?? 'txt'
  return {
    id: crypto.randomUUID(),
    title: `Лабораторная ${order + 1}`,
    description: '',
    language,
    files: [{ path: `main.${ext}`, content: DEFAULT_TEMPLATES[language] ?? '', readOnly: false }],
    testCases: [],
    order,
  }
}

function newTestCase(): TestCase {
  return { id: crypto.randomUUID(), description: '', input: '', expectedOutput: '', isHidden: false }
}

interface Props {
  user: User
}

export default function CourseEditorPage({ user }: Props) {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const isEdit = !!courseId

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [labs, setLabs] = useState<Lab[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedLab, setExpandedLab] = useState<string | false>(false)

  useEffect(() => {
    if (!courseId) return
    courseDB.get(courseId).then(c => {
      if (!c) return
      setTitle(c.title)
      setDescription(c.description)
      setIsPublic(c.isPublic)
      setLabs(c.labs)
    })
  }, [courseId])

  const handleExport = () => {
    const course: Course = {
      id: courseId ?? 'exported',
      title: title.trim(),
      description: description.trim(),
      authorId: user.id,
      authorName: user.username,
      labs,
      isPublic,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const blob = new Blob([JSON.stringify(course, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(title || 'course').replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('Введите название курса'); return }
    if (labs.some(l => !l.title.trim())) { setError('У всех лабораторных должны быть названия'); return }

    setSaving(true)
    setError('')
    try {
      const course: Course = {
        id: courseId ?? crypto.randomUUID(),
        title: title.trim(),
        description: description.trim(),
        authorId: user.id,
        authorName: user.username,
        labs,
        isPublic,
        createdAt: isEdit ? Date.now() : Date.now(),
        updatedAt: Date.now(),
      }
      await courseDB.save(course)
      navigate(`/courses/${course.id}`)
    } catch (e) {
      setError('Ошибка сохранения. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  const addLab = () => {
    const lab = newLab(labs.length)
    setLabs(prev => [...prev, lab])
    setExpandedLab(lab.id)
  }

  const removeLab = (id: string) => {
    setLabs(prev => prev.filter(l => l.id !== id).map((l, i) => ({ ...l, order: i })))
  }

  const updateLab = (id: string, patch: Partial<Lab>) => {
    setLabs(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  const changeLang = (labId: string, lang: string) => {
    const ext = LANG_EXTENSIONS[lang] ?? 'txt'
    updateLab(labId, {
      language: lang,
      files: [{ path: `main.${ext}`, content: DEFAULT_TEMPLATES[lang] ?? '', readOnly: false }],
    })
  }

  const updateFileContent = (labId: string, fileIdx: number, content: string) => {
    setLabs(prev => prev.map(l => {
      if (l.id !== labId) return l
      const files = [...l.files]
      files[fileIdx] = { ...files[fileIdx], content }
      return { ...l, files }
    }))
  }

  const addFileToLab = (labId: string) => {
    setLabs(prev => prev.map(l => {
      if (l.id !== labId) return l
      const ext = LANG_EXTENSIONS[l.language] ?? 'txt'
      const existing = l.files.map(f => f.path)
      let name = `file_${l.files.length}.${ext}`
      let counter = l.files.length
      while (existing.includes(name)) { counter++; name = `file_${counter}.${ext}` }
      return { ...l, files: [...l.files, { path: name, content: '', readOnly: false }] }
    }))
  }

  const removeFileFromLab = (labId: string, fileIdx: number) => {
    setLabs(prev => prev.map(l => {
      if (l.id !== labId || l.files.length <= 1) return l
      const files = l.files.filter((_, i) => i !== fileIdx)
      return { ...l, files }
    }))
  }

  const updateFilePath = (labId: string, fileIdx: number, path: string) => {
    setLabs(prev => prev.map(l => {
      if (l.id !== labId) return l
      const files = [...l.files]
      files[fileIdx] = { ...files[fileIdx], path }
      return { ...l, files }
    }))
  }

  const toggleFileReadOnly = (labId: string, fileIdx: number) => {
    setLabs(prev => prev.map(l => {
      if (l.id !== labId) return l
      const files = [...l.files]
      files[fileIdx] = { ...files[fileIdx], readOnly: !files[fileIdx].readOnly }
      return { ...l, files }
    }))
  }

  const addTestCase = (labId: string) => {
    setLabs(prev => prev.map(l =>
      l.id === labId ? { ...l, testCases: [...l.testCases, newTestCase()] } : l
    ))
  }

  const updateTestCase = (labId: string, tcId: string, patch: Partial<TestCase>) => {
    setLabs(prev => prev.map(l => {
      if (l.id !== labId) return l
      return { ...l, testCases: l.testCases.map(tc => tc.id === tcId ? { ...tc, ...patch } : tc) }
    }))
  }

  const removeTestCase = (labId: string, tcId: string) => {
    setLabs(prev => prev.map(l =>
      l.id === labId ? { ...l, testCases: l.testCases.filter(tc => tc.id !== tcId) } : l
    ))
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, py: 4 }}>

      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component="button" underline="hover" color="inherit" onClick={() => navigate('/')} sx={{ cursor: 'pointer', color: 'text.secondary', fontSize: 14 }}>
          Главная
        </Link>
        <Typography color="text.primary" sx={{ fontSize: 14, fontWeight: 500 }}>
          {isEdit ? 'Редактирование' : 'Новый курс'}
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          {isEdit ? 'Редактировать курс' : 'Создать курс'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {isEdit && (
            <Tooltip title="Скачать курс как JSON для импорта на другом устройстве">
              <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport}>
                Экспорт JSON
              </Button>
            </Tooltip>
          )}
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Основная информация */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
          <TextField
            label="Название курса"
            fullWidth
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Например: Основы Python или Алгоритмы и структуры данных"
          />
          <TextField
            label="Описание"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Кратко опишите курс: для кого он, что изучается"
          />
          <FormControlLabel
            control={<Switch checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />}
            label="Публичный курс (виден всем)"
          />
        </CardContent>
      </Card>

      {/* Лабораторные */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            Лабораторные работы
          </Typography>
          {labs.length > 0 && (
            <Chip
              label={labs.length} size="small"
              sx={{ bgcolor: 'rgba(79,70,229,0.1)', color: 'primary.main', fontWeight: 600, height: 20, fontSize: 11 }}
            />
          )}
        </Box>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addLab} size="small">
          Добавить лабораторную
        </Button>
      </Box>

      {labs.length === 0 && (
        <Card sx={{ mb: 2, border: '2px dashed', borderColor: 'divider', boxShadow: 'none', bgcolor: 'transparent' }}>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Добавьте хотя бы одну лабораторную работу
            </Typography>
          </CardContent>
        </Card>
      )}

      {labs.map((lab, idx) => (
        <Accordion
          key={lab.id}
          expanded={expandedLab === lab.id}
          onChange={(_, expanded) => setExpandedLab(expanded ? lab.id : false)}
          sx={{
            mb: 1.5, borderRadius: '12px !important', border: '1px solid',
            borderColor: 'divider', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            '&:before': { display: 'none' },
            '&.Mui-expanded': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ borderRadius: '12px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', mr: 1 }}>
              <DragIndicatorIcon sx={{ color: 'text.disabled', flexShrink: 0 }} />
              <Typography fontWeight={600} sx={{ flexGrow: 1, color: 'text.primary' }} noWrap>
                {idx + 1}. {lab.title || 'Без названия'}
              </Typography>
              <Chip size="small" label={COMPILERS.find(c => c.id === lab.language)?.label ?? lab.language}
                sx={{ bgcolor: 'rgba(79,70,229,0.08)', color: 'primary.main', fontWeight: 500 }}
              />
              <Chip size="small" label={`${lab.testCases.length} тестов`}
                sx={{ bgcolor: 'rgba(5,150,105,0.08)', color: 'success.main', fontWeight: 500 }}
              />
              <Tooltip title="Удалить лабораторную">
                <IconButton
                  size="small"
                  color="error"
                  onClick={e => { e.stopPropagation(); removeLab(lab.id) }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </AccordionSummary>

          <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Название"
                required
                fullWidth
                value={lab.title}
                onChange={e => updateLab(lab.id, { title: e.target.value })}
              />
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Язык</InputLabel>
                <Select value={lab.language} label="Язык" onChange={e => changeLang(lab.id, e.target.value)}>
                  {COMPILERS.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Описание задания"
              fullWidth
              multiline
              rows={4}
              value={lab.description}
              onChange={e => updateLab(lab.id, { description: e.target.value })}
              placeholder="Опишите задание для студентов. Поддерживается Markdown."
            />

            {/* Файлы */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="body1" fontWeight={600}>Файлы</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => addFileToLab(lab.id)}>
                  Добавить файл
                </Button>
              </Box>

              {lab.files.map((file, fileIdx) => (
                <Card key={fileIdx} sx={{ mb: 1.5, bgcolor: 'rgba(0,0,0,0.02)', boxShadow: 'none', border: '1px solid', borderColor: file.readOnly ? 'rgba(217,119,6,0.3)' : 'divider' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        size="small"
                        value={file.path}
                        onChange={e => updateFilePath(lab.id, fileIdx, e.target.value)}
                        inputProps={{ style: { fontFamily: '"JetBrains Mono", monospace', fontSize: 13 } }}
                        sx={{ flexGrow: 1 }}
                      />
                      <Tooltip title={file.readOnly ? 'Только чтение (студент не редактирует)' : 'Редактируемый файл'}>
                        <IconButton
                          size="small"
                          onClick={() => toggleFileReadOnly(lab.id, fileIdx)}
                          sx={{ color: file.readOnly ? 'warning.main' : 'text.secondary' }}
                        >
                          {file.readOnly ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      {lab.files.length > 1 && (
                        <Tooltip title="Удалить файл">
                          <IconButton size="small" color="error" onClick={() => removeFileFromLab(lab.id, fileIdx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    <TextField
                      fullWidth
                      multiline
                      rows={file.readOnly ? 6 : 8}
                      value={file.content}
                      onChange={e => updateFileContent(lab.id, fileIdx, e.target.value)}
                      placeholder={file.readOnly ? 'Код-заготовка (студент видит, но не редактирует)' : 'Начальный код для студента'}
                      inputProps={{ style: { fontFamily: '"JetBrains Mono", monospace', fontSize: 13, lineHeight: 1.6 } }}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Divider />

            {/* Тест-кейсы */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="body1" fontWeight={600}>Тест-кейсы</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => addTestCase(lab.id)}>
                  Добавить тест
                </Button>
              </Box>

              {lab.testCases.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Нет тестов — студенты смогут запускать код свободно без автопроверки
                </Typography>
              )}

              {lab.testCases.map((tc, tcIdx) => (
                <Card key={tc.id} sx={{ mb: 1.5, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, fontWeight: 500 }}>
                        Тест #{tcIdx + 1}
                      </Typography>
                      <Tooltip title={tc.isHidden ? 'Скрытый тест' : 'Открытый тест'}>
                        <IconButton
                          size="small"
                          onClick={() => updateTestCase(lab.id, tc.id, { isHidden: !tc.isHidden })}
                          sx={{ color: tc.isHidden ? 'warning.main' : 'text.secondary' }}
                        >
                          {tc.isHidden ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить тест">
                        <IconButton size="small" color="error" onClick={() => removeTestCase(lab.id, tc.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <TextField
                      label="Описание теста"
                      fullWidth
                      size="small"
                      value={tc.description}
                      onChange={e => updateTestCase(lab.id, tc.id, { description: e.target.value })}
                      placeholder="Например: проверка на пустой ввод"
                    />
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <TextField
                        label="Входные данные (stdin)"
                        fullWidth
                        multiline
                        rows={3}
                        size="small"
                        value={tc.input}
                        onChange={e => updateTestCase(lab.id, tc.id, { input: e.target.value })}
                        placeholder="Пусто, если программа не читает stdin"
                        inputProps={{ style: { fontFamily: '"JetBrains Mono", monospace', fontSize: 12 } }}
                      />
                      <TextField
                        label="Ожидаемый вывод (stdout)"
                        fullWidth
                        multiline
                        rows={3}
                        size="small"
                        value={tc.expectedOutput}
                        onChange={e => updateTestCase(lab.id, tc.id, { expectedOutput: e.target.value })}
                        placeholder="Точный вывод программы"
                        inputProps={{ style: { fontFamily: '"JetBrains Mono", monospace', fontSize: 12 } }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" size="large" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить курс'}
        </Button>
      </Box>
    </Box>
  )
}
