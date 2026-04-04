import React from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, CardActionArea, Button,
  FormControl, RadioGroup, FormControlLabel, Radio, Slider, TextField,
  Divider, Chip, Stack,
} from '@mui/material';
import {
  LightMode as LightIcon, DarkMode as DarkIcon,
  Palette as PaletteIcon, Restore as RestoreIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useThemeSettings, THEME_PRESETS } from '../../contexts/ThemeContext';
import { toast } from 'react-toastify';

const FONT_OPTIONS = [
  { value: '"Inter", "Roboto", sans-serif', label: 'Inter (Moderno)' },
  { value: '"Roboto", "Helvetica", sans-serif', label: 'Roboto (Google)' },
  { value: '"Poppins", "Helvetica", sans-serif', label: 'Poppins (Redondeado)' },
  { value: '"Nunito", "Helvetica", sans-serif', label: 'Nunito (Suave)' },
  { value: '"Montserrat", "Helvetica", sans-serif', label: 'Montserrat (Elegante)' },
  { value: 'system-ui, -apple-system, sans-serif', label: 'Sistema' },
];

const ThemeSettings: React.FC = () => {
  const { settings, updateSettings, resetTheme, presets } = useThemeSettings();

  const handleReset = () => {
    if (window.confirm('¿Restaurar el tema por defecto?')) {
      resetTheme();
      toast.success('Tema restaurado');
    }
  };

  const selectedPreset = presets.find(p => p.id === settings.presetId) || presets[0];
  const effectivePrimary = settings.customPrimary || selectedPreset.primary;
  const effectiveSecondary = settings.customSecondary || selectedPreset.secondary;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaletteIcon color="primary" />
          <Typography variant="h6">Personalización del Tema</Typography>
        </Box>
        <Button startIcon={<RestoreIcon />} onClick={handleReset} size="small">
          Restaurar
        </Button>
      </Box>

      {/* Mode selector */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Modo</Typography>
        <FormControl>
          <RadioGroup
            row
            value={settings.mode}
            onChange={e => updateSettings({ mode: e.target.value as 'light' | 'dark' })}
          >
            <FormControlLabel
              value="light"
              control={<Radio />}
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><LightIcon fontSize="small" /> Claro</Box>}
            />
            <FormControlLabel
              value="dark"
              control={<Radio />}
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><DarkIcon fontSize="small" /> Oscuro</Box>}
            />
          </RadioGroup>
        </FormControl>
      </Paper>

      {/* Color presets */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Paleta de Colores</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Selecciona una paleta predefinida o personaliza los colores abajo
        </Typography>
        <Grid container spacing={2}>
          {THEME_PRESETS.map(preset => {
            const isSelected = settings.presetId === preset.id && !settings.customPrimary && !settings.customSecondary;
            return (
              <Grid item xs={6} sm={4} md={3} key={preset.id}>
                <Card
                  variant={isSelected ? 'elevation' : 'outlined'}
                  sx={{
                    position: 'relative',
                    border: isSelected ? `2px solid ${preset.primary}` : undefined,
                  }}
                >
                  <CardActionArea onClick={() => updateSettings({
                    presetId: preset.id,
                    customPrimary: undefined,
                    customSecondary: undefined,
                  })}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                        <Box sx={{ flex: 1, height: 40, bgcolor: preset.primary, borderRadius: 1 }} />
                        <Box sx={{ flex: 1, height: 40, bgcolor: preset.secondary, borderRadius: 1 }} />
                      </Box>
                      <Typography variant="caption" fontWeight={600} display="block">
                        {preset.name}
                      </Typography>
                      {preset.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>
                          {preset.description}
                        </Typography>
                      )}
                      {isSelected && (
                        <CheckIcon sx={{
                          position: 'absolute', top: 4, right: 4,
                          bgcolor: preset.primary, color: 'white',
                          borderRadius: '50%', fontSize: 20, p: 0.25,
                        }} />
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Custom colors */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Colores Personalizados</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Define colores propios (sobrescribe la paleta)
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Color Primario</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <input
                type="color"
                value={effectivePrimary}
                onChange={e => updateSettings({ customPrimary: e.target.value })}
                style={{ width: 50, height: 40, border: 'none', cursor: 'pointer', borderRadius: 4 }}
              />
              <TextField
                size="small"
                value={effectivePrimary}
                onChange={e => updateSettings({ customPrimary: e.target.value })}
                sx={{ flex: 1 }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Color Secundario</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <input
                type="color"
                value={effectiveSecondary}
                onChange={e => updateSettings({ customSecondary: e.target.value })}
                style={{ width: 50, height: 40, border: 'none', cursor: 'pointer', borderRadius: 4 }}
              />
              <TextField
                size="small"
                value={effectiveSecondary}
                onChange={e => updateSettings({ customSecondary: e.target.value })}
                sx={{ flex: 1 }}
              />
            </Box>
          </Grid>
        </Grid>
        {(settings.customPrimary || settings.customSecondary) && (
          <Button size="small" sx={{ mt: 2 }} onClick={() => updateSettings({ customPrimary: undefined, customSecondary: undefined })}>
            Limpiar personalización
          </Button>
        )}
      </Paper>

      {/* Border radius */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Bordes Redondeados</Typography>
        <Box sx={{ px: 1 }}>
          <Slider
            value={settings.borderRadius}
            onChange={(_, val) => updateSettings({ borderRadius: val as number })}
            min={0}
            max={20}
            step={1}
            marks={[
              { value: 0, label: 'Cuadrado' },
              { value: 8, label: 'Normal' },
              { value: 16, label: 'Redondo' },
              { value: 20, label: 'Máximo' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>
      </Paper>

      {/* Font family */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Tipografía</Typography>
        <FormControl fullWidth size="small">
          <RadioGroup
            value={settings.fontFamily}
            onChange={e => updateSettings({ fontFamily: e.target.value })}
          >
            {FONT_OPTIONS.map(opt => (
              <FormControlLabel
                key={opt.value}
                value={opt.value}
                control={<Radio size="small" />}
                label={<Typography sx={{ fontFamily: opt.value }}>{opt.label}</Typography>}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Paper>

      {/* Live preview */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Vista Previa</Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="contained">Primario</Button>
            <Button variant="contained" color="secondary">Secundario</Button>
            <Button variant="outlined">Outlined</Button>
            <Button variant="text">Text</Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label="Chip Default" />
            <Chip label="Primario" color="primary" />
            <Chip label="Secundario" color="secondary" />
            <Chip label="Success" color="success" />
            <Chip label="Error" color="error" />
          </Box>
          <TextField label="Campo de ejemplo" placeholder="Escribe algo..." size="small" fullWidth />
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Card de Ejemplo</Typography>
            <Typography variant="body2" color="text.secondary">
              Esta es una tarjeta con el tema actual aplicado. Los colores, bordes y tipografía se actualizan en tiempo real.
            </Typography>
          </Card>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ThemeSettings;
