import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import lyrooLogo from '../assets/images/lyroo-logo.svg';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Collapse,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  PointOfSale as POSIcon,
  Restaurant as RestaurantIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Warehouse as WarehouseIcon,
  People as PeopleIcon,
  TableChart as TableIcon,
  Assessment as ReportIcon,
  TrendingUp as ProfitIcon,
  AccountBalance as AccountingIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  ExpandLess,
  ExpandMore,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  MonetizationOn as MoneyIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  Cloud as CloudIcon,
  CloudOff as CloudOffIcon,
  AccountCircle,
  Kitchen as KitchenIcon,
  Fastfood as FastfoodIcon,
  VerifiedUser as DIANIcon,
  OpenInNew as OpenInNewIcon,
  Email as EmailIcon,
  Support as SupportIcon,
} from '@mui/icons-material';
import { useAuth, useWebSocket, useDIANMode, useNotifications, usePermissions, useSyncMonitor } from '../hooks';
import { Warning as WarningIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon, Info as InfoIcon } from '@mui/icons-material';
import { wailsConfigService } from '../services/wailsConfigService';
import { wailsLicenseService } from '../services/wailsLicenseService';
import DemoPlanSwitcher from '../components/DemoPlanSwitcher';
import { DEMO_PLAN_CHANGED_EVENT } from '../services/demoPlans';

// Module visibility configuration from backend
interface ModuleVisibility {
  enable_inventory_module: boolean;
  enable_ingredients_module: boolean;
  enable_combos_module: boolean;
  enable_customers_module: boolean;
  enable_reports_module: boolean;
  enable_profit_module: boolean;
  enable_accounting_module: boolean;
  enable_discounts_module: boolean;
}

const drawerWidth = 240;

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  roles?: string[];
  // Permission code from the catalog. When set, the item only shows if the
  // current user has the permission. Takes precedence over `roles`.
  permission?: string;
  children?: MenuItem[];
  moduleKey?: keyof ModuleVisibility; // Key to check in module visibility config
  licenseFeature?: string; // License feature key required to show this item
}

