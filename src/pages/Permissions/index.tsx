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
} from '@mui/material';
import { Refresh as RefreshIcon, Lock as LockIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  wailsPermissionService,
  RoleMatrixRow,
} from '../../services/wailsPermissionService';
import { usePermissions } from '../../hooks';

// PermissionsAdmin renders a category-grouped table where each row is a
// permission and each column is a role. Cells render a Switch for boolean
// permissions and a TextField for numeric ones.
//
// Edits are sent to the backend immediately (no global "save" button) so the
// admin sees feedback per change and can recover if one cell fails.
const PermissionsAdmin: React.FC = () => {
  const { can } = usePermissions();
  const canManage = can('employees.manage'); // gate the page itself

  const [rows, setRows] = useState<RoleMatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

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

  // Group rows by (category → permission code) so we render one row per code
  // with one cell per role.
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

    for (const r of rows) {
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

    // Sort permissions inside each category by displayOrder
    for (const cat of Object.keys(cats)) {
      cats[cat].sort((a, b) => a.displayOrder - b.displayOrder);
    }
    return cats;
  }, [rows]);

  const roles = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(r.role));
    // Sort with admin first, then alpha.
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
      // Optimistic update
      setRows((prev) =>
        prev.map((r) =>
          r.role === role && r.code === code
            ? { ...r, value, has_override: true }
            : r,
        ),
      );
      toast.success(`${code} actualizado para ${role}`, { autoClose: 1500 });
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar el permiso');
    } finally {
      setSavingKey(null);
    }
  };

  if (!canManage) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="warning"
          icon={<LockIcon />}
          sx={{ maxWidth: 600 }}
        >
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ flex: 1, fontWeight: 700 }}>
          Permisos por Rol
        </Typography>
        <Tooltip title="Recargar">
          <IconButton onClick={load}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Define qué puede hacer cada rol. Los cambios se aplican inmediatamente y
        la nueva configuración es visible al siguiente inicio de sesión del
        empleado afectado.
      </Typography>

      {Object.keys(grouped).sort().map((category) => (
        <Paper key={category} sx={{ mb: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
              {category}
            </Typography>
          </Box>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: 'action.hover' }}>
                <Box component="th" sx={{ p: 1.5, textAlign: 'left', minWidth: 280 }}>
                  Permiso
                </Box>
                {roles.map((role) => (
                  <Box
                    key={role}
                    component="th"
                    sx={{ p: 1.5, textAlign: 'center', textTransform: 'capitalize', minWidth: 120 }}
                  >
                    {role}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {grouped[category].map((perm) => (
                <Box
                  key={perm.code}
                  component="tr"
                  sx={{ borderTop: '1px solid', borderColor: 'divider' }}
                >
                  <Box component="td" sx={{ p: 1.5, verticalAlign: 'top' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {perm.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <code>{perm.code}</code>
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
                  </Box>
                  {roles.map((role) => {
                    const cell = perm.byRole[role];
                    const value = cell?.value ?? perm.defaultValue;
                    const hasOverride = cell?.has_override === true;
                    const key = `${role}:${perm.code}`;
                    const saving = savingKey === key;
                    return (
                      <Box
                        key={role}
                        component="td"
                        sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle' }}
                      >
                        {perm.type === 'boolean' ? (
                          <Switch
                            size="small"
                            checked={value === 'true'}
                            disabled={saving}
                            onChange={(e) =>
                              handleChange(role, perm.code, e.target.checked ? 'true' : 'false')
                            }
                          />
                        ) : (
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
                            inputProps={{ style: { textAlign: 'center' } }}
                            sx={{ width: 80 }}
                          />
                        )}
                        {!hasOverride && (
                          <Tooltip title="Usando valor por defecto del catálogo">
                            <Chip
                              label="default"
                              size="small"
                              sx={{
                                ml: 0.5,
                                height: 16,
                                fontSize: 9,
                                opacity: 0.6,
                              }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      ))}

      <Divider sx={{ my: 2 }} />
      <Alert severity="info" variant="outlined">
        Los cambios en permisos son auditados internamente. Si un empleado tiene
        sesión activa, deberá cerrar sesión y volver a entrar para ver el nuevo
        permiso reflejado en su interfaz.
      </Alert>
    </Box>
  );
};

export default PermissionsAdmin;
