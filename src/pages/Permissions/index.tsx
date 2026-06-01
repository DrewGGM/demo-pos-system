import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  InputAdornment,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Lock as LockIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
  ShoppingCart as POSIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Category as CatalogIcon,
  AdminPanelSettings as AdminIcon,
  Help as HelpIcon,
  AdminPanelSettings as AdminPersonIcon,
  PointOfSale as CashierIcon,
  Restaurant as WaiterIcon,
  SoupKitchen as KitchenIcon,
  Person as DefaultRoleIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  wailsPermissionService,
  RoleMatrixRow,
} from '../../services/wailsPermissionService';
import { usePermissions } from '../../hooks';

// PermissionsAdmin renders the role × permission matrix as a category-grouped,
// searchable, collapsible MUI table. Edits are saved on the fly (no global
// "save" button) so the admin sees per-cell feedback.
//
// Layout choices:
//   - Categories are collapsible Accordion-like panels.
//   - Permission name + code + description sit in the left column (sticky).
//   - One column per role, with a colored avatar header for quick scanning.
//   - Booleans → Switch. Numbers → numeric TextField (commits onBlur).
//   - A small "default" chip marks cells that fall back to catalog default.

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ReactElement; color: string }
> = {
  pos: { label: 'Punto de Venta', icon: <POSIcon />, color: '#1976d2' },
  reports: { label: 'Reportes', icon: <ReportsIcon />, color: '#9c27b0' },
  settings: { label: 'Configuración', icon: <SettingsIcon />, color: '#ed6c02' },
  catalog: { label: 'Catálogo', icon: <CatalogIcon />, color: '#2e7d32' },
  admin: { label: 'Administración', icon: <AdminIcon />, color: '#d32f2f' },
};

function categoryMeta(cat: string) {
  return (
    CATEGORY_META[cat] || {
      label: cat,
      icon: <HelpIcon />,
      color: '#607d8b',
    }
  );
}

const ROLE_META: Record<
  string,
  { color: string; icon: React.ReactElement }
> = {
  admin: { color: '#d32f2f', icon: <AdminPersonIcon /> },
  cashier: { color: '#1976d2', icon: <CashierIcon /> },
  waiter: { color: '#2e7d32', icon: <WaiterIcon /> },
  kitchen: { color: '#ed6c02', icon: <KitchenIcon /> },
};

function roleMeta(role: string) {
  return ROLE_META[role] || { color: '#607d8b', icon: <DefaultRoleIcon /> };
}