const menuItems: MenuItem[] = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
  },
  {
    text: 'Punto de Venta',
    icon: <POSIcon />,
    path: '/pos',
    roles: ['admin', 'cashier', 'waiter'],
  },
  {
    text: 'Órdenes',
    icon: <ReceiptIcon />,
    path: '/orders',
  },
  {
    text: 'Mesas',
    icon: <TableIcon />,
    path: '/tables',
    licenseFeature: 'tables',
  },
  {
    text: 'Ventas',
    icon: <MoneyIcon />,
    path: '/sales',
    children: [
      {
        text: 'Historial',
        icon: <ReceiptIcon />,
        path: '/sales',
      },
      {
        text: 'Caja',
        icon: <MoneyIcon />,
        path: '/cash-register',
      },
    ],
  },
  {
    text: 'Productos',
    icon: <InventoryIcon />,
    path: '/products',
    permission: 'products.manage',
  },
  {
    text: 'Inventario',
    icon: <WarehouseIcon />,
    path: '/inventory',
    roles: ['admin', 'manager'],
    moduleKey: 'enable_inventory_module',
    licenseFeature: 'inventory',
  },
  {
    text: 'Ingredientes',
    icon: <KitchenIcon />,
    path: '/ingredients',
    roles: ['admin', 'manager'],
    moduleKey: 'enable_ingredients_module',
    licenseFeature: 'ingredients',
  },
  {
    text: 'Combos',
    icon: <FastfoodIcon />,
    path: '/combos',
    roles: ['admin', 'manager'],
    moduleKey: 'enable_combos_module',
    licenseFeature: 'combos',
  },
  {
    text: 'Clientes',
    icon: <PeopleIcon />,
    path: '/customers',
    moduleKey: 'enable_customers_module',
    licenseFeature: 'customers_module',
  },
  {
    text: 'Empleados',
    icon: <GroupIcon />,
    path: '/employees',
    permission: 'employees.manage',
  },
  {
    text: 'Permisos',
    icon: <SecurityIcon />,
    path: '/permissions',
    permission: 'employees.manage',
  },
  {
    text: 'Reportes',
    icon: <ReportIcon />,
    path: '/reports',
    permission: 'reports.view',
    moduleKey: 'enable_reports_module',
  },
  {
    text: 'Costos y Ganancias',
    icon: <ProfitIcon />,
    path: '/profit-report',
    permission: 'reports.profit.view',
    moduleKey: 'enable_profit_module',
    licenseFeature: 'profit_report',
  },
  {
    text: 'Contabilidad',
    icon: <AccountingIcon />,
    path: '/accounting',
    roles: ['admin'],
    moduleKey: 'enable_accounting_module',
  },
  {
    text: 'Configuración',
    icon: <SettingsIcon />,
    path: '/settings',
    permission: 'settings.access',
  },
];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, cashRegisterId } = useAuth();
  const { can } = usePermissions();
  // Start polling the sync monitor. The hook fires header notifications when
  // failed invoices appear/recover or when the link to apidian goes down/up.
  const syncStatus = useSyncMonitor();
  const { isConnected } = useWebSocket();
  const { isDIANMode, toggleDIANMode, isElectronicInvoicingEnabled, dianApiUrl, dianConfig } = useDIANMode();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [moduleVisibility, setModuleVisibility] = useState<ModuleVisibility>({
    enable_inventory_module: true,
    enable_ingredients_module: false,
    enable_combos_module: false,
    enable_customers_module: true,
    enable_reports_module: true,
    enable_profit_module: true,
    enable_accounting_module: false,
    enable_discounts_module: true,
  });
  // Licensed feature keys (driven by the demo plan switcher). Empty until the
  // mock service resolves; while empty we render every item so nothing flickers.
  const [licenseModules, setLicenseModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadLicense = () => {
      wailsLicenseService.getEnabledModules()
        .then(modules => setLicenseModules(modules || {}))
        .catch(() => setLicenseModules({}));
    };
    loadLicense();
    window.addEventListener(DEMO_PLAN_CHANGED_EVENT, loadLicense as EventListener);
    return () => window.removeEventListener(DEMO_PLAN_CHANGED_EVENT, loadLicense as EventListener);
  }, []);

  // Load module visibility from backend
  useEffect(() => {
    const loadModuleVisibility = async () => {
      try {
        console.log('\n📥 [MainLayout] Cargando visibilidad de módulos desde backend...');
        const config = await wailsConfigService.getRestaurantConfig();
        console.log('   📋 Config recibida del backend:', {
          inventory: config?.enable_inventory_module,
          ingredients: config?.enable_ingredients_module,
          combos: config?.enable_combos_module,
          customers: config?.enable_customers_module,
          reports: config?.enable_reports_module,
          profit: config?.enable_profit_module,
          accounting: config?.enable_accounting_module,
          discounts: config?.enable_discounts_module,
        });
        if (config) {
          const newVisibility = {
            enable_inventory_module: config.enable_inventory_module ?? true,
            enable_ingredients_module: config.enable_ingredients_module ?? false,
            enable_combos_module: config.enable_combos_module ?? false,
            enable_customers_module: config.enable_customers_module ?? true,
            enable_reports_module: config.enable_reports_module ?? true,
            enable_profit_module: config.enable_profit_module ?? true,
            enable_accounting_module: config.enable_accounting_module ?? false,
            enable_discounts_module: config.enable_discounts_module ?? true,
          };
          console.log('   ✅ Actualizando visibilidad local:', newVisibility);
          setModuleVisibility(newVisibility);
        }
      } catch (error) {
        console.error('❌ Error loading module visibility:', error);
      }
    };
    loadModuleVisibility();

    // Listen for module config changes
    const handleModuleConfigChange = () => {
      console.log('📢 [MainLayout] Evento "moduleConfigChanged" recibido, recargando...');
      loadModuleVisibility();
    };
    window.addEventListener('moduleConfigChanged', handleModuleConfigChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('moduleConfigChanged', handleModuleConfigChange);
    };
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'success':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      default:
        return <InfoIcon sx={{ color: 'info.main' }} />;
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const toggleExpand = (text: string) => {
    setExpandedItems(prev =>
      prev.includes(text)
        ? prev.filter(item => item !== text)
        : [...prev, text]
    );
  };

  const handleOpenDIANPanel = () => {
    if (dianApiUrl && dianConfig?.identification_number) {
      // Build URL with company NIT: baseUrl/company/NIT
      const url = `${dianApiUrl}/company/${dianConfig.identification_number}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (dianApiUrl) {
      // Fallback to base URL if NIT is not configured
      window.open(dianApiUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const hasPermission = (item: MenuItem): boolean => {
    // Granular permission check wins when set — the matrix is the single
    // source of truth. Falls back to the legacy role list for items that
    // haven't been migrated yet.
    if (item.permission) {
      return can(item.permission);
    }
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    if (!hasPermission(item)) return null;

    // Check module visibility - if moduleKey is defined, check if module is enabled
    if (item.moduleKey && !moduleVisibility[item.moduleKey]) return null;

    // Check license feature - hide items the active demo plan does not include
    if (item.licenseFeature && Object.keys(licenseModules).length > 0 && !licenseModules[item.licenseFeature]) return null;

    const isSelected = location.pathname === item.path;
    const isExpanded = expandedItems.includes(item.text);
    const hasChildren = item.children && item.children.length > 0;

    // Rutas que requieren caja abierta (todas excepto estas)
    const allowedWithoutCash = ['/cash-register', '/settings', '/employees', '/permissions'];
    const requiresCashRegister = !allowedWithoutCash.some(route => item.path.startsWith(route));
    const isDisabled = requiresCashRegister && !cashRegisterId;

    return (
      <React.Fragment key={item.text}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={() => {
              if (isDisabled) return; // No hacer nada si está deshabilitado
              if (hasChildren) {
                toggleExpand(item.text);
              } else {
                handleNavigate(item.path);
              }
            }}
            selected={isSelected}
            disabled={isDisabled}
            sx={{
              minHeight: 48,
              justifyContent: 'initial',
              px: level === 0 ? 2.5 : 4,
              backgroundColor: isSelected ? 'action.selected' : 'transparent',
              opacity: isDisabled ? 0.5 : 1,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              '&:hover': {
                backgroundColor: isDisabled ? 'transparent' : 'action.hover',
              },
              '&.Mui-disabled': {
                opacity: 0.5,
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 3,
                justifyContent: 'center',
                color: isDisabled ? 'text.disabled' : (isSelected ? 'primary.main' : 'inherit'),
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              sx={{
                opacity: 1,
                '& .MuiListItemText-primary': {
                  fontWeight: isSelected ? 600 : 400,
                  color: isDisabled ? 'text.disabled' : 'inherit',
                },
              }}
            />
            {hasChildren && (
              <>
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </>
            )}
          </ListItemButton>
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map(child => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          Restaurant POS
        </Typography>
      </Toolbar>
      <Divider />

      {/* User Info */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            {user?.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle2">{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.role}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Menu Items */}
      <List>
        {menuItems.map(item => renderMenuItem(item))}
      </List>

      <Divider />

      {/* Status */}
      <Box sx={{ p: 2 }}>
        {!cashRegisterId && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: 'error.contrastText', fontWeight: 'bold' }}>
              ⚠️ Debe abrir la caja para operar
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {cashRegisterId ? (
            <Chip
              label="Caja Abierta"
              color="success"
              size="small"
            />
          ) : (
            <Chip
              label="Caja Cerrada"
              color="error"
              size="small"
              onClick={() => navigate('/cash-register')}
              sx={{ cursor: 'pointer' }}
            />
          )}
          {!isConnected && (
            <Chip
              label="Desconectado"
              color="error"
              size="small"
            />
          )}
        </Box>
      </Box>

      <Divider />

      {/* Support Link */}
      <Box sx={{ p: 2 }}>
        <Typography
          variant="body2"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'text.secondary',
            cursor: 'pointer',
            transition: 'color 0.2s',
            '&:hover': { color: 'primary.main' },
          }}
          component="a"
          href="mailto:support@lyroo.com.co"
        >
          <SupportIcon fontSize="small" />
          Soporte
        </Typography>
      </Box>

      {/* Powered by Lyroo */}
      <Box sx={{ p: 2, pt: 0, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider', mt: 'auto' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          Powered by
        </Typography>
        <Box
          component="img"
          src={lyrooLogo}
          alt="Lyroo Technologies"
          sx={{ height: 36, opacity: 0.9, cursor: 'pointer' }}
          onClick={() => window.open('https://lyroo.com.co', '_blank')}
        />
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          ...(isDIANMode && {
            bgcolor: '#1565c0',
            backgroundImage: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'Restaurant POS'}
          </Typography>

          {/* Electronic Invoicing Panel - Only visible if DIAN is enabled */}
          {isElectronicInvoicingEnabled && dianApiUrl && (
            <Tooltip title="Panel Facturación Electrónica">
              <IconButton
                color="inherit"
                onClick={handleOpenDIANPanel}
                sx={{ mr: 1 }}
              >
                <OpenInNewIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* DIAN Mode Toggle - Only visible if DIAN is enabled */}
          {isElectronicInvoicingEnabled && (
            <Tooltip title={isDIANMode ? 'Desactivar Modo DIAN' : 'Activar Modo DIAN'}>
              <IconButton
                color="inherit"
                onClick={toggleDIANMode}
                disableRipple
                sx={{
                  transition: 'none',
                  bgcolor: isDIANMode ? 'rgba(255,255,0,0.15)' : 'transparent',
                  '&:hover': {
                    bgcolor: isDIANMode ? 'rgba(255,255,0,0.20)' : 'transparent',
                  },
                }}
              >
                <DIANIcon sx={{ color: isDIANMode ? '#ffeb3b' : 'inherit' }} />
              </IconButton>
            </Tooltip>
          )}

          {/* Sync / Connectivity indicator. Always visible: green when the
              link to DIAN is up and no invoices are pending; orange/red when
              the link is down or invoices are queued. Click to jump to Sales
              so the cashier can act on them. */}
          {syncStatus && (
            <Tooltip
              title={
                !syncStatus.connectivity.online
                  ? `Sin conexión a DIAN${syncStatus.connectivity.last_error ? ` (${syncStatus.connectivity.last_error})` : ''}`
                  : syncStatus.failed_count > 0
                  ? `${syncStatus.failed_count} factura(s) pendiente(s) de reenvío`
                  : 'Sincronización al día'
              }
            >
              <IconButton
                color="inherit"
                onClick={() => navigate('/sales')}
                sx={{ mr: 0.5 }}
              >
                <Badge
                  badgeContent={syncStatus.failed_count}
                  color={!syncStatus.connectivity.online ? 'error' : 'warning'}
                  invisible={syncStatus.connectivity.online && syncStatus.failed_count === 0}
                >
                  {syncStatus.connectivity.online ? (
                    <CloudIcon
                      sx={{
                        color: syncStatus.failed_count > 0 ? 'warning.light' : 'success.light',
                      }}
                    />
                  ) : (
                    <CloudOffIcon sx={{ color: 'error.light' }} />
                  )}
                </Badge>
              </IconButton>
            </Tooltip>
          )}

          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationClick}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* User Menu */}
          <IconButton
            onClick={handleMenuClick}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Mi Perfil
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Configuración
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Cerrar Sesión
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        PaperProps={{
          sx: { minWidth: 320, maxWidth: 400, maxHeight: 400 }
        }}
      >
        {notifications.length > 0 ? (
          <>
            <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2">Notificaciones</Typography>
              {unreadCount > 0 && (
                <Typography
                  variant="caption"
                  sx={{ cursor: 'pointer', color: 'primary.main' }}
                  onClick={() => markAllAsRead()}
                >
                  Marcar todas como leídas
                </Typography>
              )}
            </Box>
            <Divider />
            {notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => {
                  markAsRead(notification.id);
                  if (notification.action?.path) {
                    navigate(notification.action.path);
                    handleNotificationClose();
                  }
                }}
                sx={{
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                  whiteSpace: 'normal',
                  py: 1.5,
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                    {notification.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    {notification.message}
                  </Typography>
                  {notification.action && (
                    <Typography variant="caption" color="primary">
                      {notification.action.label}
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
          </>
        ) : (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No hay notificaciones
            </Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
      <DemoPlanSwitcher />
    </Box>
  );
};

export default MainLayout;
