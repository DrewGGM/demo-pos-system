import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  TextField,
  Button,
  Divider,
  Alert,
  Chip,
  CircularProgress,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  FormControlLabel,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  alpha,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Phone as PhoneIcon,
  Link as LinkIcon,
  Sync as SyncIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { wailsBoldService } from '../../services/wailsBoldService';
import { wailsSalesService } from '../../services/wailsSalesService';
import { models } from '../../../wailsjs/go/models';
import { PaymentMethod } from '../../types/models';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`bold-tabpanel-${index}`}
      aria-labelledby={`bold-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const BoldSettings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<models.BoldConfig | null>(null);
  const [terminals, setTerminals] = useState<models.BoldTerminal[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<models.BoldPaymentMethod[]>([]);
  const [posPaymentMethods, setPosPaymentMethods] = useState<PaymentMethod[]>([]);
  const [webhooks, setWebhooks] = useState<models.BoldPendingPayment[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<models.BoldWebhookLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [selectedLog, setSelectedLog] = useState<models.BoldWebhookLog | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const boldConfig = await wailsBoldService.getBoldConfig();
      setConfig(boldConfig);

      if (boldConfig.enabled) {
        const terminalsList = await wailsBoldService.getAllTerminals();
        setTerminals(terminalsList);
      }

      await loadPosPaymentMethods();
    } catch (error) {
      console.error('Error loading Bold config:', error);
      toast.error('Error al cargar la configuración de Bold');
    } finally {
      setLoading(false);
    }
  };

  const loadPosPaymentMethods = async () => {
    try {
      const methods = await wailsSalesService.GetPaymentMethods();
      setPosPaymentMethods(methods);
    } catch (error) {
      console.error('Error loading POS payment methods:', error);
      toast.error('Error al cargar los métodos de pago');
    }
  };

  const loadWebhooks = async () => {
    try {
      setLoadingWebhooks(true);
      const logs = await wailsBoldService.getWebhookLogs(50);
      setWebhookLogs(logs);

      const recentWebhooks = await wailsBoldService.getRecentWebhooks(50);
      setWebhooks(recentWebhooks);
    } catch (error) {
      console.error('Error loading webhooks:', error);
      toast.error('Error al cargar los webhooks');
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      await wailsBoldService.updateBoldConfig(config);
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const success = await wailsBoldService.testConnection();

      if (success) {
        toast.success('Conexión exitosa con Bold API');

          const methods = await wailsBoldService.getPaymentMethods();
        setPaymentMethods(methods);
      } else {
        toast.error('Error al conectar con Bold API');
      }
    } catch (error: any) {
      console.error('Error testing connection:', error);
      toast.error(error?.message || 'Error al probar la conexión');
    } finally {
      setTesting(false);
    }
  };

  const handleSyncTerminals = async () => {
    try {
      setSyncing(true);
      await wailsBoldService.syncTerminals();
      toast.success('Terminales sincronizados exitosamente');

      const terminalsList = await wailsBoldService.getAllTerminals();
      setTerminals(terminalsList);
    } catch (error: any) {
      console.error('Error syncing terminals:', error);
      toast.error(error?.message || 'Error al sincronizar terminales');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleTerminal = async (terminal: models.BoldTerminal) => {
    try {
      const updated = models.BoldTerminal.createFrom({ ...terminal, is_active: !terminal.is_active });
      await wailsBoldService.updateTerminal(updated);
      toast.success(`Terminal ${updated.is_active ? 'activado' : 'desactivado'}`);

      setTerminals(terminals.map(t => t.id === terminal.id ? updated : t));
    } catch (error) {
      console.error('Error updating terminal:', error);
      toast.error('Error al actualizar terminal');
    }
  };

  const handleSetDefaultTerminal = async (terminal: models.BoldTerminal) => {
    try {
      const updates = terminals.map(async t => {
        if (t.id === terminal.id) {
          await wailsBoldService.updateTerminal(models.BoldTerminal.createFrom({ ...t, is_default: true }));
        } else if (t.is_default) {
          await wailsBoldService.updateTerminal(models.BoldTerminal.createFrom({ ...t, is_default: false }));
        }
      });

      await Promise.all(updates);

      if (config) {
        await wailsBoldService.updateBoldConfig({
          ...config,
          default_terminal_model: terminal.terminal_model,
          default_terminal_serial: terminal.terminal_serial,
        });
      }

      toast.success('Terminal por defecto actualizado');

      await loadConfig();
    } catch (error) {
      console.error('Error setting default terminal:', error);
      toast.error('Error al establecer terminal por defecto');
    }
  };

  const handleToggleBoldForPaymentMethod = async (paymentMethod: PaymentMethod) => {
    try {
      const updated: PaymentMethod = {
        ...paymentMethod,
        use_bold_terminal: !paymentMethod.use_bold_terminal,
        bold_payment_method: !paymentMethod.use_bold_terminal
          ? (paymentMethod.type === 'card' ? 'POS' : '')
          : paymentMethod.bold_payment_method
      };

      await wailsSalesService.UpdatePaymentMethod(updated);

      setPosPaymentMethods(prev =>
        prev.map(pm => pm.id === paymentMethod.id ? updated : pm)
      );

      toast.success(`Bold ${updated.use_bold_terminal ? 'habilitado' : 'deshabilitado'} para ${paymentMethod.name}`);
    } catch (error) {
      console.error('Error toggling Bold for payment method:', error);
      toast.error('Error al actualizar el método de pago');
    }
  };

  const handleChangeBoldPaymentMethod = async (paymentMethod: PaymentMethod, boldMethod: string) => {
    try {
      const updated: PaymentMethod = {
        ...paymentMethod,
        bold_payment_method: boldMethod
      };

      await wailsSalesService.UpdatePaymentMethod(updated);

      setPosPaymentMethods(prev =>
        prev.map(pm => pm.id === paymentMethod.id ? updated : pm)
      );

      toast.success('Método de pago Bold actualizado');
    } catch (error) {
      console.error('Error updating Bold payment method:', error);
      toast.error('Error al actualizar el método de pago');
    }
  };

  if (loading || !config) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CreditCardIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" fontWeight="600">
                Integración Bold
              </Typography>
              <Chip
                label="En Desarrollo"
                size="small"
                color="warning"
                icon={<span style={{ fontSize: '0.8rem', marginLeft: 4 }}>🚧</span>}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Configura la integración con datáfonos Bold para procesar pagos
            </Typography>
          </Box>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={config.enabled}
              onChange={(e) => setConfig(models.BoldConfig.createFrom({ ...config, enabled: e.target.checked }))}
              color="primary"
            />
          }
          label={config.enabled ? 'Habilitado' : 'Deshabilitado'}
        />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => {
          setTabValue(newValue);
          if (newValue === 3) {
            loadWebhooks();
          }
        }}>
          <Tab label="Configuración General" />
          <Tab label="Terminales" disabled={!config.enabled} />
          <Tab label="Métodos de Pago" disabled={!config.enabled} />
          <Tab label="Historial de Webhooks" disabled={!config.enabled} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configuración de API
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              Para obtener tus llaves de API, ingresa a{' '}
              <a href="https://panel.bold.co" target="_blank" rel="noopener noreferrer">
                panel.bold.co
              </a>{' '}
              → Integraciones → API
            </Alert>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Ambiente</InputLabel>
              <Select
                value={config.environment}
                label="Ambiente"
                onChange={(e) => setConfig(models.BoldConfig.createFrom({ ...config, environment: e.target.value as 'test' | 'production' }))}
              >
                <MenuItem value="test">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    🧪 Pruebas (Sandbox)
                  </Box>
                </MenuItem>
                <MenuItem value="production">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    ✅ Producción
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="API Key - Pruebas"
              value={config.api_key_test}
              onChange={(e) => setConfig(models.BoldConfig.createFrom({ ...config, api_key_test: e.target.value }))}
              type="password"
              sx={{ mb: 2 }}
              helperText="Llave para ambiente de pruebas (Sandbox)"
            />

            <TextField
              fullWidth
              label="API Key - Producción"
              value={config.api_key_production}
              onChange={(e) => setConfig(models.BoldConfig.createFrom({ ...config, api_key_production: e.target.value }))}
              type="password"
              sx={{ mb: 2 }}
              helperText="Llave para ambiente de producción"
            />

            <TextField
              fullWidth
              label="URL Base de API"
              value={config.base_url}
              onChange={(e) => setConfig(models.BoldConfig.createFrom({ ...config, base_url: e.target.value }))}
              sx={{ mb: 2 }}
              helperText="URL base para las peticiones a Bold API"
            />

            <TextField
              fullWidth
              label="Email del Vendedor"
              value={config.user_email}
              onChange={(e) => setConfig(models.BoldConfig.createFrom({ ...config, user_email: e.target.value }))}
              type="email"
              sx={{ mb: 3 }}
              helperText="Email de la persona que realiza las ventas"
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Configuración de Webhook
            </Typography>

            <TextField
              fullWidth
              label="URL Webhook - Producción"
              value={config.webhook_url || ''}
              onChange={(e) => setConfig(models.BoldConfig.createFrom({ ...config, webhook_url: e.target.value }))}
              sx={{ mb: 2 }}
              helperText="URL para recibir notificaciones en producción"
            />

            <TextField
              fullWidth
              label="URL Webhook - Sandbox"
              value={config.webhook_url_sandbox || ''}
              onChange={(e) => setConfig(models.BoldConfig.createFrom({ ...config, webhook_url_sandbox: e.target.value }))}
              sx={{ mb: 2 }}
              helperText="URL para recibir notificaciones en pruebas"
            />

            <TextField
              fullWidth
              label="Secret de Webhook - Producción"
              value={config.webhook_secret || ''}
              onChange={(e) => setConfig(models.BoldConfig.createFrom({ ...config, webhook_secret: e.target.value }))}
              type="password"
              sx={{ mb: 2 }}
              helperText="Secreto para validar las notificaciones del webhook en producción"
            />

            <TextField
              fullWidth
              label="Secret de Webhook - Sandbox"
              value={config.webhook_secret_sandbox || ''}
              onChange={(e) => setConfig(models.BoldConfig.createFrom({ ...config, webhook_secret_sandbox: e.target.value }))}
              type="password"
              sx={{ mb: 3 }}
              helperText="Secreto para validar las notificaciones del webhook en ambiente de pruebas"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !config.enabled}
                startIcon={saving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              >
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>

              <Button
                variant="outlined"
                onClick={handleTestConnection}
                disabled={testing || !config.enabled}
                startIcon={testing ? <CircularProgress size={20} /> : <VerifiedUserIcon />}
              >
                {testing ? 'Probando...' : 'Probar Conexión'}
              </Button>
            </Box>

            {config.last_sync_at && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Última sincronización: {new Date(config.last_sync_at as any).toLocaleString()}
                </Typography>
                {config.last_sync_status === 'success' && (
                  <Chip
                    label="Conectado"
                    size="small"
                    color="success"
                    icon={<CheckCircleIcon />}
                    sx={{ ml: 2 }}
                  />
                )}
                {config.last_sync_status === 'error' && (
                  <Chip
                    label="Error"
                    size="small"
                    color="error"
                    icon={<ErrorIcon />}
                    sx={{ ml: 2 }}
                  />
                )}
              </Box>
            )}

            {config.total_payments > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total de pagos procesados: <strong>{config.total_payments}</strong>
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Terminales (Datáfonos)
              </Typography>

              <Button
                variant="outlined"
                startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
                onClick={handleSyncTerminals}
                disabled={syncing}
              >
                {syncing ? 'Sincronizando...' : 'Sincronizar desde Bold'}
              </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              Asegúrate de habilitar los terminales en la app Bold: Mi perfil → Preferencias de cobro → Conexiones API
            </Alert>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Modelo</TableCell>
                    <TableCell>Serial</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Activo</TableCell>
                    <TableCell>Por Defecto</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {terminals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                          No hay terminales configurados. Haz clic en "Sincronizar desde Bold" para cargar tus datáfonos.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    terminals.map((terminal) => (
                      <TableRow key={terminal.id}>
                        <TableCell>{terminal.name}</TableCell>
                        <TableCell>{terminal.terminal_model}</TableCell>
                        <TableCell>{terminal.terminal_serial}</TableCell>
                        <TableCell>
                          <Chip
                            label={terminal.status}
                            size="small"
                            color={terminal.status === 'BINDED' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={terminal.is_active}
                            onChange={() => handleToggleTerminal(terminal)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {terminal.is_default ? (
                            <Chip label="Por defecto" size="small" color="primary" />
                          ) : (
                            <Button
                              size="small"
                              onClick={() => handleSetDefaultTerminal(terminal)}
                            >
                              Establecer
                            </Button>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              onClick={() => {
                                // TODO: Implement delete confirmation
                                console.log('Delete terminal', terminal.id);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configurar Métodos de Pago con Bold
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              Configura qué métodos de pago de tu POS deben procesarse a través del datáfono Bold.
            </Alert>

            {posPaymentMethods.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No hay métodos de pago configurados en el POS
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {posPaymentMethods.map((method) => (
                  <Card key={method.id} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {method.type === 'cash' && <CreditCardIcon />}
                          {method.type === 'card' && <CreditCardIcon />}
                          {method.type === 'digital' && <PhoneIcon />}
                          {method.type === 'other' && <PhoneIcon />}
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {method.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Tipo: {method.type}
                            </Typography>
                          </Box>
                        </Box>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={method.use_bold_terminal || false}
                              onChange={() => handleToggleBoldForPaymentMethod(method)}
                              color="primary"
                            />
                          }
                          label="Usar Bold"
                        />
                      </Box>

                      {method.use_bold_terminal && (
                        <Box sx={{ mt: 2, pl: 7 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Método de Pago Bold</InputLabel>
                            <Select
                              value={method.bold_payment_method || ''}
                              label="Método de Pago Bold"
                              onChange={(e) => handleChangeBoldPaymentMethod(method, e.target.value)}
                            >
                              <MenuItem value="POS">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <CreditCardIcon fontSize="small" />
                                  POS - Tarjetas de crédito/débito
                                </Box>
                              </MenuItem>
                              <MenuItem value="NEQUI">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <PhoneIcon fontSize="small" />
                                  NEQUI - Pagos con Nequi
                                </Box>
                              </MenuItem>
                              <MenuItem value="DAVIPLATA">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <PhoneIcon fontSize="small" />
                                  DAVIPLATA - Pagos con Daviplata
                                </Box>
                              </MenuItem>
                              <MenuItem value="PAY_BY_LINK">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinkIcon fontSize="small" />
                                  PAY_BY_LINK - Link de pago
                                </Box>
                              </MenuItem>
                            </Select>
                          </FormControl>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Cuando un cliente pague con "{method.name}", se enviará al datáfono Bold como tipo "{method.bold_payment_method || 'No configurado'}"
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Logs de Depuración de Webhooks
              </Typography>

              <Button
                variant="outlined"
                startIcon={loadingWebhooks ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={loadWebhooks}
                disabled={loadingWebhooks}
              >
                {loadingWebhooks ? 'Cargando...' : 'Actualizar'}
              </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              Aquí puedes ver TODOS los intentos de webhook recibidos, incluyendo los que fallaron.
              Haz clic en una fila para ver el cuerpo completo del request, headers y errores.
            </Alert>

            {loadingWebhooks && webhookLogs.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha/Hora</TableCell>
                        <TableCell>Estado Procesamiento</TableCell>
                        <TableCell>Método</TableCell>
                        <TableCell>Origen</TableCell>
                        <TableCell>Firma</TableCell>
                        <TableCell>Detalles</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {webhookLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                              No se han recibido webhooks aún. Las notificaciones aparecerán aquí cuando Bold envíe requests.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        webhookLogs.map((log) => (
                          <TableRow
                            key={log.id}
                            hover
                            onClick={() => setSelectedLog(log)}
                            sx={{
                              cursor: 'pointer',
                              backgroundColor: log.process_status === 'success'
                                ? alpha('#4caf50', 0.08)
                                : log.process_status.startsWith('failed')
                                ? alpha('#f44336', 0.08)
                                : 'transparent'
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontSize="0.75rem">
                                {new Date(log.created_at as any).toLocaleString('es-CO', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={log.process_status}
                                size="small"
                                color={log.process_status === 'success' ? 'success' : 'error'}
                                icon={log.process_status === 'success' ? <CheckCircleIcon /> : <ErrorIcon />}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontSize="0.75rem">{log.method}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontSize="0.75rem" fontFamily="monospace">
                                {log.remote_addr}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontSize="0.75rem" fontFamily="monospace">
                                {log.signature ? '✓ Sí' : '✗ No'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Button size="small" variant="text">Ver detalles</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {selectedLog && (
                  <Card sx={{ mb: 2, border: '2px solid', borderColor: 'primary.main' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Detalles del Webhook #{selectedLog.id}</Typography>
                        <Button size="small" onClick={() => setSelectedLog(null)}>Cerrar</Button>
                      </Box>

                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Estado:</Typography>
                          <Typography variant="body2" fontWeight={600}>{selectedLog.process_status}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Método:</Typography>
                          <Typography variant="body2">{selectedLog.method}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">IP Origen:</Typography>
                          <Typography variant="body2" fontFamily="monospace">{selectedLog.remote_addr}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Content-Type:</Typography>
                          <Typography variant="body2" fontFamily="monospace">{selectedLog.content_type || 'N/A'}</Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      {selectedLog.error_message && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          <Typography variant="subtitle2">Error:</Typography>
                          <Typography variant="body2">{selectedLog.error_message}</Typography>
                        </Alert>
                      )}

                      <Typography variant="subtitle2" gutterBottom>Headers recibidos:</Typography>
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, overflow: 'auto', maxHeight: 200 }}>
                        <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                          {JSON.stringify(JSON.parse(selectedLog.headers || '{}'), null, 2)}
                        </pre>
                      </Box>

                      <Typography variant="subtitle2" gutterBottom>Cuerpo del request (Raw Body):</Typography>
                      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, overflow: 'auto', maxHeight: 300 }}>
                        <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {selectedLog.raw_body || 'Vacío'}
                        </pre>
                      </Box>

                      {selectedLog.signature && (
                        <>
                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Firma (x-bold-signature):</Typography>
                          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, overflow: 'auto' }}>
                            <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                              {selectedLog.signature}
                            </Typography>
                          </Box>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {webhookLogs.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Mostrando {webhookLogs.length} intentos de webhook más recientes
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
};

export default BoldSettings;
