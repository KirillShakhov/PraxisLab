import React from 'react'
import { Box, Avatar, Tooltip, Typography } from '@mui/material'
import type { Participant } from '../../types'

interface Props {
  participants: Participant[]
  currentUserId?: string
}

export default function ParticipantList({ participants, currentUserId }: Props) {
  if (participants.length === 0) return null

  // Текущий пользователь первым
  const sorted = [...participants].sort((a, b) =>
    a.userId === currentUserId ? -1 : b.userId === currentUserId ? 1 : 0
  )

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
        {participants.length}
      </Typography>
      {sorted.slice(0, 6).map((p, i) => (
        <Tooltip
          key={p.userId}
          title={`${p.username}${p.userId === currentUserId ? ' (вы)' : ''}`}
        >
          <Avatar
            sx={{
              width: 28, height: 28,
              bgcolor: p.color,
              fontSize: 12, fontWeight: 'bold',
              border: p.userId === currentUserId ? '2px solid #fff' : '2px solid transparent',
              // Слегка перекрывают друг друга
              ml: i > 0 ? -0.75 : 0,
              zIndex: sorted.length - i,
              cursor: 'default',
              transition: 'transform 0.15s',
              '&:hover': { transform: 'translateY(-2px)', zIndex: 10 },
            }}
          >
            {p.username.charAt(0).toUpperCase()}
          </Avatar>
        </Tooltip>
      ))}
      {participants.length > 6 && (
        <Tooltip title={`Ещё ${participants.length - 6} участников`}>
          <Avatar sx={{ width: 28, height: 28, bgcolor: 'action.selected', color: 'text.secondary', fontSize: 11, ml: -0.75 }}>
            +{participants.length - 6}
          </Avatar>
        </Tooltip>
      )}
    </Box>
  )
}
