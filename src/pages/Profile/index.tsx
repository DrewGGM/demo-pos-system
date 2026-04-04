import React, { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Avatar, Grid, Divider,
  Card, CardContent, Chip, IconButton, InputAdornment, Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Badge as BadgeIcon,
  Save as SaveIcon,
  Pin as PinIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks';
import { wailsAuthService } from '../../services/wailsAuthService';
import { toast } from 'react-toastify';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  cashier: 'Cajero',
  waiter: 'Mesero',
  kitchen: 'Cocina',
};

const roleColors: Record<string, 'error' | 'primary' | 'success' | 'warning' | 'info'> = {
  admin: 'error',
  manager: 'primary',
  cashier: 'success',
  waiter: 'info',
  kitchen: 'warning',
};

const Profile: React.FC = () => {
  const { user } = useAuth();

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // PIN form
  const [oldPIN, setOldPIN] = useState('');
  const [newPIN, setNewPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [savingPIN, setSavingPIN] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    setSavingProfile(true);
    try {
      await wailsAuthService.updateEmployee(user!.id!, { name, email, phone });
      toast.success('Perfil actualizado');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      toast.error('Completa todos los campos');
      return;
    }
    if (newPassword.length < 4) {
      toast.error('La nueva contraseña debe tener al menos 4 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setSavingPassword(true);
    try {
      await wailsAuthService.changePassword(oldPassword, newPassword);
      toast.success('Contraseña actualizada');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleChangePIN = async () => {
    if (!oldPIN || !newPIN) {
      toast.error('Completa todos los campos');
      return;
    }
    if (newPIN.length < 4 || newPIN.length > 6) {
      toast.error('El PIN debe tener entre 4 y 6 dígitos');
      return;
    }
    if (newPIN !== confirmPIN) {
      toast.error('Los PINs no coinciden');
      return;
    }
    setSavingPIN(true);
    try {
      await wailsAuthService.changePIN(oldPIN, newPIN);
      toast.success('PIN actualizado');
      setOldPIN('');
      setNewPIN('');
      setConfirmPIN('');
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar PIN');
    } finally {
      setSavingPIN(false);
    }
  };

  if (!user) return null;

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Mi Perfil</Typography>

      {/* User Info Header */}
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
        <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem' }}>
          {user.name?.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h5">{user.name}</Typography>
          <Typography variant="body2" color="text.secondary">@{user.username}</Typography>
          <Chip
            label={roleLabels[user.role] || user.role}
            color={roleColors[user.role] || 'default'}
            size="small"
            sx={{ mt: 0.5 }}
          />
          {user.last_login_at && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              Último acceso: {new Date(user.last_login_at).toLocaleString('es-CO')}
            </Typography>
          )}
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Profile Info */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon /> Información Personal
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Nombre Completo"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><BadgeIcon /></InputAdornment>,
                  }}
                />
                <TextField
                  label="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  fullWidth
                  type="email"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><EmailIcon /></InputAdornment>,
                  }}
                />
                <TextField
                  label="Teléfono"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><PhoneIcon /></InputAdornment>,
                  }}
                />
                <TextField
                  label="Usuario"
                  value={user.username}
                  fullWidth
                  disabled
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment>,
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  fullWidth
                >
                  {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Security */}
        <Grid item xs={12} md={6}>
          {/* Change Password */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LockIcon /> Cambiar Contraseña
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Contraseña Actual"
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowOldPassword(!showOldPassword)} edge="end">
                          {showOldPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Nueva Contraseña"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end">
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Confirmar Contraseña"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  fullWidth
                />
                <Button
                  variant="outlined"
                  onClick={handleChangePassword}
                  disabled={savingPassword || !oldPassword || !newPassword}
                  fullWidth
                >
                  {savingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Change PIN */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PinIcon /> Cambiar PIN
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="PIN Actual"
                  type="password"
                  value={oldPIN}
                  onChange={e => setOldPIN(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                />
                <TextField
                  label="Nuevo PIN"
                  type="password"
                  value={newPIN}
                  onChange={e => setNewPIN(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                  helperText="4-6 dígitos"
                />
                <TextField
                  label="Confirmar PIN"
                  type="password"
                  value={confirmPIN}
                  onChange={e => setConfirmPIN(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                />
                <Button
                  variant="outlined"
                  onClick={handleChangePIN}
                  disabled={savingPIN || !oldPIN || !newPIN}
                  fullWidth
                >
                  {savingPIN ? 'Cambiando...' : 'Cambiar PIN'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile;
