import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  UploadFile as UploadIcon,
  Preview as PreviewIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  WarningAmber as WarnIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  wailsApidianMigrationService,
  MigrationPreview,
  MigrationSummary,
  BackfillResult,
} from '../../services/wailsApidianMigrationService';

// Native file picker comes from the Wails runtime. Unavailable in pure-Vite
// demo mode — we disable the picker button when missing.
const wailsOpenFileDialog: ((opts: any) => Promise<string>) | undefined =
  (window as any).runtime?.OpenFileDialog;

// ApidianMigration is the wizard that walks an admin through importing a
// MySQL dump of `apirestdian` into PosApp. Three steps:
//   1. Pick the dump file.
//   2. Preview (counts + samples + warnings).
//   3. Apply (with options: overwrite config, import historical docs).
//
// The wizard is rendered inside Settings → Backups as a standalone Paper —
// it doesn't replace the rest of the backups tab, just adds a focused
// section the admin can collapse mentally when not migrating.
const ApidianMigration: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [dumpPath, setDumpPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [summary, setSummary] = useState<MigrationSummary | null>(null);
  const [overwriteConfig, setOverwriteConfig] = useState(false);
  const [importDocuments, setImportDocuments] = useState(true);

  // Backfill state — independent from the dump migration. Some customers
  // hand over the apidian `storage/app/` folder later, after they already
  // ran the SQL migration; this section lets the operator paste that path
  // and fill in xml_document / pdf_document columns post-hoc.
  const [storagePath, setStoragePath] = useState('');
  const [backfillOverwrite, setBackfillOverwrite] = useState(false);
  const [backfillIncludeZip, setBackfillIncludeZip] = useState(false);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);

  const steps = ['Seleccionar dump', 'Vista previa', 'Importar'];

  const handlePickFile = async () => {
    if (!wailsOpenFileDialog) {
      toast.error('Selector de archivos sólo disponible en la app instalada');
      return;
    }
    try {
      const path = await wailsOpenFileDialog({
        title: 'Selecciona el dump MySQL de apidian',
        filters: [{ displayName: 'MySQL dump (*.sql)', pattern: '*.sql' }],
      });
      if (!path) return;
      setDumpPath(path);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo abrir el selector');
    }
  };

  const handlePreview = async () => {
    if (!dumpPath.trim()) {
      toast.error('Selecciona un archivo .sql primero');
      return;
    }
    setLoading(true);
    try {
      const prev = await wailsApidianMigrationService.preview(dumpPath);
      setPreview(prev);
      setActiveStep(1);
    } catch (err: any) {
      toast.error(err?.message || 'Error leyendo el dump');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!dumpPath || !preview) return;
    if (
      !window.confirm(
        '¿Aplicar la migración?\n\nEsto puede modificar dian_configs y crear filas en electronic_invoices/credit_notes/debit_notes. Se recomienda hacer un backup ANTES desde la pestaña Backups.',
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await wailsApidianMigrationService.import({
        dump_path: dumpPath,
        overwrite_config: overwriteConfig,
        import_documents: importDocuments,
      });
      setSummary(res);
      setActiveStep(2);
      if (res.errors && res.errors.length > 0) {
        toast.warning(`Migración completada con ${res.errors.length} error(es). Revisa el detalle.`);
      } else {
        toast.success('Migración completada exitosamente');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error en la migración');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setDumpPath('');
    setPreview(null);
    setSummary(null);
  };

  // Native folder picker for the backfill step. Wails OpenDirectoryDialog
  // when present; otherwise the textbox is the only way (works fine when
  // the admin pastes a path).
  const wailsOpenDirDialog: ((opts: any) => Promise<string>) | undefined =
    (window as any).runtime?.OpenDirectoryDialog;

  const handlePickStorage = async () => {
    if (!wailsOpenDirDialog) {
      toast.error('Selector de carpetas sólo disponible en la app instalada');
      return;
    }
    try {
      const path = await wailsOpenDirDialog({
        title: 'Selecciona la carpeta storage/app de apidian',
      });
      if (!path) return;
      setStoragePath(path);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo abrir el selector');
    }
  };

  const handleBackfill = async () => {
    if (!storagePath.trim()) {
      toast.error('Selecciona la carpeta primero');
      return;
    }
    if (
      !window.confirm(
        '¿Backfill desde storage?\n\nSe leerán los archivos XML/PDF de la carpeta y se asignarán a las facturas correspondientes en la BD local.',
      )
    ) {
      return;
    }
    setBackfillRunning(true);
    try {
      const res = await wailsApidianMigrationService.backfillFromStorage({
        root_path: storagePath,
        overwrite: backfillOverwrite,
        include_zip: backfillIncludeZip,
      });
      setBackfillResult(res);
      if (res.errors && res.errors.length > 0) {
        toast.warning(`Backfill completado con ${res.errors.length} error(es)`);
      } else {
        toast.success(`Backfill completado: ${res.xmls_applied} XML + ${res.pdfs_applied} PDF`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error en el backfill');
    } finally {
      setBackfillRunning(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
          Migración desde apidian (MySQL)
        </Typography>
        {activeStep > 0 && (
          <Button size="small" onClick={handleReset}>
            Empezar de nuevo
          </Button>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
        Importa configuración DIAN y el histórico de facturas desde un dump SQL del esquema
        <code> apirestdian</code>. Esto permite migrar instalaciones que hoy dependen del API
        externo a la facturación embebida de PosApp.
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* STEP 1 — pick file */}
      {activeStep === 0 && (
        <Box>
          <TextField
            fullWidth
            size="small"
            label="Ruta del archivo .sql"
            placeholder="C:\\Users\\andre\\Downloads\\backups\\backupsql.sql"
            value={dumpPath}
            onChange={(e) => setDumpPath(e.target.value)}
            helperText="Puedes pegar la ruta o usar el botón para seleccionar."
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              startIcon={<UploadIcon />}
              variant="outlined"
              onClick={handlePickFile}
              disabled={!wailsOpenFileDialog}
            >
              Seleccionar archivo
            </Button>
            <Button
              startIcon={loading ? <CircularProgress size={16} /> : <PreviewIcon />}
              variant="contained"
              onClick={handlePreview}
              disabled={loading || !dumpPath.trim()}
            >
              Generar vista previa
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 2 — preview */}
      {activeStep === 1 && preview && (
        <Box>
          {preview.warnings && preview.warnings.length > 0 && (
            <Alert severity="warning" icon={<WarnIcon />} sx={{ mb: 2 }}>
              <AlertTitle>Advertencias del dump</AlertTitle>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  Emisor (companies)
                </Typography>
                {preview.company ? (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      NIT {preview.company.identification_number}-{preview.company.dv}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Régimen {preview.company.type_regime_id} · Liab {preview.company.type_liability_id} ·
                      Mun {preview.company.municipality_id}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="error">
                    Sin fila en companies
                  </Typography>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  Resoluciones
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {preview.resolutions.length} resolución(es)
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                  {preview.resolutions.map((r) => (
                    <Chip
                      key={r.id}
                      size="small"
                      label={`${r.prefix} (${labelForType(r.type_document_id)})`}
                      title={`Resolución ${r.resolution}\n${r.from}–${r.to}\nÚltimo: ${r.next}`}
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  Certificado
                </Typography>
                {preview.certificate ? (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {preview.certificate.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Expira {preview.certificate.expires || 's/d'}
                    </Typography>
                    <Alert severity="info" sx={{ mt: 1, fontSize: 11 }}>
                      Sólo se importa la contraseña. El .p12 deberás subirlo aparte desde
                      Configuración → DIAN.
                    </Alert>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sin certificado en el dump
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Documentos en el dump
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`Facturas: ${preview.document_counts.invoices}`} color="primary" />
              <Chip label={`NC: ${preview.document_counts.credit_notes}`} />
              <Chip label={`ND: ${preview.document_counts.debit_notes}`} />
              <Chip label={`Aceptadas: ${preview.document_counts.accepted}`} color="success" variant="outlined" />
              <Chip label={`Rechazadas: ${preview.document_counts.rejected}`} color="error" variant="outlined" />
              <Chip label={`Pendientes: ${preview.document_counts.pending}`} color="warning" variant="outlined" />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                <b>{preview.matched_docs_count}</b> con venta POS asociada
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <b>{preview.unmatched_docs_count}</b> sin venta (se crearán placeholders)
              </Typography>
            </Box>
          </Paper>

          {preview.sample_documents.length > 0 && (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Prefijo + Nº</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>CUFE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.sample_documents.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.prefix}-{d.number}</TableCell>
                      <TableCell>{labelForType(d.type_document_id)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={labelForState(d.state_document_id)} color={stateColor(d.state_document_id)} />
                      </TableCell>
                      <TableCell>{d.date_issue}</TableCell>
                      <TableCell align="right">${Math.round(d.total).toLocaleString('es-CO')}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {d.cufe ? d.cufe.slice(0, 24) + '…' : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Opciones de importación
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={overwriteConfig}
                onChange={(e) => setOverwriteConfig(e.target.checked)}
              />
            }
            label="Sobrescribir configuración DIAN existente"
          />
          <Tooltip title="Si ya hay datos en dian_configs sólo se completan los campos vacíos; al activar esto se reemplazan también los que ya tenían valor.">
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
              (?)
            </Typography>
          </Tooltip>
          <br />
          <FormControlLabel
            control={
              <Switch
                checked={importDocuments}
                onChange={(e) => setImportDocuments(e.target.checked)}
              />
            }
            label="Importar histórico de documentos (facturas / NC / ND)"
          />

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button onClick={() => setActiveStep(0)}>Volver</Button>
            <Button
              variant="contained"
              color="warning"
              startIcon={loading ? <CircularProgress size={16} /> : <PlayIcon />}
              onClick={handleImport}
              disabled={loading}
            >
              {loading ? 'Importando...' : 'Aplicar migración'}
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 3 — summary */}
      {activeStep === 2 && summary && (
        <Box>
          <Alert
            severity={summary.errors && summary.errors.length > 0 ? 'warning' : 'success'}
            icon={<CheckIcon />}
            sx={{ mb: 2 }}
          >
            <AlertTitle>Migración finalizada</AlertTitle>
            Empezó {new Date(summary.started_at).toLocaleString('es-CO')} · Terminó{' '}
            {new Date(summary.finished_at).toLocaleString('es-CO')}
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" color="primary">
                  {summary.invoices_upserted}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Facturas
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" color="primary">
                  {summary.credit_notes_upserted}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Notas crédito
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" color="primary">
                  {summary.debit_notes_upserted}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Notas débito
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" color="text.secondary">
                  {summary.skipped}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Saltadas
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Configuración DIAN: <b>{summary.config_imported ? 'importada' : 'no importada'}</b> ·
              Resoluciones: <b>{summary.resolutions_imported}</b> · Certificado:{' '}
              <b>{summary.certificate_imported ? 'sí' : 'no'}</b>
            </Typography>
          </Box>

          {summary.errors && summary.errors.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <AlertTitle>{summary.errors.length} error(es)</AlertTitle>
              <Box sx={{ maxHeight: 200, overflow: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
                {summary.errors.map((e, i) => (
                  <div key={i}>• {e}</div>
                ))}
              </Box>
            </Alert>
          )}
        </Box>
      )}

      {/* Independent section: backfill XML/PDF from apidian's storage/app
          folder. Decoupled from the SQL migration because customers often
          hand the folder over later. Safe to re-run with overwrite=false. */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Backfill de XML / PDF desde la carpeta <code>storage/app</code>
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        apidian guarda los XML y PDF en el filesystem (no en MySQL). Si tienes la carpeta{' '}
        <code>storage/app/</code> de la instalación origen, pega su ruta aquí — el sistema
        recorrerá <code>xml/</code> y <code>public/</code>, buscará la factura/NC/ND
        correspondiente por número y rellenará <code>xml_document</code> /{' '}
        <code>pdf_document</code>. Idempotente; sin sobrescribir por defecto.
      </Typography>
      <TextField
        fullWidth
        size="small"
        label="Ruta de la carpeta storage/app"
        placeholder="D:\\backup-apidian\\storage\\app"
        value={storagePath}
        onChange={(e) => setStoragePath(e.target.value)}
        sx={{ mb: 1 }}
      />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <Button
          startIcon={<UploadIcon />}
          variant="outlined"
          size="small"
          onClick={handlePickStorage}
          disabled={!wailsOpenDirDialog}
        >
          Seleccionar carpeta
        </Button>
        <FormControlLabel
          control={
            <Switch
              checked={backfillOverwrite}
              onChange={(e) => setBackfillOverwrite(e.target.checked)}
              size="small"
            />
          }
          label="Sobrescribir si ya hay contenido"
        />
        <FormControlLabel
          control={
            <Switch
              checked={backfillIncludeZip}
              onChange={(e) => setBackfillIncludeZip(e.target.checked)}
              size="small"
            />
          }
          label="Incluir .zip"
        />
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={backfillRunning ? <CircularProgress size={16} /> : <PlayIcon />}
          onClick={handleBackfill}
          disabled={backfillRunning || !storagePath.trim()}
        >
          {backfillRunning ? 'Procesando...' : 'Ejecutar backfill'}
        </Button>
      </Box>

      {backfillResult && (
        <Box sx={{ mt: 2 }}>
          <Alert
            severity={backfillResult.errors && backfillResult.errors.length > 0 ? 'warning' : 'success'}
            sx={{ mb: 1 }}
          >
            <AlertTitle>Backfill terminado</AlertTitle>
            {backfillResult.xmls_applied} XML asignados de {backfillResult.xmls_found} encontrados ·{' '}
            {backfillResult.pdfs_applied} PDF asignados de {backfillResult.pdfs_found} encontrados ·{' '}
            {backfillResult.skipped_no_match} sin match · {backfillResult.skipped_existing} omitidos por
            ya tener contenido
          </Alert>

          {backfillResult.examples && backfillResult.examples.length > 0 && (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 240 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Archivo</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Prefijo / Nº</TableCell>
                    <TableCell>Tabla</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backfillResult.examples.map((ex, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{ex.file}</TableCell>
                      <TableCell>{ex.kind.toUpperCase()}</TableCell>
                      <TableCell>
                        {ex.prefix}-{ex.number}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{ex.target_table}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ex.status}
                          color={
                            ex.status === 'applied'
                              ? 'success'
                              : ex.status === 'skipped_existing'
                              ? 'default'
                              : 'warning'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {backfillResult.errors && backfillResult.errors.length > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              <AlertTitle>{backfillResult.errors.length} error(es)</AlertTitle>
              <Box sx={{ maxHeight: 160, overflow: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
                {backfillResult.errors.map((e, i) => (
                  <div key={i}>• {e}</div>
                ))}
              </Box>
            </Alert>
          )}
        </Box>
      )}
    </Paper>
  );
};

function labelForType(t: number): string {
  switch (t) {
    case 1:
      return 'Factura';
    case 4:
    case 11:
      return 'NC';
    case 5:
    case 12:
      return 'ND';
    default:
      return `Tipo ${t}`;
  }
}

function labelForState(s: number): string {
  switch (s) {
    case 0:
      return 'Pendiente';
    case 1:
      return 'Enviada';
    case 2:
      return 'Aceptada';
    case 3:
      return 'Rechazada';
    default:
      return `Estado ${s}`;
  }
}

function stateColor(s: number): 'default' | 'success' | 'error' | 'warning' | 'primary' {
  switch (s) {
    case 2:
      return 'success';
    case 3:
      return 'error';
    case 0:
      return 'warning';
    default:
      return 'default';
  }
}

export default ApidianMigration;
