import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Menu,
  MenuItem,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  DateRange as DateRangeIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  ShoppingCart as ShoppingIcon,
  People as PeopleIcon,
  MoreVert as MoreIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import {
  fetchTodaySales,
  fetchSalesHistory,
  refundSale,
} from '../../store/slices/salesSlice';
import { Sale } from '../../types/models';
import { wailsSalesService } from '../../services/wailsSalesService';
import { wailsDianService } from '../../services/wailsDianService';
import { useAuth, useDIANMode } from '../../hooks';
import { toast } from 'react-toastify';
import { GetRestaurantConfig } from '../../../wailsjs/go/services/ConfigService';

const Sales: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const { isDIANMode } = useDIANMode();
  const {
    todaySales,
    sales,
    salesTotalCount,
    loading,
    dailyStats,
  } = useSelector((state: RootState) => state.sales);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [refundDialog, setRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [companyLiabilityId, setCompanyLiabilityId] = useState<number | null>(null);
  const [dianResponseDialog, setDianResponseDialog] = useState(false);
  const [selectedDianResponse, setSelectedDianResponse] = useState<string>('');
  const [selectedElectronicInvoice, setSelectedElectronicInvoice] = useState<any>(null);
  const [dianTab, setDianTab] = useState(0);
  const [voucherImageDialog, setVoucherImageDialog] = useState(false);
  const [selectedVoucherImage, setSelectedVoucherImage] = useState<string>('');
  const [editCustomerDialog, setEditCustomerDialog] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchTodaySales());
    loadCompanyConfig();
  }, [dispatch]);

  // Re-fetch when pagination, dates, or search change
  useEffect(() => {
    loadSalesHistory();
  }, [page, rowsPerPage, startDate, endDate]);

  const loadCompanyConfig = async () => {
    try {
      const config = await GetRestaurantConfig();
      if (config) {
        setCompanyLiabilityId(config.type_liability_id || null);
      }
    } catch (error) {
    }
  };

  const loadSalesHistory = async () => {
    const start = startDate ? startDate.toISOString() : '';
    const end = endDate ? new Date(endDate.getTime() + 86400000).toISOString() : ''; // end of day
    dispatch(fetchSalesHistory({
      limit: rowsPerPage,
      offset: page * rowsPerPage,
      startDate: start,
      endDate: end,
      search: searchQuery || undefined,
    }));
  };

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailDialog(true);
  };

  const handlePrintReceipt = async (sale: Sale) => {
    try {
      if (sale.id) {
        await wailsSalesService.printReceipt(sale.id);
        toast.success('Recibo enviado a imprimir');
      }
    } catch (error) {
      toast.error('Error al imprimir recibo');
    }
  };

  const handlePrintInvoice = async (sale: Sale) => {
    try {
      if (sale.id) {
        await wailsSalesService.printInvoice(sale.id);
        toast.success('Factura enviada a imprimir');
      }
    } catch (error) {
      toast.error('Error al imprimir factura');
    }
  };

  const handleSendElectronicInvoice = async (sale: Sale) => {
    try {
      if (!sale.id) {
        toast.error('Venta inválida');
        return;
      }

      if (!sale.needs_electronic_invoice) {
        toast.warning('Esta venta no requiere factura electrónica');
        return;
      }

      if (sale.electronic_invoice?.status === 'sent' || sale.electronic_invoice?.status === 'accepted') {
        toast.info('La factura electrónica ya fue enviada');
        return;
      }

      // Close dialog if open to show fresh data after refresh
      setDianResponseDialog(false);

      toast.info('Reenviando factura electrónica a DIAN...');
      await wailsSalesService.resendElectronicInvoice(sale.id);
      toast.success('Factura electrónica reenviada exitosamente');
      loadSalesHistory();
    } catch (error: any) {
      toast.error(error?.message || 'Error al enviar factura electrónica');
      loadSalesHistory(); // Refresh to show updated data even on error
    }
  };

  const handleOpenRefundDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setRefundAmount(sale.total);
    setRefundReason('');
    setRefundDialog(true);
    handleMenuClose();
  };

  const handleRefund = async () => {
    if (!selectedSale || !refundReason || !user) {
      toast.error('Complete todos los campos');
      return;
    }

    try {
      await dispatch(refundSale({
        saleId: selectedSale.id!,
        amount: refundAmount,
        reason: refundReason,
        employeeId: user.id!,
      })).unwrap();
      toast.success('Reembolso procesado');
      setRefundDialog(false);
      loadSalesHistory();
    } catch (error) {
      toast.error('Error al procesar reembolso');
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (!window.confirm('¿Está seguro de eliminar esta venta? Esta acción no se puede deshacer y eliminará toda la información relacionada (orden, items, pagos, factura electrónica).')) {
      return;
    }

    if (!user) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      await wailsSalesService.deleteSale(sale.id!, user.id!);
      toast.success('Venta eliminada correctamente');
      handleMenuClose();
      loadSalesHistory();
    } catch (error: any) {
      toast.error(error?.message || 'Error al eliminar venta');
    }
  };

  const handleExportReport = async () => {
    try {
      if (!filteredSales.length) {
        toast.warning('No hay ventas para exportar');
        return;
      }

      const headers = ['Venta #', 'Fecha', 'Cliente', 'Empleado', 'Tipo Factura', 'Método Pago', 'Subtotal', 'IVA', 'Descuento', 'Total'];
      const rows = filteredSales.map((s: any) => [
        s.sale_number || '',
        s.created_at ? new Date(s.created_at).toLocaleString('es-CO') : '',
        s.customer?.name || 'Consumidor Final',
        s.employee?.name || '',
        s.invoice_type === 'electronic' ? 'Electrónica' : 'Física',
        s.payment_details?.map((p: any) => p.payment_method?.name).join(', ') || '',
        s.subtotal || 0,
        s.tax || 0,
        s.discount || 0,
        s.total || 0,
      ]);

      const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `ventas-${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Ventas exportadas');
    } catch (error) {
      toast.error('Error al exportar');
    }
  };

  const handleResendInvoice = async (sale: Sale) => {
    try {
      if (sale.id) {
        toast.info('Reenviando factura electrónica a DIAN...');
        await wailsSalesService.resendElectronicInvoice(sale.id);
        toast.success('Factura electrónica reenviada exitosamente');
        loadSalesHistory();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Error al reenviar factura');
      loadSalesHistory(); // Refresh to show updated data even on error
    }
    handleMenuClose();
  };

  const handleResendEmail = async (sale: Sale) => {
    try {
      if (!sale.electronic_invoice?.prefix || !sale.electronic_invoice?.invoice_number) {
        toast.error('Esta venta no tiene factura electrónica válida');
        return;
      }
      toast.info('Reenviando email al cliente...');
      await wailsDianService.resendInvoiceEmail(
        sale.electronic_invoice.prefix,
        sale.electronic_invoice.invoice_number
      );
      toast.success('Email reenviado exitosamente');
    } catch (error: any) {
      toast.error(error?.message || 'Error al reenviar email');
    }
    handleMenuClose();
  };

  const handleConvertToElectronicInvoice = async (sale: Sale) => {
    try {
      if (!sale.id) {
        toast.error('Venta inválida');
        return;
      }
      toast.info('Convirtiendo a factura electrónica y enviando a DIAN...');
      await wailsSalesService.convertToElectronicInvoice(sale.id);
      toast.success('Factura electrónica enviada exitosamente');
      loadSalesHistory();
    } catch (error: any) {
      toast.error(error?.message || 'Error al convertir a factura electrónica');
      loadSalesHistory(); // Refresh to show updated data even on error
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, sale: Sale) => {
    setAnchorEl(event.currentTarget);
    setSelectedSale(sale);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewVoucher = (voucherImage: string) => {
    setSelectedVoucherImage(voucherImage);
    setVoucherImageDialog(true);
  };

  const handleDownloadVoucher = (voucherImage: string, saleNumber: string, paymentIndex: number) => {
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = voucherImage;
    link.download = `comprobante_${saleNumber}_pago${paymentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Comprobante descargado');
  };

  const handleOpenEditCustomerDialog = async (sale: Sale) => {
    // Check if electronic invoice is processed
    if (sale.electronic_invoice) {
      const status = sale.electronic_invoice.status;
      if (status === 'sent' || status === 'validating' || status === 'accepted') {
        toast.error('No se puede editar el cliente: la factura electrónica ya ha sido procesada');
        handleMenuClose();
        return;
      }
    }

    setSelectedSale(sale);
    setSelectedCustomerId(sale.customer_id || null);
    setCustomerSearchQuery('');

    // Load all customers
    try {
      const customers = await wailsSalesService.getCustomers();
      setAvailableCustomers(customers);
    } catch (error) {
      toast.error('Error al cargar clientes');
    }

    setEditCustomerDialog(true);
    handleMenuClose();
  };

  const handleUpdateCustomer = async () => {
    if (!selectedSale || !selectedCustomerId) {
      toast.error('Seleccione un cliente');
      return;
    }

    try {
      await wailsSalesService.updateSaleCustomer(selectedSale.id!, selectedCustomerId);
      toast.success('Cliente actualizado correctamente');
      setEditCustomerDialog(false);
      loadSalesHistory();
    } catch (error: any) {
      toast.error(error?.message || 'Error al actualizar cliente');
    }
  };

  // Backend handles date/search filtering; only DIAN mode filter applied client-side
  const filteredSales = isDIANMode
    ? sales.filter(sale => sale.needs_electronic_invoice)
    : sales;

  // Estadísticas filtradas para modo DIAN
  const filteredTodaySales = isDIANMode
    ? todaySales.filter(sale => sale.needs_electronic_invoice)
    : todaySales;

  const displayStats = isDIANMode
    ? {
        totalSales: filteredTodaySales.length,
        totalAmount: filteredTodaySales.reduce((sum, sale) => sum + sale.total, 0),
        averageSale: filteredTodaySales.length > 0
          ? filteredTodaySales.reduce((sum, sale) => sum + sale.total, 0) / filteredTodaySales.length
          : 0,
      }
    : dailyStats;

  const getPaymentMethodChip = (method: string) => {
    const colors: any = {
      cash: 'success',
      card: 'primary',
      transfer: 'info',
    };
    return (
      <Chip
        size="small"
        label={method}
        color={colors[method] || 'default'}
      />
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Ventas</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportReport}
          >
            Exportar
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Ventas Hoy
                  </Typography>
                  <Typography variant="h4">
                    {displayStats.totalSales}
                  </Typography>
                </Box>
                <ShoppingIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Hoy
                  </Typography>
                  <Typography variant="h4">
                    ${displayStats.totalAmount.toLocaleString('es-CO')}
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Ticket Promedio
                  </Typography>
                  <Typography variant="h4">
                    ${displayStats.averageSale.toLocaleString('es-CO')}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Clientes
                  </Typography>
                  <Typography variant="h4">
                    {new Set(filteredTodaySales.map(s => s.customer?.id)).size}
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Buscar por factura, cliente o NIT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); loadSalesHistory(); } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setSearchQuery(''); setPage(0); setTimeout(loadSalesHistory, 0); }}>
                      <span style={{ fontSize: '1.2rem' }}>×</span>
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Desde"
                value={startDate}
                onChange={setStartDate}
                slotProps={{
                  textField: { fullWidth: true },
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Hasta"
                value={endDate}
                onChange={setEndDate}
                slotProps={{
                  textField: { fullWidth: true },
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<DateRangeIcon />}
              onClick={loadSalesHistory}
            >
              Filtrar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Sales Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Factura</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Método</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>FE DIAN</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {sale.sale_number || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {sale.created_at ? format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell>{sale.customer?.name || 'Consumidor Final'}</TableCell>
                    <TableCell>
                      {sale.order?.order_type ? (
                        <Chip
                          size="small"
                          label={sale.order.order_type.name}
                          color={
                            sale.order.order_type.code === 'dine-in'
                              ? 'primary'
                              : sale.order.order_type.code === 'delivery'
                              ? 'warning'
                              : 'secondary'
                          }
                          sx={{
                            backgroundColor: sale.order.order_type.display_color || undefined
                          }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>{sale.order?.items?.length || 0}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        ${sale.total.toLocaleString('es-CO')}
                      </Typography>
                    </TableCell>
                    <TableCell>{getPaymentMethodChip(sale.payment_details?.[0]?.payment_method?.name || 'cash')}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={sale.status}
                        color={sale.status === 'completed' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      {sale.needs_electronic_invoice ? (
                        sale.electronic_invoice ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {/* Envío Status */}
                              {sale.electronic_invoice.status === 'accepted' ? (
                                <Chip
                                  size="small"
                                  icon={<CheckCircleIcon />}
                                  label="Aceptada"
                                  color="success"
                                />
                              ) : sale.electronic_invoice.status === 'sent' ? (
                                <Chip
                                  size="small"
                                  icon={<CheckCircleIcon />}
                                  label="Enviada"
                                  color="success"
                                />
                              ) : sale.electronic_invoice.status === 'validating' ? (
                                <Chip
                                  size="small"
                                  icon={<PendingIcon />}
                                  label="Validando..."
                                  color="warning"
                                />
                              ) : sale.electronic_invoice.status === 'error' || sale.electronic_invoice.status === 'rejected' ? (
                                <>
                                  <Chip
                                    size="small"
                                    icon={<ErrorIcon />}
                                    label="Error"
                                    color="error"
                                  />
                                  <IconButton
                                    size="small"
                                    onClick={() => handleSendElectronicInvoice(sale)}
                                    title="Reintentar envío"
                                  >
                                    <SendIcon fontSize="small" />
                                  </IconButton>
                                </>
                              ) : (
                                <Chip
                                  size="small"
                                  icon={<PendingIcon />}
                                  label="Pendiente"
                                  color="warning"
                                />
                              )}

                              {/* Button to view DIAN response */}
                              {sale.electronic_invoice.dian_response && (
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedElectronicInvoice(sale.electronic_invoice);
                                    setSelectedDianResponse(sale.electronic_invoice!.dian_response || '');
                                    setDianTab(0); // Reset to first tab
                                    setDianResponseDialog(true);
                                  }}
                                  title="Ver datos enviados y respuesta DIAN"
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>

                            {/* Validación DIAN Status */}
                            {sale.electronic_invoice.is_valid === true && (
                              <Chip
                                size="small"
                                icon={<CheckCircleIcon />}
                                label="✓ Validado DIAN"
                                color="success"
                                variant="outlined"
                                title={sale.electronic_invoice.validation_message}
                              />
                            )}
                            {sale.electronic_invoice.is_valid === false && (
                              <Chip
                                size="small"
                                icon={<ErrorIcon />}
                                label="✗ Rechazado DIAN"
                                color="error"
                                variant="outlined"
                                title={sale.electronic_invoice.validation_message}
                              />
                            )}
                          </Box>
                        ) : (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSendElectronicInvoice(sale)}
                            title="Enviar factura electrónica"
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                        )
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            N/A
                          </Typography>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleConvertToElectronicInvoice(sale)}
                            title="Convertir a factura electrónica"
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(sale)}
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, sale)}
                      >
                        <MoreIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={salesTotalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedSale && handlePrintReceipt(selectedSale)}>
          <PrintIcon sx={{ mr: 1 }} /> Imprimir Recibo
        </MenuItem>
        <MenuItem onClick={() => selectedSale && handlePrintInvoice(selectedSale)}>
          <ReceiptIcon sx={{ mr: 1 }} /> Imprimir Factura
        </MenuItem>
        {selectedSale?.invoice_type === 'electronic' && (
          <MenuItem onClick={() => selectedSale && handleResendInvoice(selectedSale)}>
            <ReceiptIcon sx={{ mr: 1 }} /> Reenviar Factura Electrónica
          </MenuItem>
        )}
        {selectedSale?.electronic_invoice?.invoice_number && (
          <MenuItem onClick={() => selectedSale && handleResendEmail(selectedSale)}>
            <EmailIcon sx={{ mr: 1 }} /> Reenviar Email al Cliente
          </MenuItem>
        )}
        {/* Edit Customer - only for unprocessed invoices */}
        {selectedSale && (!selectedSale.electronic_invoice ||
          (selectedSale.electronic_invoice.status !== 'sent' &&
           selectedSale.electronic_invoice.status !== 'validating' &&
           selectedSale.electronic_invoice.status !== 'accepted')) && (
          <MenuItem onClick={() => selectedSale && handleOpenEditCustomerDialog(selectedSale)}>
            <EditIcon sx={{ mr: 1 }} /> Cambiar Cliente
          </MenuItem>
        )}
        {selectedSale?.electronic_invoice?.dian_response && (
          <MenuItem onClick={() => {
            setSelectedDianResponse(selectedSale?.electronic_invoice?.dian_response || '');
            setDianResponseDialog(true);
            handleMenuClose();
          }}>
            <ViewIcon sx={{ mr: 1 }} /> Ver Respuesta DIAN
          </MenuItem>
        )}
        {selectedSale?.status === 'completed' && (
          <>
            <MenuItem onClick={() => selectedSale && handleOpenRefundDialog(selectedSale)}>
              Reembolso
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => selectedSale && handleDeleteSale(selectedSale)} sx={{ color: 'error.main' }}>
              <DeleteIcon sx={{ mr: 1 }} />
              Eliminar Venta
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Sale Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Detalle de Venta #{selectedSale?.sale_number}
            </Typography>
            <Chip
              label={selectedSale?.status}
              color={selectedSale?.status === 'completed' ? 'success' : 'error'}
              size="small"
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedSale && (
            <Box>
              {/* Sale Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Información General
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Número de Factura</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedSale.sale_number || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Fecha y Hora</Typography>
                    <Typography variant="body1">
                      {selectedSale.created_at
                        ? format(new Date(selectedSale.created_at), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Cliente</Typography>
                    <Typography variant="body1">
                      {selectedSale.customer?.name || 'Consumidor Final'}
                    </Typography>
                    {selectedSale.customer?.email && (
                      <Typography variant="caption" color="text.secondary">
                        {selectedSale.customer.email}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Vendedor</Typography>
                    <Typography variant="body1">
                      {selectedSale.employee?.name || '-'}
                    </Typography>
                  </Box>
                  {(selectedSale.order as any)?.created_by_name && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Creado por</Typography>
                      <Typography variant="body1" color="primary">
                        {(selectedSale.order as any).created_by_name}
                      </Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="body2" color="text.secondary">Tipo de Factura</Typography>
                    <Chip
                      size="small"
                      label={selectedSale.invoice_type === 'electronic' ? 'Electrónica' : 'Física'}
                      color={selectedSale.invoice_type === 'electronic' ? 'primary' : 'default'}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                  {selectedSale.order?.order_type && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Tipo de Orden</Typography>
                      <Chip
                        size="small"
                        label={selectedSale.order.order_type.name}
                        color={
                          selectedSale.order.order_type.code === 'dine-in'
                            ? 'primary'
                            : selectedSale.order.order_type.code === 'delivery'
                            ? 'warning'
                            : 'secondary'
                        }
                        sx={{
                          mt: 0.5,
                          backgroundColor: selectedSale.order.order_type.display_color || undefined
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Order Items */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Productos
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Producto</TableCell>
                        <TableCell align="center">Cantidad</TableCell>
                        <TableCell align="right">Precio Unit.</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedSale.order?.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2">
                              {item.product?.name || 'Producto'}
                            </Typography>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <Box sx={{ mt: 0.5, ml: 1 }}>
                                {item.modifiers.map((mod, modIndex) => {
                                  const modQty = mod.quantity && mod.quantity > 0 ? mod.quantity : 1;
                                  const totalChange = mod.price_change * modQty;
                                  const qtyLabel = modQty > 1 ? ` x${modQty}` : '';
                                  const priceLabel = totalChange !== 0
                                    ? ` (${totalChange > 0 ? '+' : '-'}$${Math.abs(totalChange).toLocaleString('es-CO')})`
                                    : '';
                                  return (
                                    <Typography
                                      key={modIndex}
                                      variant="caption"
                                      color="text.secondary"
                                      display="block"
                                      sx={{ fontStyle: 'italic' }}
                                    >
                                      + {mod.modifier?.name}{qtyLabel}{priceLabel}
                                    </Typography>
                                  );
                                })}
                              </Box>
                            )}
                            {item.notes && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                📝 Nota: {item.notes}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">
                            ${(item.unit_price || 0).toLocaleString('es-CO')}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              ${(item.subtotal || 0).toLocaleString('es-CO')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Payment Details */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Detalles de Pago
                </Typography>
                {selectedSale.payment_details && selectedSale.payment_details.length > 0 ? (
                  <Box sx={{ mt: 1 }}>
                    {selectedSale.payment_details.map((payment, index) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, py: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            label={payment.payment_method?.name || 'Efectivo'}
                            color={
                              payment.payment_method?.type === 'cash' ? 'success' :
                              payment.payment_method?.type === 'card' ? 'primary' : 'info'
                            }
                          />
                          {payment.reference && (
                            <Typography variant="caption" color="text.secondary">
                              Ref: {payment.reference}
                            </Typography>
                          )}
                          {/* Voucher Image Button */}
                          {(payment as any).voucher_image && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => handleViewVoucher((payment as any).voucher_image)}
                                title="Ver comprobante"
                              >
                                <ImageIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleDownloadVoucher(
                                  (payment as any).voucher_image,
                                  selectedSale.sale_number || 'venta',
                                  index
                                )}
                                title="Descargar comprobante"
                              >
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </Box>
                        <Typography variant="body2" fontWeight="bold">
                          ${(payment.amount || 0).toLocaleString('es-CO')}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay información de pago disponible
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Sale Totals */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2">
                    ${(selectedSale.subtotal || 0).toLocaleString('es-CO')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    {companyLiabilityId !== null && companyLiabilityId !== 117 ? 'Impuestos (19%):' : 'Impuestos (N/A):'}
                  </Typography>
                  <Typography variant="body2">
                    ${companyLiabilityId !== null && companyLiabilityId !== 117 ? (selectedSale.tax || 0).toLocaleString('es-CO') : '0'}
                  </Typography>
                </Box>
                {selectedSale.discount && selectedSale.discount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="error">Descuento:</Typography>
                    <Typography variant="body2" color="error">
                      -${selectedSale.discount.toLocaleString('es-CO')}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">
                    ${selectedSale.total.toLocaleString('es-CO')}
                  </Typography>
                </Box>
                {selectedSale.payment_details && selectedSale.payment_details.length > 0 && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="body2">Recibido:</Typography>
                      <Typography variant="body2">
                        ${(selectedSale.amount_paid || 0).toLocaleString('es-CO')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="success.main">Cambio:</Typography>
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        ${(selectedSale.change || 0).toLocaleString('es-CO')}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>

              {/* Notes */}
              {selectedSale.notes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Notas
                    </Typography>
                    <Typography variant="body2">{selectedSale.notes}</Typography>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Cerrar</Button>
          <Button
            variant="outlined"
            startIcon={<ReceiptIcon />}
            onClick={() => selectedSale && handlePrintInvoice(selectedSale)}
          >
            Factura
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => selectedSale && handlePrintReceipt(selectedSale)}
          >
            Recibo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialog} onClose={() => setRefundDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Procesar Reembolso</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Monto a reembolsar"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Razón del reembolso"
              multiline
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialog(false)}>Cancelar</Button>
          <Button onClick={handleRefund} variant="contained" color="error">
            Procesar Reembolso
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIAN Response Dialog */}
      <Dialog
        open={dianResponseDialog}
        onClose={() => setDianResponseDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Factura Electrónica DIAN</Typography>
            <Chip
              label={selectedElectronicInvoice?.invoice_number || 'N/A'}
              size="small"
              color="primary"
            />
          </Box>
        </DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={dianTab} onChange={(e, newValue) => setDianTab(newValue)} aria-label="DIAN data tabs">
            <Tab label="Datos Enviados" />
            <Tab label="Respuesta DIAN" />
          </Tabs>
        </Box>
        <DialogContent dividers>
          {/* Tab Panel: Datos Enviados */}
          {dianTab === 0 && (
            <Box sx={{
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflow: 'auto',
              maxHeight: '60vh'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                {selectedElectronicInvoice?.request_data
                  ? JSON.stringify(JSON.parse(selectedElectronicInvoice.request_data), null, 2)
                  : 'No hay datos de solicitud disponibles'}
              </pre>
            </Box>
          )}

          {/* Tab Panel: Respuesta DIAN */}
          {dianTab === 1 && (
            <Box sx={{
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflow: 'auto',
              maxHeight: '60vh'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                {selectedDianResponse ? (() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedDianResponse), null, 2);
                  } catch (e) {
                    return selectedDianResponse;
                  }
                })() : 'No hay respuesta DIAN disponible'}
              </pre>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDianResponseDialog(false)}>Cerrar</Button>
          <Button
            variant="outlined"
            onClick={() => {
              const contentToCopy = dianTab === 0
                ? (selectedElectronicInvoice?.request_data || '')
                : selectedDianResponse;
              navigator.clipboard.writeText(contentToCopy);
              toast.success(`${dianTab === 0 ? 'Datos de solicitud' : 'Respuesta'} copiado al portapapeles`);
            }}
          >
            Copiar {dianTab === 0 ? 'Solicitud' : 'Respuesta'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Voucher Image Dialog */}
      <Dialog
        open={voucherImageDialog}
        onClose={() => setVoucherImageDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ImageIcon color="secondary" />
            <Typography variant="h6">Comprobante de Pago</Typography>
          </Box>
          <IconButton onClick={() => setVoucherImageDialog(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          {selectedVoucherImage && (
            <img
              src={selectedVoucherImage}
              alt="Comprobante de pago"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              if (selectedVoucherImage) {
                const link = document.createElement('a');
                link.href = selectedVoucherImage;
                link.download = `comprobante_${new Date().getTime()}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Comprobante descargado');
              }
            }}
          >
            Descargar Imagen
          </Button>
          <Button onClick={() => setVoucherImageDialog(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog
        open={editCustomerDialog}
        onClose={() => setEditCustomerDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" />
            <Typography variant="h6">Cambiar Cliente</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Venta: {selectedSale?.sale_number}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cliente actual: {selectedSale?.customer?.name || 'Consumidor Final'}
            </Typography>
          </Box>

          {/* Search customers */}
          <TextField
            fullWidth
            label="Buscar cliente"
            placeholder="Buscar por nombre, documento o email..."
            value={customerSearchQuery}
            onChange={(e) => setCustomerSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {/* Customer list */}
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {availableCustomers
              .filter(customer => {
                if (!customerSearchQuery) return true;
                const query = customerSearchQuery.toLowerCase();
                return (
                  customer.name?.toLowerCase().includes(query) ||
                  customer.identification_number?.includes(query) ||
                  customer.email?.toLowerCase().includes(query)
                );
              })
              .map(customer => (
                <Card
                  key={customer.id}
                  sx={{
                    mb: 1,
                    cursor: 'pointer',
                    border: selectedCustomerId === customer.id ? 2 : 1,
                    borderColor: selectedCustomerId === customer.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {customer.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {customer.identification_type}: {customer.identification_number}
                        </Typography>
                        {customer.email && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {customer.email}
                          </Typography>
                        )}
                      </Box>
                      {selectedCustomerId === customer.id && (
                        <CheckCircleIcon color="primary" />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
          </Box>

          {availableCustomers.filter(customer => {
            if (!customerSearchQuery) return true;
            const query = customerSearchQuery.toLowerCase();
            return (
              customer.name?.toLowerCase().includes(query) ||
              customer.identification_number?.includes(query) ||
              customer.email?.toLowerCase().includes(query)
            );
          }).length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No se encontraron clientes
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCustomerDialog(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpdateCustomer}
            variant="contained"
            disabled={!selectedCustomerId}
            startIcon={<EditIcon />}
          >
            Actualizar Cliente
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sales;
