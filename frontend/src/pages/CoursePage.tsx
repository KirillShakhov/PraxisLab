import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Typography, Button, Card, CardContent, CardActionArea,
  Chip, Skeleton, IconButton, Tooltip, Breadcrumbs, Link, Avatar,
  LinearProgress,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SchoolIcon from '@mui/icons-material/School'
import CheckIcon from '@mui/icons-material/Check'
import type { Course, User } from '../types'
import { courseDB, sessionDB } from '../db'
import { useRecentSessions } from '../hooks/useCourseStore'
import { getCompletedLabs } from '../utils/progress'

const LANG_LABELS: Record<string, string> = {
  python: 'Python', javascript: 'JavaScript',
  lua: 'Lua', sqlite: 'SQLite',
}
const LANG_COLORS: Record<string, string> = {
  python: '#3572A5', javascript: '#f59e0b',
  lua: '#6366f1', sqlite: '#0ea5e9',
}

interface Props {
  user: User
}

export default function CoursePage({ user }: Props) {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { createSession } = useRecentSessions()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingLab, setStartingLab] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    courseDB.get(courseId).then(c => {
      setCourse(c ?? null)
      setLoading(false)
    })
  }, [courseId])

  const completedLabs = useMemo(() =>
    course ? getCompletedLabs(course.id) : new Set<string>(),
    [course],
  )

  const handleStartLab = async (labId: string) => {
    if (!course) return
    const lab = course.labs.find(l => l.id === labId)
    if (!lab) return

    setStartingLab(labId)
    try {
      // Ищем существующую сессию для этой лабы (самую свежую)
      const all = await sessionDB.getAll()
      const existing = all
        .filter(s => s.labId === labId && s.courseId === course.id)
        .sort((a, b) => b.lastActive - a.lastActive)[0]

      if (existing) {
        navigate(`/session/${existing.id}`)
        return
      }

      const sessionId = await createSession(
        lab.id, course.id, lab.title, course.title, lab.language,
      )
      navigate(`/session/${sessionId}`)
    } finally {
      setStartingLab(null)
    }
  }

  if (loading) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, py: 4 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3, mt: 2 }} />
      </Box>
    )
  }

  if (!course) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Курс не найден</Typography>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>На главную</Button>
      </Box>
    )
  }

  const isOwner = course.authorId === user.id
  const sortedLabs = course.labs.slice().sort((a, b) => a.order - b.order)
  const totalLabs = sortedLabs.length
  const completedCount = completedLabs.size
  const progressPct = totalLabs > 0 ? (completedCount / totalLabs) * 100 : 0

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, py: 4 }}>

      {/* Навигация */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          underline="hover"
          color="inherit"
          onClick={() => navigate('/')}
          sx={{ cursor: 'pointer', color: 'text.secondary', fontSize: 14 }}
        >
          Главная
        </Link>
        <Typography color="text.primary" sx={{ fontSize: 14, fontWeight: 500 }}>
          {course.title}
        </Typography>
      </Breadcrumbs>

      {/* Шапка курса */}
      <Card sx={{ mb: 4, overflow: 'visible' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start', flexGrow: 1, minWidth: 0 }}>
              <Box sx={{
                width: 56, height: 56, borderRadius: '14px', flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.1) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <SchoolIcon sx={{ fontSize: 28, color: 'primary.main' }} />
              </Box>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <IconButton size="small" onClick={() => navigate('/')} sx={{ color: 'text.secondary', mr: -0.5 }}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h5" fontWeight={700}>{course.title}</Typography>
                </Box>
                <Typography color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                  {course.description || 'Без описания'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip
                    size="small"
                    label={`Автор: ${course.authorName}`}
                    sx={{ bgcolor: 'rgba(79,70,229,0.07)', color: 'primary.main', fontWeight: 500 }}
                  />
                  <Chip
                    size="small"
                    label={`${totalLabs} лаб.`}
                    sx={{ bgcolor: 'rgba(79,70,229,0.07)', color: 'primary.main', fontWeight: 500 }}
                  />
                  {completedCount > 0 && (
                    <Chip
                      size="small"
                      icon={<CheckIcon sx={{ fontSize: '12px !important' }} />}
                      label={completedCount === totalLabs ? 'Курс завершён' : `${completedCount} из ${totalLabs} выполнено`}
                      sx={{
                        bgcolor: completedCount === totalLabs ? 'rgba(5,150,105,0.12)' : 'rgba(5,150,105,0.07)',
                        color: 'success.main',
                        fontWeight: 600,
                        border: '1px solid rgba(5,150,105,0.2)',
                      }}
                    />
                  )}
                </Box>

                {/* Прогресс */}
                {totalLabs > 0 && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Прогресс курса
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {completedCount}/{totalLabs}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={progressPct}
                      sx={{
                        height: 6, borderRadius: 3,
                        bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          bgcolor: completedCount === totalLabs ? 'success.main' : 'primary.main',
                        },
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Box>
            {isOwner && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/courses/${course.id}/edit`)}
                sx={{ flexShrink: 0 }}
              >
                Редактировать
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Список лабораторных */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Лабораторные работы
      </Typography>

      {sortedLabs.length === 0 ? (
        <Card sx={{ border: '2px dashed', borderColor: 'divider', boxShadow: 'none', bgcolor: 'transparent' }}>
          <CardContent sx={{ py: 5, textAlign: 'center' }}>
            <Typography color="text.secondary">В этом курсе пока нет лабораторных</Typography>
            {isOwner && (
              <Button sx={{ mt: 2 }} onClick={() => navigate(`/courses/${course.id}/edit`)}>
                Добавить лабораторную
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {sortedLabs.map((lab, idx) => {
            const isDone = completedLabs.has(lab.id)
            return (
              <Card key={lab.id} sx={{
                transition: 'box-shadow 0.2s, transform 0.15s',
                border: isDone ? '1px solid rgba(5,150,105,0.25)' : undefined,
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
                  transform: 'translateY(-1px)',
                },
              }}>
                <CardActionArea onClick={() => handleStartLab(lab.id)}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 2 }}>

                    {/* Номер / галочка */}
                    <Avatar sx={{
                      width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                      bgcolor: isDone ? 'rgba(5,150,105,0.12)' : 'rgba(79,70,229,0.08)',
                      color: isDone ? 'success.main' : 'primary.main',
                      fontWeight: 700, fontSize: 14,
                    }}>
                      {isDone ? <CheckIcon fontSize="small" /> : idx + 1}
                    </Avatar>

                    {/* Инфо */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography fontWeight={600} noWrap color="text.primary">{lab.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{
                        display: '-webkit-box', WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        mt: 0.25,
                      }}>
                        {lab.description || 'Без описания'}
                      </Typography>
                    </Box>

                    {/* Метки */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                      <Chip
                        size="small"
                        label={LANG_LABELS[lab.language] ?? lab.language}
                        sx={{
                          bgcolor: `${LANG_COLORS[lab.language] ?? '#64748b'}15`,
                          color: LANG_COLORS[lab.language] ?? '#64748b',
                          border: `1px solid ${LANG_COLORS[lab.language] ?? '#64748b'}30`,
                          fontWeight: 600,
                        }}
                      />
                      {lab.testCases.length > 0 && (
                        <Chip
                          size="small"
                          label={`${lab.testCases.length} тестов`}
                          sx={{ bgcolor: 'rgba(5,150,105,0.08)', color: 'success.main', fontWeight: 500 }}
                        />
                      )}
                    </Box>

                    {/* Кнопка */}
                    <Tooltip title={isDone ? 'Повторить' : 'Открыть лабораторную'}>
                      <IconButton
                        size="small"
                        color={isDone ? 'success' : 'primary'}
                        disabled={startingLab === lab.id}
                        onClick={e => { e.stopPropagation(); handleStartLab(lab.id) }}
                        sx={{
                          bgcolor: isDone ? 'rgba(5,150,105,0.08)' : 'rgba(79,70,229,0.08)',
                          '&:hover': {
                            bgcolor: isDone ? 'rgba(5,150,105,0.15)' : 'rgba(79,70,229,0.15)',
                          },
                          flexShrink: 0,
                        }}
                      >
                        <PlayArrowIcon />
                      </IconButton>
                    </Tooltip>
                  </CardContent>
                </CardActionArea>
              </Card>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
