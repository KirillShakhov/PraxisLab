import React from 'react'
import {
  Dialog, DialogTitle, DialogContent, Box,
  Typography, Button, Chip, Divider,
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import type { LabRole, Participant } from '../../types'

interface Props {
  open: boolean
  roles: LabRole[]
  participants: Participant[]
  onSelect: (roleId: string) => void
}

const ROLE_COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626']

export default function RolePickerDialog({ open, roles, participants, onSelect }: Props) {
  const takenRoles = new Set(
    participants.map(p => (p as any).labRole).filter(Boolean)
  )

  return (
    <Dialog open={open} maxWidth="sm" fullWidth disableEscapeKeyDown
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PeopleIcon sx={{ color: 'primary.main' }} />
        <Box>
          <Typography variant="h6" fontWeight={700}>Совместная лаборатория</Typography>
          <Typography variant="caption" color="text.secondary">
            Выберите роль для участия — каждый работает со своими файлами
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {roles.map((role, idx) => {
          const taken = takenRoles.has(role.id)
          const color = ROLE_COLORS[idx % ROLE_COLORS.length]
          return (
            <Box
              key={role.id}
              sx={{
                p: 2, borderRadius: 2,
                border: `1.5px solid ${taken ? 'divider' : color}`,
                bgcolor: taken ? 'action.disabledBackground' : `${color}0a`,
                opacity: taken ? 0.6 : 1,
                display: 'flex', flexDirection: 'column', gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: taken ? 'text.disabled' : color, flex: 1 }}>
                  {role.label}
                </Typography>
                {taken && <Chip label="Занято" size="small" color="default" />}
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {role.description}
              </Typography>

              <Divider />

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Файлы:</Typography>
                {role.ownedFiles.map(f => (
                  <Chip key={f} label={f} size="small" variant="outlined"
                    sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                ))}
              </Box>

              <Button
                variant="contained"
                disabled={taken}
                onClick={() => onSelect(role.id)}
                sx={{
                  mt: 0.5, bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' },
                  alignSelf: 'flex-start',
                }}
              >
                Занять роль
              </Button>
            </Box>
          )
        })}
      </DialogContent>
    </Dialog>
  )
}
