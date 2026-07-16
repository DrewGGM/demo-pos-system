import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  Skeleton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as CartIcon,
  People as PeopleIcon,
  TableChart as TableIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Restaurant as RestaurantIcon,
  AttachMoney as MoneyIcon,
  Inventory as InventoryIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  PointOfSale as POSIcon,
  WifiTethering as ServerIcon,
  PhoneAndroid as MobileIcon,
  Kitchen as KitchenIcon,
  RestaurantMenu as WaiterIcon,
  PowerSettingsNew as ResetIcon,
  Router as RouterIcon,
  CloudSync as CloudSyncIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth, useDIANMode } from '../../hooks';
import { usePermissions } from '../../hooks';
import { useConfirm } from '../../contexts/ConfirmContext';
import { wailsDashboardService } from '../../services/wailsDashboardService';
import { wailsWebSocketService, WebSocketStatus } from '../../services/wailsWebSocketService';
import { wailsGoogleSheetsService } from '../../services/wailsGoogleSheetsService';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getStatusColor, getStatusLabel, getStatusChipColor } from '../../utils/statusUtils';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardStats {
  today_sales: number;
  today_sales_count: number;
  today_orders: number;
  today_customers: number;
  pending_orders: number;
  low_stock_products: number;
  active_tables: number;
  sales_growth: number;
  average_ticket: number;
  top_selling_items?: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    total_sales: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, cashRegisterId } = useAuth();
  const { isDIANMode } = useDIANMode();
  const { can } = usePermissions();
  const confirm = useConfirm();
  // Role-aware gating: revenue/financial figures (daily sales, growth, average
  // ticket, the sales chart) are only shown to roles that can view reports.
  // Cashiers/waiters get an operations-focused board instead of the money.
  const canViewFinancials = can('reports.view');
  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    cashier: 'Cajero',
    waiter: 'Mesero',
    kitchen: 'Cocina',
  };
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [hourlySales, setHourlySales] = useState<any[]>([]);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [isDIANMode]); // Reload when DIAN mode changes

  const handleRestartServer = async () => {
    if (await confirm({
      title: 'Reiniciar servidor',
      message: '¿Seguro que quieres reiniciar el servidor? Todas las conexiones de apps móviles se desconectarán temporalmente.',
      confirmText: 'Reiniciar',
      variant: 'danger',
    })) {
      try {
        // Quit the application - user will need to manually restart it
        const w = (window as any);
        if (w.runtime && w.runtime.Quit) {
          w.runtime.Quit();
        }
      } catch (error) {
        showError('Error al reiniciar el servidor');
      }
    }
  };

  const handleSyncGoogleSheets = async () => {
    try {
      setSyncing(true);
      await wailsGoogleSheetsService.syncNow();
      showSuccess('googleSheets.syncSuccess');
    } catch (error: any) {
      showError('googleSheets.syncError', error);
    } finally {
      setSyncing(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get dashboard stats (use DIAN-filtered version if in DIAN mode)
      const dashboardStats = isDIANMode
        ? await wailsDashboardService.getDashboardStatsDIAN()
        : await wailsDashboardService.getDashboardStats();
      if (dashboardStats) {
        setStats(dashboardStats);
      }

      // Get pending orders
      const pendingOrdersList = await wailsDashboardService.getPendingOrdersDetails();
      setRecentOrders(pendingOrdersList || []);

      // Get low stock products
      const lowStockList = await wailsDashboardService.getLowStockProducts();
      setLowStockProducts(lowStockList || []);

      // Get sales chart data (last 7 days) - use DIAN-filtered version if in DIAN mode
      const salesData = isDIANMode
        ? await wailsDashboardService.getSalesChartDataDIAN(7)
        : await wailsDashboardService.getSalesChartData(7);
      setHourlySales(salesData || []);

      // Get WebSocket server status
      const status = await wailsWebSocketService.getStatus();
      setWsStatus(status);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, trend, action }: any) => (
    <Card sx={{ height: '100%', transition: 'box-shadow .15s ease, border-color .15s ease', '&:hover': { boxShadow: (t: any) => `0 8px 24px ${t.palette[color]?.main || t.palette.primary.main}22`, borderColor: `${color}.main` } }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              mr: 2,
              display: 'grid',
              placeItems: 'center',
              color: `${color}.main`,
              bgcolor: (t: any) => `${t.palette[color]?.main || t.palette.primary.main}18`,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.6, display: 'block' }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              {value}
            </Typography>
          </Box>
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                px: 0.75,
                py: 0.25,
                borderRadius: 1.5,
                bgcolor: (t: any) => trend > 0 ? `${t.palette.success.main}18` : `${t.palette.error.main}18`,
              }}
            >
              {trend > 0 ? (
                <TrendingUpIcon color="success" sx={{ fontSize: 16 }} />
              ) : (
                <TrendingDownIcon color="error" sx={{ fontSize: 16 }} />
              )}
              <Typography
                variant="caption"
                sx={{ fontWeight: 700 }}
                color={trend > 0 ? 'success.main' : 'error.main'}
              >
                {Math.abs(trend)}%
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
              vs ayer
            </Typography>
          </Box>
        )}
      </CardContent>
      {action && (
        <CardActions>
          <Button size="small" onClick={action.onClick}>
            {action.label}
          </Button>
        </CardActions>
      )}
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        {/* Skeleton that mirrors the real layout so the page doesn't jump when
            data arrives (reserves space for header, stat cards, chart). */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Skeleton variant="text" width={220} height={40} />
            <Skeleton variant="text" width={160} height={20} />
          </Box>
          <Skeleton variant="rounded" width={120} height={40} />
        </Box>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[0, 1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={130} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rounded" height={400} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rounded" height={400} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Typography variant="h4">
              Hola, {user?.name?.split(' ')[0] || user?.name}
            </Typography>
            {user?.role && (
              <Chip
                size="small"
                label={ROLE_LABELS[user.role] || user.role}
                sx={{ fontWeight: 700, bgcolor: (t) => `${t.palette.primary.main}18`, color: 'primary.main' }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, textTransform: 'capitalize' }}>
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<POSIcon />}
            onClick={() => navigate('/pos')}
            disabled={!cashRegisterId}
          >
            Ir al POS
          </Button>
          <IconButton onClick={loadDashboardData}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {!cashRegisterId && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No hay caja abierta. Por favor abra la caja para realizar ventas.
          {can('pos.cash_register.open') && (
            <Button size="small" onClick={() => navigate('/cash-register')} sx={{ ml: 2 }}>
              Abrir Caja
            </Button>
          )}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {canViewFinancials ? (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Ventas de Hoy"
              value={`$${(stats?.today_sales ?? 0).toLocaleString('es-CO')}`}
              icon={<MoneyIcon />}
              color="primary"
              trend={stats?.sales_growth}
              action={{
                label: 'Ver Ventas',
                onClick: () => navigate('/sales'),
              }}
            />
          </Grid>
        ) : (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Ventas de Hoy"
              value={stats?.today_sales_count ?? 0}
              icon={<ReceiptIcon />}
              color="primary"
              action={{
                label: 'Ir al POS',
                onClick: () => navigate('/pos'),
              }}
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Órdenes de Hoy"
            value={stats?.today_orders || 0}
            icon={<CartIcon />}
            color="success"
            action={{
              label: 'Ver Órdenes',
              onClick: () => navigate('/orders'),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Órdenes Pendientes"
            value={stats?.pending_orders || 0}
            icon={<RestaurantIcon />}
            color="warning"
            action={{
              label: 'Ver Cocina',
              onClick: () => navigate('/kitchen'),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Mesas Activas"
            value={`${stats?.active_tables || 0}`}
            icon={<TableIcon />}
            color="info"
            action={{
              label: 'Ver Mesas',
              onClick: () => navigate('/tables'),
            }}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Sales Chart (financial) OR Top-selling panel (operational roles) */}
        <Grid item xs={12} md={8}>
          {canViewFinancials ? (
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Ventas Últimos 7 Días
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={hourlySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                  <XAxis dataKey="date" stroke="currentColor" style={{ fontSize: 12, opacity: 0.7 }} />
                  <YAxis stroke="currentColor" style={{ fontSize: 12, opacity: 0.7 }} />
                  <Tooltip
                    formatter={(value: any) => `$${value.toLocaleString('es-CO')}`}
                    labelFormatter={(label) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#542EB1"
                    fill="#542EB1"
                    fillOpacity={0.18}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          ) : (
            <Paper sx={{ p: 2, height: 400, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                Más vendidos hoy
              </Typography>
              {stats?.top_selling_items && stats.top_selling_items.length > 0 ? (
                <List sx={{ flex: 1, overflow: 'auto' }}>
                  {stats.top_selling_items.slice(0, 8).map((item, i) => (
                    <ListItem key={item.product_id} disableGutters sx={{ py: 0.75 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: (t) => `${t.palette.primary.main}18`, color: 'primary.main', fontWeight: 700 }}>
                          {i + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.product_name}
                        secondary={`${item.quantity} vendidos`}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', gap: 1 }}>
                  <CartIcon sx={{ fontSize: 48, opacity: 0.4 }} />
                  <Typography variant="body2">Aún no hay ventas hoy</Typography>
                </Box>
              )}
            </Paper>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Acciones Rápidas
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ReceiptIcon />}
                  onClick={() => navigate('/sales')}
                  sx={{ py: 2 }}
                >
                  Nueva Venta
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PeopleIcon />}
                  onClick={() => navigate('/customers')}
                  sx={{ py: 2 }}
                >
                  Clientes
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<InventoryIcon />}
                  onClick={() => navigate('/products')}
                  sx={{ py: 2 }}
                >
                  Productos
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => navigate('/reports')}
                  sx={{ py: 2 }}
                >
                  Reportes
                </Button>
              </Grid>
              {can('reports.export') && (
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="success"
                    startIcon={<CloudSyncIcon />}
                    onClick={handleSyncGoogleSheets}
                    disabled={syncing}
                    sx={{ py: 2 }}
                  >
                    {syncing ? 'Enviando...' : 'Enviar Reporte a Google Sheets'}
                  </Button>
                </Grid>
              )}
            </Grid>

            {canViewFinancials && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Ticket Promedio
                </Typography>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 800 }}>
                  ${(stats?.average_ticket ?? 0).toLocaleString('es-CO')}
                </Typography>
              </>
            )}

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2,
                bgcolor: (t) => (stats?.low_stock_products ?? 0) > 0 ? `${t.palette.warning.main}1F` : t.palette.action.hover,
                cursor: can('inventory.adjust') ? 'pointer' : 'default',
              }}
              onClick={() => can('inventory.adjust') && navigate('/inventory')}
            >
              <Avatar sx={{ bgcolor: (stats?.low_stock_products ?? 0) > 0 ? 'warning.main' : 'action.disabledBackground', width: 40, height: 40 }}>
                <WarningIcon />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }} color={(stats?.low_stock_products ?? 0) > 0 ? 'warning.main' : 'text.primary'}>
                  {stats?.low_stock_products ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Productos con bajo stock
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ServerIcon color="primary" />
                <Typography variant="h6">
                  Estado del Sistema
                </Typography>
              </Box>
              <IconButton onClick={loadDashboardData} size="small">
                <RefreshIcon />
              </IconButton>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Servidor WebSocket
                </Typography>
                <Chip
                  label={wsStatus?.running ? 'Activo' : 'Inactivo'}
                  size="small"
                  color={wsStatus?.running ? 'success' : 'error'}
                  icon={wsStatus?.running ? <CheckIcon /> : <WarningIcon />}
                />
              </Box>
              {wsStatus?.running && (
                <Typography variant="body2" color="textSecondary">
                  Puerto: {wsStatus.port} • IP: {wsStatus.local_ips?.[0] || 'N/A'}
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
              Apps Móviles Conectadas
            </Typography>

            <List dense>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: wsStatus?.kitchen_clients ? 'success.light' : 'grey.300' }}>
                    <KitchenIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="App Kitchen"
                  secondary={`${wsStatus?.kitchen_clients || 0} ${wsStatus?.kitchen_clients === 1 ? 'dispositivo' : 'dispositivos'} conectado(s)`}
                />
                <Chip
                  label={wsStatus?.kitchen_clients ? 'Conectada' : 'Desconectada'}
                  size="small"
                  color={wsStatus?.kitchen_clients ? 'success' : 'default'}
                />
              </ListItem>

              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: wsStatus?.waiter_clients ? 'success.light' : 'grey.300' }}>
                    <WaiterIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="App Waiter"
                  secondary={`${wsStatus?.waiter_clients || 0} ${wsStatus?.waiter_clients === 1 ? 'dispositivo' : 'dispositivos'} conectado(s)`}
                />
                <Chip
                  label={wsStatus?.waiter_clients ? 'Conectada' : 'Desconectada'}
                  size="small"
                  color={wsStatus?.waiter_clients ? 'success' : 'default'}
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 2 }} />

            {/* Restart Server Button */}
            {can('app.power') && (
              <Button
                fullWidth
                variant="outlined"
                color="warning"
                startIcon={<ResetIcon />}
                onClick={handleRestartServer}
                sx={{ mt: 1 }}
              >
                Reiniciar Servidor
              </Button>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Productos con Bajo Stock
              </Typography>
              <Button size="small" onClick={() => navigate('/products')}>
                Ver Inventario
              </Button>
            </Box>
            <List>
              {lowStockProducts.map((product: any) => (
                <ListItem key={product.id}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'warning.light' }}>
                      <WarningIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={product.name}
                    secondary={`Stock actual: ${product.stock} unidades`}
                  />
                  <Chip
                    label={product.stock === 0 ? 'Agotado' : 'Bajo Stock'}
                    size="small"
                    color={product.stock === 0 ? 'error' : 'warning'}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
export default Dashboard;