const PermissionsAdmin: React.FC = () => {
  const { can } = usePermissions();
  const canManage = can('employees.manage'); // gate the page itself

  const [rows, setRows] = useState<RoleMatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await wailsPermissionService.listMatrix();
      setRows(data);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar la matriz de permisos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Group rows by (category → permission code). Each group has one row per
  // permission, and each row has a byRole map for cell lookup.
  const grouped = useMemo(() => {
    type PermRow = {
      code: string;
      name: string;
      description: string;
      type: string;
      defaultValue: string;
      displayOrder: number;
      byRole: Record<string, RoleMatrixRow>;
    };
    const cats: Record<string, PermRow[]> = {};
    const seen: Record<string, PermRow> = {};
    const q = search.trim().toLowerCase();

    for (const r of rows) {
      // Filter on search across permission code/name/description.
      if (q) {
        const hay = `${r.code} ${r.name} ${r.description}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const key = r.code;
      if (!seen[key]) {
        const pr: PermRow = {
          code: r.code,
          name: r.name,
          description: r.description,
          type: r.type,
          defaultValue: r.default_value,
          displayOrder: r.display_order,
          byRole: {},
        };
        seen[key] = pr;
        if (!cats[r.category]) cats[r.category] = [];
        cats[r.category].push(pr);
      }
      seen[key].byRole[r.role] = r;
    }

    for (const cat of Object.keys(cats)) {
      cats[cat].sort((a, b) => a.displayOrder - b.displayOrder);
    }
    return cats;
  }, [rows, search]);

  const roles = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(r.role));
    return Array.from(s).sort((a, b) => {
      if (a === 'admin') return -1;
      if (b === 'admin') return 1;
      return a.localeCompare(b);
    });
  }, [rows]);

  const handleChange = async (role: string, code: string, value: string) => {
    const key = `${role}:${code}`;
    setSavingKey(key);
    try {
      await wailsPermissionService.setRolePermission(role, code, value);
      setRows((prev) =>
        prev.map((r) =>
          r.role === role && r.code === code
            ? { ...r, value, has_override: true }
            : r,
        ),
      );
      toast.success(`Actualizado`, { autoClose: 1200 });
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar el permiso');
    } finally {
      setSavingKey(null);
    }
  };

  if (!canManage) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" icon={<LockIcon />} sx={{ maxWidth: 600 }}>
          Tu rol no tiene el permiso <code>employees.manage</code>, requerido para
          administrar permisos.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const categoriesOrdered = Object.keys(grouped).sort((a, b) => {
    const order = ['pos', 'reports', 'catalog', 'settings', 'admin'];
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 1,
        }}
      >
        <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
          <AdminIcon />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Permisos por Rol
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configura qué puede hacer cada rol. Los cambios se aplican al instante.
          </Typography>
        </Box>
        <Tooltip title="Recargar">
          <IconButton onClick={load}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Buscar por nombre, código o descripción…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: search && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setSearch('')}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3, maxWidth: 600 }}
      />

      {/* Empty state when search returns nothing */}
      {categoriesOrdered.length === 0 && (
        <Alert severity="info">
          No hay permisos que coincidan con "<b>{search}</b>".
        </Alert>
      )}

      {/* Categories */}
      <Stack spacing={2}>
        {categoriesOrdered.map((category) => {
          const meta = categoryMeta(category);
          const isCollapsed = collapsed[category];
          return (
            <Paper key={category} elevation={1} sx={{ overflow: 'hidden' }}>
              {/* Category header */}
              <Box
                onClick={() =>
                  setCollapsed((s) => ({ ...s, [category]: !s[category] }))
                }
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  bgcolor: meta.color,
                  color: 'white',
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { filter: 'brightness(1.05)' },
                }}
              >
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
                  {meta.icon}
                </Avatar>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                  {meta.label}
                </Typography>
                <Chip
                  label={`${grouped[category].length} permiso${grouped[category].length === 1 ? '' : 's'}`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.25)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
                {isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
              </Box>

              {/* Category body */}
              <Collapse in={!isCollapsed}>
                <TableContainer>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            minWidth: 280,
                            bgcolor: 'background.paper',
                            fontWeight: 700,
                          }}
                        >
                          Permiso
                        </TableCell>
                        {roles.map((role) => {
                          const rm = roleMeta(role);
                          return (
                            <TableCell
                              key={role}
                              align="center"
                              sx={{
                                minWidth: 130,
                                bgcolor: 'background.paper',
                                fontWeight: 700,
                                textTransform: 'capitalize',
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                                justifyContent="center"
                              >
                                <Avatar
                                  sx={{
                                    bgcolor: rm.color,
                                    width: 22,
                                    height: 22,
                                    '& svg': { fontSize: 14 },
                                  }}
                                >
                                  {rm.icon}
                                </Avatar>
                                <span>{role}</span>
                              </Stack>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grouped[category].map((perm) => (
                        <TableRow key={perm.code} hover>
                          <TableCell sx={{ verticalAlign: 'top', py: 1.25 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {perm.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', fontFamily: 'monospace' }}
                            >
                              {perm.code}
                            </Typography>
                            {perm.description && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mt: 0.5 }}
                              >
                                {perm.description}
                              </Typography>
                            )}
                          </TableCell>
                          {roles.map((role) => {
                            const cell = perm.byRole[role];
                            const value = cell?.value ?? perm.defaultValue;
                            const hasOverride = cell?.has_override === true;
                            const key = `${role}:${perm.code}`;
                            const saving = savingKey === key;
                            return (
                              <TableCell
                                key={role}
                                align="center"
                                sx={{ verticalAlign: 'middle', py: 1 }}
                              >
                                {perm.type === 'boolean' ? (
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 0.5,
                                    }}
                                  >
                                    <Switch
                                      size="small"
                                      checked={value === 'true'}
                                      disabled={saving}
                                      onChange={(e) =>
                                        handleChange(
                                          role,
                                          perm.code,
                                          e.target.checked ? 'true' : 'false',
                                        )
                                      }
                                    />
                                    {!hasOverride && (
                                      <Tooltip title="Valor por defecto">
                                        <Chip
                                          label="def"
                                          size="small"
                                          sx={{
                                            height: 16,
                                            fontSize: 9,
                                            opacity: 0.6,
                                          }}
                                        />
                                      </Tooltip>
                                    )}
                                  </Box>
                                ) : (
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 0.5,
                                    }}
                                  >
                                    <TextField
                                      type="number"
                                      size="small"
                                      value={value}
                                      disabled={saving}
                                      onBlur={(e) => {
                                        const v = e.target.value || '0';
                                        if (v !== (cell?.value ?? perm.defaultValue)) {
                                          void handleChange(role, perm.code, v);
                                        }
                                      }}
                                      onChange={(e) => {
                                        // Optimistic local update only; commit on blur.
                                        setRows((prev) =>
                                          prev.map((r) =>
                                            r.role === role && r.code === perm.code
                                              ? { ...r, value: e.target.value }
                                              : r,
                                          ),
                                        );
                                      }}
                                      inputProps={{
                                        style: { textAlign: 'center' },
                                      }}
                                      sx={{ width: 72 }}
                                    />
                                    {!hasOverride && (
                                      <Tooltip title="Valor por defecto">
                                        <Chip
                                          label="def"
                                          size="small"
                                          sx={{
                                            height: 16,
                                            fontSize: 9,
                                            opacity: 0.6,
                                          }}
                                        />
                                      </Tooltip>
                                    )}
                                  </Box>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Collapse>
            </Paper>
          );
        })}
      </Stack>

      <Divider sx={{ my: 3 }} />
      <Alert severity="info" variant="outlined">
        Los cambios se aplican al instante. Un empleado con sesión activa verá
        el nuevo permiso reflejado al cerrar sesión y volver a entrar.
      </Alert>
    </Box>
  );
};

export default PermissionsAdmin;
