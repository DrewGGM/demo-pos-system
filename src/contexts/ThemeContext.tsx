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
  { id: 'lyroo', name: 'Lyroo Violeta', primary: '#542EB1', secondary: '#EC4899', description: 'Color de marca Lyroo' },
  { id: 'blue', name: 'Azul Clásico', primary: '#3B82F6', secondary: '#8B5CF6', description: 'Azul clásico' },
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
  presetId: 'lyroo',
  borderRadius: 12,
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

// Small hex helpers so we can derive legible accent shades for both grounds
// from a single brand color (presets only give us `primary`/`secondary`).
function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}
/** mix `hex` toward white (amt>0) or black (amt<0), amt in [-1,1] */
function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function buildTheme(settings: ThemeSettings): Theme {
  const preset = THEME_PRESETS.find(p => p.id === settings.presetId) || THEME_PRESETS[0];
  const brand = settings.customPrimary || preset.primary;
  const secondary = settings.customSecondary || preset.secondary;
  const isDark = settings.mode === 'dark';

  // On a dark ground a deep brand color loses legibility, so we lift the
  // accent toward white; on light we keep it saturated. Money/semantic
  // colors are tuned per-ground the same way.
  const primaryMain = isDark ? shade(brand, 0.34) : brand;
  const primaryLight = isDark ? shade(brand, 0.5) : shade(brand, 0.22);
  const primaryDark = isDark ? shade(brand, 0.12) : shade(brand, -0.18);

  // Money/confirm green is deliberately independent of the brand preset so
  // "Cobrar/Pagar" always reads the same regardless of the chosen palette.
  const money = isDark ? '#34D399' : '#10B981';
  const moneyDark = isDark ? '#10B981' : '#059669';

  const radius = settings.borderRadius;

  return createTheme({
    palette: {
      mode: settings.mode,
      primary: { main: primaryMain, light: primaryLight, dark: primaryDark, contrastText: '#FFFFFF' },
      secondary: { main: isDark ? shade(secondary, 0.2) : secondary, contrastText: '#FFFFFF' },
      success: { main: money, dark: moneyDark, contrastText: '#FFFFFF' },
      warning: { main: isDark ? '#FBBF24' : '#F59E0B', contrastText: isDark ? '#1A1626' : '#FFFFFF' },
      error: { main: isDark ? '#FB7185' : '#E11D48', contrastText: '#FFFFFF' },
      info: { main: isDark ? '#38BDF8' : '#0EA5E9', contrastText: '#FFFFFF' },
      // Neutrals carry a slight violet bias so the app reads as chosen, not
      // a clinical grey. Dark mode uses layered violet-tinted surfaces
      // (default < paper) instead of the old flat cold slate.
      background: {
        default: isDark ? '#14111C' : '#F4F2F9',
        paper: isDark ? '#1E1A2B' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#F2EFF7' : '#1A1626',
        secondary: isDark ? '#A79FB8' : '#6B6580',
        disabled: isDark ? '#6B6480' : '#9A93AC',
      },
      divider: isDark ? '#322B45' : '#E7E3F1',
      action: {
        hover: isDark ? rgba('#8B6FE0', 0.08) : rgba(brand, 0.05),
        selected: isDark ? rgba('#8B6FE0', 0.14) : rgba(brand, 0.09),
      },
    },
    typography: {
      fontFamily: settings.fontFamily,
      h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
      h2: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
      h3: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.167, letterSpacing: '-0.015em' },
      h4: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.235, letterSpacing: '-0.01em' },
      h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.334 },
      h6: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.5 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: radius },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Tabular figures everywhere: in a POS, prices/quantities/totals
          // line up in columns and must not wobble as digits change.
          body: { fontVariantNumeric: 'tabular-nums' },
          '::selection': { background: rgba(brand, isDark ? 0.4 : 0.18) },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: radius, padding: '8px 16px' },
          sizeLarge: { padding: '12px 24px', fontSize: '1rem' },
          containedSuccess: {
            boxShadow: `0 6px 16px ${rgba(money, isDark ? 0.28 : 0.32)}`,
            '&:hover': { boxShadow: `0 10px 24px ${rgba(money, isDark ? 0.36 : 0.42)}` },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: radius * 1.35,
            border: `1px solid ${isDark ? '#322B45' : '#EDEAF5'}`,
            boxShadow: isDark ? 'none' : '0 1px 2px rgba(26,22,38,0.05)',
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          rounded: { borderRadius: radius * 1.35 },
          // Layered surfaces in dark mode: shadows read poorly on dark, so
          // higher elevation = slightly lighter violet surface + a hairline.
          elevation1: isDark ? { backgroundColor: '#221D30', boxShadow: 'none' } : undefined,
          elevation3: isDark ? { backgroundColor: '#272235', boxShadow: 'none', border: '1px solid #322B45' } : undefined,
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: { '& .MuiOutlinedInput-root': { borderRadius: radius } },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: radius * 0.75, fontWeight: 600 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { fontSize: '0.75rem', borderRadius: 8, padding: '6px 10px' },
        },
      },
      // ---- Cross-cutting polish: these cascade to every page that uses
      // Tables, Dialogs, Alerts, Tabs, etc., so the whole app gains a
      // consistent look without touching each screen. ----
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: radius * 1.25,
            border: `1px solid ${isDark ? '#322B45' : '#EDEAF5'}`,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: isDark ? '#221D30' : '#F4F2F9',
              color: isDark ? '#A79FB8' : '#6B6580',
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              borderBottom: `1px solid ${isDark ? '#322B45' : '#E7E3F1'}`,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${isDark ? '#2A2438' : '#EEEBF5'}`,
            padding: '12px 16px',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color .12s ease',
            '&:hover': { backgroundColor: isDark ? rgba('#8B6FE0', 0.06) : rgba(brand, 0.035) },
            '&:last-child .MuiTableCell-root': { borderBottom: 'none' },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: radius * 1.5,
            backgroundImage: 'none',
            border: isDark ? '1px solid #322B45' : 'none',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.01em' },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: radius, fontWeight: 500 },
          standardSuccess: { backgroundColor: rgba(money, isDark ? 0.16 : 0.1) },
          standardError: { backgroundColor: rgba(isDark ? '#FB7185' : '#E11D48', isDark ? 0.16 : 0.1) },
          standardWarning: { backgroundColor: rgba(isDark ? '#FBBF24' : '#F59E0B', isDark ? 0.16 : 0.12) },
          standardInfo: { backgroundColor: rgba(brand, isDark ? 0.16 : 0.09) },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, fontSize: '0.9rem', minHeight: 44 },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 3, borderRadius: 3 },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { borderRadius: radius },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: primaryLight },
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: { fontWeight: 700 },
        },
      },
      // DataGrid (Orders, Products, Sales): borderless container, styled
      // header band, and hoverable rows to match the themed MUI tables.
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: isDark ? '#221D30' : '#F4F2F9',
              borderRadius: 0,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isDark ? '#A79FB8' : '#6B6580',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: isDark ? rgba('#8B6FE0', 0.06) : rgba(brand, 0.035),
            },
            '& .MuiDataGrid-cell': {
              borderBottomColor: isDark ? '#2A2438' : '#EEEBF5',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTopColor: isDark ? '#322B45' : '#E7E3F1',
            },
          },
        },
      },
    } as any,
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
