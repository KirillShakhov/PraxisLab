import React, { useState } from 'react'
import {
  Dialog, DialogContent, DialogActions,
  TextField, Button, Typography, Box, Avatar,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'

interface Props {
  open: boolean
  onConfirm: (username: string) => void
}

export default function ProfileSetupDialog({ open, onConfirm }: Props) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const trimmed = username.trim()
    if (trimmed.length < 2) {
      setError('Имя должно быть не короче 2 символов')
      return
    }
    if (trimmed.length > 32) {
      setError('Имя должно быть не длиннее 32 символов')
      return
    }
    onConfirm(trimmed)
  }

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* Gradient header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        py: 4, px: 3, textAlign: 'center',
      }}>
        <Avatar sx={{
          bgcolor: 'rgba(255,255,255,0.2)', width: 60, height: 60, mx: 'auto', mb: 2,
          backdropFilter: 'blur(10px)',
        }}>
          <PersonIcon fontSize="large" sx={{ color: '#fff' }} />
        </Avatar>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 0.5 }}>
          Добро пожаловать в В-Лабу
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
          Введите имя, которое будут видеть другие участники
        </Typography>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 1 }}>
        <TextField
          autoFocus
          fullWidth
          label="Ваше имя"
          placeholder="Например: Иван или dev_23"
          value={username}
          onChange={e => { setUsername(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          error={!!error}
          helperText={error}
          inputProps={{ maxLength: 32 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1.5 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={username.trim().length < 2}
          sx={{ py: 1.25, fontSize: 15, fontWeight: 700, borderRadius: '10px' }}
        >
          Начать работу
        </Button>
      </DialogActions>
    </Dialog>
  )
}
