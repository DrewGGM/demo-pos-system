import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Tooltip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  ErrorOutline as ErrorIcon,
  Visibility,
  VisibilityOff,
  RestoreFromTrash as RestoreIcon,
  UploadFile as UploadIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  wailsBackupService,
  BackupConfig,
  BackupInfo,
} from '../../services/wailsBackupService';

// Wails runtime exposes a native file picker. We dynamically dereference the
// global so the page also works in pure-Vite demo mode (where window.runtime
// doesn't exist) — the import button just stays disabled.
const wailsOpenFileDialog: ((opts: any) => Promise<string>) | undefined =
  (window as any).runtime?.OpenFileDialog;

// BackupSettings is the admin UI to configure automated database backups to
// Cloudflare R2 (or any S3-compatible target).
//
// UX choices:
//   - Single page, no tabs — the config is small enough.
//   - Credentials are masked by default with a visibility toggle.
//   - "Test connection" probes the bucket without writing.
//   - "Run backup now" is exposed independently of the schedule so admin can
//     verify the upload works end-to-end before relying on automation.
//   - The "existing backups" table is read-only — it shows what's already in
//     the bucket and respects the retention policy.
const BackupSettings: React.FC = () => {
  const [cfg, setCfg] = useState<BackupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [running, setRunning] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  // Restore confirmation: nuked-by-destructive-action so we ALWAYS go through
  // a modal even when the source is a single file picked from disk.
  const [restoreTarget, setRestoreTarget] = useState<{
    source: 'bucket' | 'file';
    label: string; // shown in the dialog
    payload: string; // bucket key or local file path
  } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await wailsBackupService.getConfig();
      setCfg(c);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBackups = useCallback(async () => {
    setLoadingBackups(true);
    try {
      const list = await wailsBackupService.listBackups();
      setBackups(list);
    } catch {
      // Silent: shows empty list. Errors surface via "Test connection" instead.
    } finally {
      setLoadingBackups(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = <K extends keyof BackupConfig>(key: K, value: BackupConfig[K]) => {
    setCfg((c) => (c ? { ...c, [key]: value } : c));
  };

  const handleSave = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      const updated = await wailsBackupService.saveConfig(cfg);
      setCfg(updated);
      toast.success('Configuración guardada');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      // Save first so the test uses the freshest credentials.
      if (cfg) await wailsBackupService.saveConfig(cfg);
      await wailsBackupService.testConnection();
      toast.success('Conexión OK — bucket accesible');
      await refreshBackups();
    } catch (err: any) {
      toast.error(err?.message || 'Falló la prueba de conexión');
    } finally {
      setTesting(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const res = await wailsBackupService.runBackup();
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Backup subido: ${res.key} (${formatBytes(res.size)})`);
        await load();
        await refreshBackups();
      }
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo ejecutar el backup');
    } finally {
      setRunning(false);
    }
  };

  // Restore handlers. We split "pick the source" from "actually restore" so
  // both bucket entries and local files go through the same confirmation
  // modal — restore is destructive and we want one obvious chokepoint.
  const requestBucketRestore = (b: BackupInfo) => {
    setRestoreTarget({
      source: 'bucket',
      label: `${b.key} (${formatBytes(b.size)})`,
      payload: b.key,
    });
  };

  const requestLocalRestore = async () => {
    if (!wailsOpenFileDialog) {
      toast.error('El selector de archivos sólo está disponible en la app instalada');
      return;
    }
    try {
      const path = await wailsOpenFileDialog({
        title: 'Selecciona el archivo de backup',
        filters: [{ displayName: 'Backups (*.sql.gz, *.db.gz, *.sql)', pattern: '*.sql.gz;*.db.gz;*.sql' }],
      });
      if (!path) return; // user cancelled
      setRestoreTarget({
        source: 'file',
        label: path,
        payload: path,
      });
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo abrir el selector');
    }
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const result =
        restoreTarget.source === 'bucket'
          ? await wailsBackupService.restoreFromBucket(restoreTarget.payload)
          : await wailsBackupService.restoreFromLocalFile(restoreTarget.payload);

      if (result.error) {
        toast.error(`Restore falló: ${result.error}`, { autoClose: 12000 });
      } else {
        toast.success(
          `Restore completado (${formatBytes(result.bytes_in)}). ${
            result.pre_backup_key ? 'Copia previa guardada en ' + result.pre_backup_key : ''
          }`,
          { autoClose: 12000 },
        );
      }
      setRestoreTarget(null);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo restaurar');
    } finally {
      setRestoring(false);
    }
  };

  if (loading || !cfg) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    // No outer padding — this component is rendered inside a Settings Paper
    // tab panel that already provides spacing. Adding our own would double
    // the gutter and the page would feel cramped.
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <CloudUploadIcon color="primary" sx={{ fontSize: 32 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Backups en la nube
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Copias automáticas de la base de datos a Cloudflare R2 (u otro almacenamiento S3-compatible).
          </Typography>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Plan gratis de R2:</strong> 10 GB de almacenamiento. Configura{' '}
        <code>Retención</code> para no exceder el límite. Sugerido: 14 copias diarias × ≤ 30 días.
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
            Estado
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={cfg.enabled}
                onChange={(e) => update('enabled', e.target.checked)}
              />
            }
            label={cfg.enabled ? 'Activo' : 'Inactivo'}
          />
        </Box>

        {cfg.last_backup_at ? (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              icon={<CheckIcon />}
              label={`Último: ${new Date(cfg.last_backup_at).toLocaleString('es-CO')}`}
              color="success"
              variant="outlined"
            />
            <Chip label={formatBytes(cfg.last_backup_size)} variant="outlined" />
            <Chip label={cfg.last_backup_key} variant="outlined" sx={{ maxWidth: 320 }} />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Aún no se ha realizado ningún backup.
          </Typography>
        )}
        {cfg.last_error && (
          <Alert severity="error" icon={<ErrorIcon />} sx={{ mt: 2 }}>
            {cfg.last_error}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Credenciales y bucket
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Endpoint"
              placeholder="<account>.r2.cloudflarestorage.com"
              value={cfg.endpoint}
              onChange={(e) => update('endpoint', e.target.value)}
              helperText="Para R2: <account_id>.r2.cloudflarestorage.com (sin https://)"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Bucket"
              value={cfg.bucket}
              onChange={(e) => update('bucket', e.target.value)}
              helperText="Nombre del bucket en R2"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Región"
              value={cfg.region}
              onChange={(e) => update('region', e.target.value)}
              helperText="R2 usa 'auto'; S3 usa la región del bucket"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Prefijo (opcional)"
              value={cfg.bucket_prefix}
              onChange={(e) => update('bucket_prefix', e.target.value)}
              helperText="Carpeta dentro del bucket. Ej: cliente-x/backups/"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Access Key ID"
              value={cfg.access_key_id}
              onChange={(e) => update('access_key_id', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Secret Access Key"
              type={showSecret ? 'text' : 'password'}
              value={cfg.secret_access_key}
              onChange={(e) => update('secret_access_key', e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowSecret((v) => !v)}
                      edge="end"
                    >
                      {showSecret ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Switch
              checked={cfg.use_ssl}
              onChange={(e) => update('use_ssl', e.target.checked)}
            />
          }
          label="Usar HTTPS"
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Programación
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Intervalo (horas)"
              value={cfg.interval_hours}
              onChange={(e) => update('interval_hours', Number(e.target.value || 0))}
              helperText="0 = solo manual"
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Hora diaria (HH:MM)"
              value={cfg.daily_at}
              onChange={(e) => update('daily_at', e.target.value)}
              helperText="Backup a esta hora local"
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Retención
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Mantener últimas N copias"
              value={cfg.retention_count}
              onChange={(e) => update('retention_count', Number(e.target.value || 0))}
              helperText="0 = sin límite"
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Eliminar copias mayores a N días"
              value={cfg.retention_days}
              onChange={(e) => update('retention_days', Number(e.target.value || 0))}
              helperText="0 = sin límite. Siempre se conserva la más reciente"
              inputProps={{ min: 0 }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          PostgreSQL (avanzado)
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          La app detecta automáticamente PostgreSQL en ubicaciones estándar (instalador EnterpriseDB,
          embedded del POS). Si tienes uno instalado en otra ruta, pégala aquí. Dejar en blanco usa
          autodetect.
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="Ruta a pg_dump / psql (opcional)"
          placeholder='Ej: C:\Program Files\PostgreSQL\16\bin'
          value={cfg.pg_bin_path}
          onChange={(e) => update('pg_bin_path', e.target.value)}
          helperText="Carpeta que contiene pg_dump.exe y psql.exe. Puedes pegar la carpeta bin/ o la raíz del install."
        />
      </Paper>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          Guardar
        </Button>
        <Button
          variant="outlined"
          onClick={handleTest}
          disabled={testing}
          startIcon={testing ? <CircularProgress size={16} /> : undefined}
        >
          Probar conexión
        </Button>
        <Button
          variant="outlined"
          color="success"
          onClick={handleRunNow}
          disabled={running || !cfg.enabled}
          startIcon={running ? <CircularProgress size={16} /> : <PlayIcon />}
        >
          Ejecutar backup ahora
        </Button>
      </Box>

      <Paper>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
            Copias en el bucket
          </Typography>
          <Tooltip title="Restaurar desde un archivo local (.sql.gz, .db.gz)">
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                onClick={requestLocalRestore}
                disabled={!wailsOpenFileDialog}
              >
                Importar archivo
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Recargar">
            <IconButton onClick={refreshBackups} disabled={loadingBackups}>
              {loadingBackups ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        <Divider />
        {backups.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">
              No hay copias visibles. Ejecuta un backup, prueba la conexión, o usa "Importar
              archivo" para subir uno desde tu PC.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Archivo</TableCell>
                  <TableCell>Tamaño</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.key} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{b.key}</TableCell>
                    <TableCell>{formatBytes(b.size)}</TableCell>
                    <TableCell>{new Date(b.last_modified).toLocaleString('es-CO')}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Restaurar esta copia (destructivo)">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => requestBucketRestore(b)}
                        >
                          <RestoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Confirmation modal — destructive action so we force a deliberate
          click and explain exactly what's about to happen. */}
      <Dialog
        open={!!restoreTarget}
        onClose={() => !restoring && setRestoreTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          ¿Restaurar la base de datos?
        </DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body2" sx={{ mb: 1 }}>
              Vas a <b>reemplazar la base de datos actual</b> con el contenido de:
            </Typography>
            <Box
              sx={{
                p: 1,
                bgcolor: 'action.hover',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: 12,
                wordBreak: 'break-all',
                mb: 2,
              }}
            >
              {restoreTarget?.label}
            </Box>
            <Alert severity="warning" sx={{ mb: 1 }}>
              Antes de aplicar el restore se crea automáticamente una <b>copia de seguridad
              del estado actual</b> en <code>data/pre-restore-backups/</code> por si algo sale mal.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Si tienes otros usuarios conectados, ciérralos antes de continuar. La operación
              puede tardar varios segundos dependiendo del tamaño del backup.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreTarget(null)} disabled={restoring}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={confirmRestore}
            disabled={restoring}
            startIcon={restoring ? <CircularProgress size={16} /> : <RestoreIcon />}
          >
            {restoring ? 'Restaurando...' : 'Restaurar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export default BackupSettings;
