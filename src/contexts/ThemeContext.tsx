import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, Theme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { wailsConfigService } from '../services/wailsConfigService';

export type ThemeMode = 'light' | 'dark';

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  description?: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'blue', name: 'Azul Clásico', primary: '#3B82F6', secondary: '#8B5CF6', description: 'Tema por defecto' },
  { id: 'lyroo', name: 'Lyroo Purple', primary: '#8B5CF6', secondary: '#EC4899', description: 'Colores de marca Lyroo' },
  { id: 'emerald', name: 'Esmeralda', primary: '#10B981', secondary: '#06B6D4', description: 'Verde fresco' },
  { id: 'sunset', name: 'Atardecer', primary: '#F97316', secondary: '#EF4444', description: 'Naranja vibrante' },
  { id: 'ruby', name: 'Rubí', primary: '#E11D48', secondary: '#BE123C', description: 'Rojo elegante' },
  { id: 'ocean', name: 'Océano', primary: '#0EA5E9', secondary: '#06B6D4', description: 'Azul cielo' },
  { id: 'forest', name: 'Bosque', primary: '#059669', secondary: '#65A30D', description: 'Verde natural' },
  { id: 'midnight', name: 'Medianoche', primary: '#6366F1', secondary: '#8B5CF6', description: 'Índigo profundo' },
  { id: 'rose', name: 'Rosa', primary: '#EC4899', secondary: '#F43F5E', description: 'Rosa moderno' },
  { id: 'amber', name: 'Ámbar', primary: '#F59E0B', secondary: '#D97706', description: 'Cálido amarillo' },
];

interface ThemeSettings {
  mode: ThemeMode;
  presetId: string;
  customPrimary?: string;
  customSecondary?: string;
  borderRadius: number;
  fontFamily: string;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: 'light',
  presetId: 'blue',
  borderRadius: 8,
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
};

const CACHE_KEY = 'pos_theme_cache';

interface ThemeContextType {
  settings: ThemeSettings;
  updateSettings: (updates: Partial<ThemeSettings>) => Promise<void>;
  resetTheme: () => Promise<void>;
  presets: ThemePreset[];
  currentTheme: Theme;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeSettings = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeSettings must be used within ThemeSettingsProvider');
  return ctx;
};

function loadCached(): ThemeSettings {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveCache(settings: ThemeSettings) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(settings)); } catch {}
}

function buildTheme(settings: ThemeSettings): Theme {
  const preset = THEME_PRESETS.find(p => p.id === settings.presetId) || THEME_PRESETS[0];
  const primary = settings.customPrimary || preset.primary;
  const secondary = settings.customSecondary || preset.secondary;
  const isDark = settings.mode === 'dark';

  return createTheme({
    palette: {
      mode: settings.mode,
      primary: { main: primary, contrastText: '#FFFFFF' },
      secondary: { main: secondary, contrastText: '#FFFFFF' },
      success: { main: '#10B981' },
      warning: { main: '#F59E0B' },
      error: { main: '#EF4444' },
      info: { main: '#0EA5E9' },
      background: {
        default: isDark ? '#0F172A' : '#F3F4F6',
        paper: isDark ? '#1E293B' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#F1F5F9' : '#1F2937',
        secondary: isDark ? '#94A3B8' : '#6B7280',
      },
      divider: isDark ? '#334155' : '#E5E7EB',
    },
    typography: {
      fontFamily: settings.fontFamily,
      h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
      h2: { fontSize: '2rem', fontWeight: 600, lineHeight: 1.2 },
      h3: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.167 },
      h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.235 },
      h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.334 },
      h6: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.6 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: settings.borderRadius },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: settings.borderRadius, padding: '8px 16px' },
          sizeLarge: { padding: '12px 24px', fontSize: '1rem' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: settings.borderRadius * 1.5 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          rounded: { borderRadius: settings.borderRadius * 1.5 },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: { '& .MuiOutlinedInput-root': { borderRadius: settings.borderRadius } },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: settings.borderRadius * 0.75, fontWeight: 500 },
        },
      },
    },
  });
}

// Backend UITheme ↔ frontend ThemeSettings
function fromBackend(theme: any): ThemeSettings {
  return {
    mode: (theme.mode === 'dark' || theme.dark_mode) ? 'dark' : 'light',
    presetId: theme.preset_id || 'blue',
    customPrimary: theme.custom_primary || undefined,
    customSecondary: theme.custom_secondary || undefined,
    borderRadius: theme.border_radius || 8,
    fontFamily: theme.font_family || DEFAULT_SETTINGS.fontFamily,
  };
}

function toBackend(settings: ThemeSettings, existing?: any): any {
  const preset = THEME_PRESETS.find(p => p.id === settings.presetId) || THEME_PRESETS[0];
  return {
    ...(existing || {}),
    preset_id: settings.presetId,
    mode: settings.mode,
    dark_mode: settings.mode === 'dark',
    primary_color: preset.primary,
    secondary_color: preset.secondary,
    custom_primary: settings.customPrimary || '',
    custom_secondary: settings.customSecondary || '',
    border_radius: settings.borderRadius,
    font_family: settings.fontFamily,
  };
}

export const ThemeSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ThemeSettings>(loadCached);
  const [loading, setLoading] = useState(true);
  const [backendTheme, setBackendTheme] = useState<any>(null);

  // Load from DB on mount (cached version shows immediately, DB syncs after)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const theme = await wailsConfigService.getUITheme();
        if (theme && !cancelled) {
          const loaded = fromBackend(theme);
          setSettings(loaded);
          saveCache(loaded);
          setBackendTheme(theme);
        }
      } catch { /* backend not ready, use cache */ }
      if (!cancelled) setLoading(false);
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const updateSettings = async (updates: Partial<ThemeSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    saveCache(next);
    try {
      await wailsConfigService.updateUITheme(toBackend(next, backendTheme));
    } catch (e) {
      console.warn('Failed to save theme to backend:', e);
    }
  };

  const resetTheme = async () => {
    setSettings(DEFAULT_SETTINGS);
    saveCache(DEFAULT_SETTINGS);
    try {
      await wailsConfigService.updateUITheme(toBackend(DEFAULT_SETTINGS, backendTheme));
    } catch { /* ignore */ }
  };

  const currentTheme = useMemo(() => buildTheme(settings), [settings]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.mode);
  }, [settings.mode]);

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, resetTheme, presets: THEME_PRESETS, currentTheme, loading }}>
      <MuiThemeProvider theme={currentTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
