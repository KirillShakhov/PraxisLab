import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Button, Card, CardContent, CardActionArea,
  CardActions, Chip, Grid, Skeleton, Avatar, Divider, IconButton, Tooltip,
  Snackbar,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SchoolIcon from '@mui/icons-material/School'
import CodeIcon from '@mui/icons-material/Code'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import EditIcon from '@mui/icons-material/Edit'
import type { Course, User } from '../types'
import { useCourseStore, useRecentSessions } from '../hooks/useCourseStore'
import { useSyncContext } from '../contexts/SyncContext'

const LANG_LABELS: Record<string, string> = {
  python: 'Python', javascript: 'JavaScript', lua: 'Lua', sqlite: 'SQLite',
}

const LANG_COLORS: Record<string, string> = {
  python: '#3572A5', javascript: '#f59e0b', lua: '#6366f1', sqlite: '#0ea5e9',
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин. назад`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч. назад`
  return `${Math.floor(h / 24)} дн. назад`
}

interface Props {
  user: User
}

export default function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { pushCourse, deleteFromServer } = useSyncContext()
  const { myCourses, loading, saveCourse, deleteCourse, reload } = useCourseStore(user.id, pushCourse, deleteFromServer)
  const { sessions, deleteSession } = useRecentSessions()
  const [snackbar, setSnackbar] = React.useState('')
  const importRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => importRef.current?.click()

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      const raw = JSON.parse(text) as Course
      if (!raw.title || !Array.isArray(raw.labs)) throw new Error('Неверный формат')
      const course: Course = {
        ...raw,
        id: crypto.randomUUID(),
        authorId: user.id,
        authorName: user.username,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await saveCourse(course)
      setSnackbar(`Курс "${course.title}" импортирован`)
    } catch (err: any) {
      setSnackbar(`Ошибка импорта: ${err.message}`)
    }
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 4 }}>

      {/* Hero-секция */}
      <Box sx={{
        mb: 5, p: 4, borderRadius: 3,
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(79,70,229,0.25)',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Декоративный круг */}
        <Box sx={{
          position: 'absolute', right: -60, top: -60,
          width: 260, height: 260, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <Box sx={{
          position: 'absolute', right: 60, bottom: -80,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        <Box sx={{ position: 'relative' }}>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
            Привет, {user.username}!
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.5, opacity: 0.85, fontSize: 15 }}>
            Создавайте курсы, запускайте лабораторные и работайте совместно
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, position: 'relative', flexShrink: 0 }}>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
          <Tooltip title="Импортировать курс из JSON-файла">
            <Button
              variant="outlined"
              size="large"
              startIcon={<FileUploadIcon />}
              onClick={handleImportClick}
              sx={{
                color: '#fff', borderColor: 'rgba(255,255,255,0.4)',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Импорт
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => navigate('/courses/new')}
            sx={{
              bgcolor: '#fff', color: '#4f46e5', fontWeight: 700,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            }}
          >
            Новый курс
          </Button>
        </Box>
      </Box>

      {/* Мои курсы */}
      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: '8px',
          bgcolor: 'rgba(79,70,229,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SchoolIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        </Box>
        <Typography variant="h6" fontWeight={700} color="text.primary">
          Мои курсы
        </Typography>
        {!loading && myCourses.length > 0 && (
          <Chip
            label={myCourses.length}
            size="small"
            sx={{ bgcolor: 'rgba(79,70,229,0.1)', color: 'primary.main', fontWeight: 600, height: 20, fontSize: 11 }}
          />
        )}
      </Box>

      {loading ? (
        <Grid container spacing={2.5} sx={{ mb: 5 }}>
          {[1, 2, 3].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : myCourses.length === 0 ? (
        <Card sx={{ mb: 5, border: '2px dashed', borderColor: 'divider', boxShadow: 'none', bgcolor: 'transparent' }}>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '16px', bgcolor: 'rgba(79,70,229,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2,
            }}>
              <SchoolIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            </Box>
            <Typography color="text.secondary" sx={{ mb: 3 }}>У вас ещё нет курсов</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<FileUploadIcon />} onClick={handleImportClick}>
                Импортировать курс
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/courses/new')}>
                Создать курс
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2.5} sx={{ mb: 5 }}>
          {myCourses.map(course => (
            <Grid item xs={12} sm={6} md={4} key={course.id}>
              <Card sx={{
                height: '100%', display: 'flex', flexDirection: 'column',
                transition: 'box-shadow 0.2s, transform 0.15s',
                '&:hover': {
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  transform: 'translateY(-2px)',
                },
              }}>
                <CardActionArea sx={{ flexGrow: 1 }} onClick={() => navigate(`/courses/${course.id}`)}>
                  <CardContent sx={{ p: 3 }}>
                    {/* Иконка курса */}
                    <Box sx={{
                      width: 44, height: 44, borderRadius: '12px', mb: 2,
                      background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.1) 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <SchoolIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} noWrap sx={{ mb: 0.75 }}>
                      {course.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{
                      mb: 2,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      lineHeight: 1.6,
                    }}>
                      {course.description || 'Без описания'}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${course.labs.length} лаб.`}
                      sx={{ bgcolor: 'rgba(79,70,229,0.08)', color: 'primary.main', fontWeight: 600, fontSize: 11 }}
                    />
                  </CardContent>
                </CardActionArea>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Tooltip title="Редактировать">
                    <Button
                      size="small"
                      startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                      onClick={() => navigate(`/courses/${course.id}/edit`)}
                      sx={{ color: 'text.secondary', fontSize: 12 }}
                    >
                      Изменить
                    </Button>
                  </Tooltip>
                  <Tooltip title="Удалить курс">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (confirm(`Удалить курс "${course.title}"?`)) deleteCourse(course.id)
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Divider sx={{ my: 4, borderColor: 'divider' }} />

      {/* Недавние сессии */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: '8px',
          bgcolor: 'rgba(79,70,229,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AccessTimeIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        </Box>
        <Typography variant="h6" fontWeight={700} color="text.primary">
          Недавние сессии
        </Typography>
        {sessions.length > 0 && (
          <Chip
            label={sessions.length}
            size="small"
            sx={{ bgcolor: 'rgba(79,70,229,0.1)', color: 'primary.main', fontWeight: 600, height: 20, fontSize: 11 }}
          />
        )}
      </Box>

      {sessions.length === 0 ? (
        <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>
          Нет недавних сессий — откройте лабораторную из курса, чтобы начать
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {sessions.map(session => (
            <Card key={session.id} sx={{
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
            }}>
              <CardActionArea onClick={() => navigate(`/session/${session.id}`)}>
                <CardContent sx={{ py: 1.75, px: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{
                    bgcolor: 'rgba(79,70,229,0.1)', width: 40, height: 40, borderRadius: '10px',
                  }}>
                    <CodeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography fontWeight={600} noWrap color="text.primary">{session.labTitle}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {session.courseTitle}
                      {session.language && (
                        <Chip
                          label={LANG_LABELS[session.language] ?? session.language}
                          size="small"
                          sx={{
                            ml: 1, height: 16, fontSize: 10, fontWeight: 600,
                            bgcolor: `${LANG_COLORS[session.language] ?? '#64748b'}18`,
                            color: LANG_COLORS[session.language] ?? '#64748b',
                          }}
                        />
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      {timeAgo(session.lastActive)}
                    </Typography>
                    <Tooltip title="Удалить из истории">
                      <IconButton
                        size="small"
                        onClick={e => { e.stopPropagation(); deleteSession(session.id) }}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
