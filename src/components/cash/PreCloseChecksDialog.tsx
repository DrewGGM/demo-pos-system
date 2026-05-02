import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Stack,
  Alert,
  LinearProgress,
  Divider,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Receipt as ReceiptIcon,
  Cancel as CancelIcon,
  Refresh as RetryIcon,
  Restaurant as TableIcon,
  AssignmentTurnedIn as ResolvedIcon,
  ErrorOutline as ErrorIcon,
  ArrowForward as GoIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { GetPendingOrders, CancelOrder } from '../../../wailsjs/go/services/OrderService';
import { ResendElectronicInvoice } from '../../../wailsjs/go/services/SalesService';

interface PreCloseChecksDialogProps {
  open: boolean;
  onClose: () => void;
  onAllResolved: () => void; // Called when there is nothing left blocking — caller proceeds to the actual close dialog
  sessionStartDate: Date | null;
}

interface PendingOrderRow {
  id: number;
  order_number?: string;
  table_number?: number | string;
  total: number;
  status: string;
  created_at?: string;
}

interface FailedInvoiceRow {
  id: number;
  sale_number: string;
  total: number;
  invoice_number: string;
  invoice_status: string;
  last_error: string;
  created_at: string;
}

const PreCloseChecksDialog: React.FC<PreCloseChecksDialogProps> = ({
  open,
  onClose,
  onAllResolved,
  sessionStartDate,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<PendingOrderRow[]>([]);
  const [failedInvoices, setFailedInvoices] = useState<FailedInvoiceRow[]>([]);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [busyInvoiceId, setBusyInvoiceId] = useState<number | null>(null);
  const [retryAllInProgress, setRetryAllInProgress] = useState(false);

  const loadChecks = async () => {
    setLoading(true);
    try {
      const orders = await GetPendingOrders();
      const mapped: PendingOrderRow[] = (orders || []).map((o: any) => ({
        id: o.id,
        order_number: o.order_number || `#${o.id}`,
        table_number: o.table?.number,
        total: Number(o.total) || 0,
        status: o.status,
        created_at: o.created_at,
      }));
      setPendingOrders(mapped);
    } catch (e: any) {
      console.error('Error loading pending orders:', e);
      toast.error('No se pudieron cargar las órdenes pendientes');
    }

    try {
      const since = sessionStartDate ? sessionStartDate.toISOString() : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const fn = (window as any)?.go?.services?.SalesService?.GetFailedInvoicesSince;
      if (typeof fn === 'function') {
        const sales = await fn(since);
        const mapped: FailedInvoiceRow[] = (sales || []).map((s: any) => ({
          id: s.id,
          sale_number: s.sale_number || `#${s.id}`,
          total: Number(s.total) || 0,
          invoice_number: s.electronic_invoice?.invoice_number || '—',
          invoice_status: s.electronic_invoice?.status || 'unknown',
          last_error: s.electronic_invoice?.last_error || s.electronic_invoice?.validation_message || 'Error desconocido',
          created_at: s.created_at,
        }));
        setFailedInvoices(mapped);
      } else {
        setFailedInvoices([]);
      }
    } catch (e: any) {
      console.error('Error loading failed invoices:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) loadChecks();
  }, [open]);

  const handleProcessOrder = (orderId: number) => {
    onClose();
    navigate(`/pos?order=${orderId}`);
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm('¿Cancelar esta orden? Esta acción no se puede deshacer.')) return;
    setBusyOrderId(orderId);
    try {
      await CancelOrder(orderId, 'Cancelada al cierre de caja');
      toast.success('Orden cancelada');
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (e: any) {
      toast.error('Error al cancelar: ' + (e?.message || e));
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleRetryInvoice = async (saleId: number) => {
    setBusyInvoiceId(saleId);
    try {
      await ResendElectronicInvoice(saleId);
      toast.success('Factura reenviada correctamente');
      setFailedInvoices((prev) => prev.filter((f) => f.id !== saleId));
    } catch (e: any) {
      toast.error('Error al reenviar: ' + (e?.message || e));
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const handleRetryAll = async () => {
    if (failedInvoices.length === 0) return;
    if (!window.confirm(`¿Reenviar ${failedInvoices.length} facturas fallidas? Se reintentará una por una.`)) return;
    setRetryAllInProgress(true);
    let ok = 0;
    let fail = 0;
    const remaining: FailedInvoiceRow[] = [];
    for (const inv of failedInvoices) {
      try {
        await ResendElectronicInvoice(inv.id);
        ok++;
      } catch (e: any) {
        console.error(`Retry failed for sale ${inv.id}:`, e);
        fail++;
        remaining.push(inv);
      }
    }
    setFailedInvoices(remaining);
    setRetryAllInProgress(false);
    if (fail === 0) toast.success(`${ok} facturas reenviadas correctamente`);
    else toast.warning(`${ok} reenviadas, ${fail} aún fallan — revisa los detalles`);
  };

  const totalIssues = pendingOrders.length + failedInvoices.length;
  const allClear = !loading && totalIssues === 0;

  const fmtCOP = (n: number) =>
    n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {allClear ? (
          <ResolvedIcon color="success" />
        ) : (
          <WarningIcon color="warning" />
        )}
        Verificación previa al cierre de caja
      </DialogTitle>

      <DialogContent dividers>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {!loading && allClear && (
          <Alert severity="success">
            <strong>Todo listo.</strong> No hay órdenes pendientes ni facturas electrónicas
            fallidas en esta sesión. Puedes cerrar caja con seguridad.
          </Alert>
        )}

        {!loading && !allClear && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Hay {totalIssues} pendiente{totalIssues === 1 ? '' : 's'} antes de cerrar la caja.
            Resuelve los items abajo para continuar.
          </Alert>
        )}

        {/* Pending Orders */}
        {pendingOrders.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <ReceiptIcon color="warning" />
              <Typography variant="subtitle1" fontWeight={700}>
                Órdenes pendientes ({pendingOrders.length})
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Estas órdenes no han sido cobradas. Procésalas en el POS o cancélalas antes de cerrar.
            </Typography>
            <List dense disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {pendingOrders.map((o, i) => (
                <React.Fragment key={o.id}>
                  {i > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography fontWeight={600}>{o.order_number}</Typography>
                          {o.table_number !== undefined && o.table_number !== null && (
                            <Chip
                              icon={<TableIcon sx={{ fontSize: 14 }} />}
                              label={`Mesa ${o.table_number}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          <Chip label={o.status} size="small" color="warning" />
                          <Typography variant="body2" color="primary" fontWeight={600}>
                            {fmtCOP(o.total)}
                          </Typography>
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Procesar en POS">
                        <span>
                          <IconButton
                            edge="end"
                            color="primary"
                            onClick={() => handleProcessOrder(o.id)}
                            disabled={busyOrderId === o.id}
                          >
                            <GoIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Cancelar orden">
                        <span>
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() => handleCancelOrder(o.id)}
                            disabled={busyOrderId === o.id}
                          >
                            {busyOrderId === o.id ? <CircularProgress size={18} /> : <CancelIcon />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}

        {/* Failed DIAN invoices */}
        {failedInvoices.length > 0 && (
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <ErrorIcon color="error" />
              <Typography variant="subtitle1" fontWeight={700}>
                Facturas electrónicas fallidas ({failedInvoices.length})
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                size="small"
                variant="contained"
                startIcon={retryAllInProgress ? <CircularProgress size={14} color="inherit" /> : <RetryIcon />}
                onClick={handleRetryAll}
                disabled={retryAllInProgress}
              >
                Reenviar todas
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Estas ventas no se sincronizaron con DIAN. Reintenta el envío individualmente o todas a la vez.
            </Typography>
            <List dense disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {failedInvoices.map((inv, i) => (
                <React.Fragment key={inv.id}>
                  {i > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography fontWeight={600}>{inv.sale_number}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {inv.invoice_number}
                          </Typography>
                          <Chip label={inv.invoice_status} size="small" color="error" />
                          <Typography variant="body2" color="primary" fontWeight={600}>
                            {fmtCOP(inv.total)}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                          {inv.last_error}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Reenviar a DIAN">
                        <span>
                          <IconButton
                            edge="end"
                            color="primary"
                            onClick={() => handleRetryInvoice(inv.id)}
                            disabled={busyInvoiceId === inv.id || retryAllInProgress}
                          >
                            {busyInvoiceId === inv.id ? <CircularProgress size={18} /> : <RetryIcon />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={loadChecks} startIcon={<RetryIcon />} disabled={loading || retryAllInProgress}>
          Revisar de nuevo
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} disabled={retryAllInProgress}>
          Cancelar
        </Button>
        <Button
          onClick={onAllResolved}
          variant="contained"
          color={allClear ? 'success' : 'warning'}
          disabled={retryAllInProgress || loading}
        >
          {allClear ? 'Continuar al cierre' : 'Cerrar de todas formas'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PreCloseChecksDialog;
