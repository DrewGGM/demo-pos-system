import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  Chip,
  Divider,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  Print as PrintIcon,
  Security as SecurityIcon,
  Category as CategoryIcon,
  CloudSync as CloudSyncIcon,
  Wifi as WifiIcon,
  ViewModule as ViewModuleIcon,
  Storage as StorageIcon,
  Smartphone as SmartphoneIcon,
  Notifications as NotificationsIcon,
  SmartToy as SmartToyIcon,
  Settings as SettingsIcon,
  Lock as LockIcon,
  Router as RouterIcon,
  Inventory as InventoryIcon,
  Kitchen as KitchenIcon,
  Fastfood as FastfoodIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  LocalOffer as LocalOfferIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Apps as AppsIcon,
  ConfirmationNumber as TicketIcon,
} from '@mui/icons-material';
import { wailsConfigService } from '../../services/wailsConfigService';
import { wailsLicenseService } from '../../services/wailsLicenseService';
import { toast } from 'react-toastify';

// Module configuration interface
export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  category: 'essential' | 'optional' | 'development' | 'experimental';
  status?: 'production' | 'beta' | 'development' | 'experimental';
  licenseFeature?: string; // If set, the module is only available when this feature is in the active license
}

// Default module configuration
export const defaultModuleConfig: ModuleConfig[] = [
  // Essential modules (always enabled)
  {
    id: 'empresa',
    name: 'Empresa',
    description: 'Datos de tu negocio y configuración fiscal',
    icon: <BusinessIcon />,
    enabled: true,
    category: 'essential',
    status: 'production',
  },
  {
    id: 'facturacion',
    name: 'Facturación DIAN',
    description: 'Facturación electrónica Colombia',
    icon: <ReceiptIcon />,
    enabled: true,
    category: 'essential',
    status: 'production',
    licenseFeature: 'dian_invoicing',
  },
  {
    id: 'metodos_pago',
    name: 'Métodos de Pago',
    description: 'Efectivo, tarjeta, Nequi, etc.',
    icon: <PaymentIcon />,
    enabled: true,
    category: 'essential',
    status: 'production',
  },
  {
    id: 'impresion',
    name: 'Impresión',
    description: 'Impresoras térmicas',
    icon: <PrintIcon />,
    enabled: true,
    category: 'essential',
    status: 'production',
  },
  {
    id: 'sistema',
    name: 'Sistema',
    description: 'Idioma, moneda, zona horaria',
    icon: <SecurityIcon />,
    enabled: true,
    category: 'essential',
    status: 'production',
    // No licenseFeature: Sistema is a baseline operational tab that
    // every plan needs (idioma, moneda, zona horaria).
  },
  // Optional modules
  {
    id: 'tipos_pedido',
    name: 'Tipos de Pedido',
    description: 'Mesa, llevar, delivery',
    icon: <CategoryIcon />,
    enabled: true,
    category: 'optional',
    status: 'production',
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Reportes automáticos',
    icon: <CloudSyncIcon />,
    enabled: true,
    category: 'optional',
    status: 'production',
    licenseFeature: 'google_sheets',
  },
  {
    id: 'websocket',
    name: 'WebSocket',
    description: 'App cocina/meseros',
    icon: <WifiIcon />,
    enabled: false,
    category: 'optional',
    status: 'beta',
    licenseFeature: 'kitchen_app', // also covers waiter_app — both ride on the WS server
  },
  {
    id: 'red_puertos',
    name: 'Red y Puertos',
    description: 'Configuración de puertos y túneles',
    icon: <RouterIcon />,
    enabled: true,
    category: 'optional',
    status: 'production',
    licenseFeature: 'tunneling',
  },
  {
    id: 'paginas_pos',
    name: 'Páginas POS',
    description: 'Páginas personalizadas',
    icon: <ViewModuleIcon />,
    enabled: false,
    category: 'optional',
    status: 'beta',
  },
  // Development modules
  {
    id: 'rappi',
    name: 'Rappi POS',
    description: 'Recibir pedidos de Rappi',
    icon: <SmartphoneIcon />,
    enabled: false,
    category: 'development',
    status: 'development',
    licenseFeature: 'rappi',
  },
  {
    id: 'notificaciones',
    name: 'Notificaciones',
    description: 'Alertas del sistema',
    icon: <NotificationsIcon />,
    enabled: false,
    category: 'development',
    status: 'development',
  },
  {
    id: 'bold',
    name: 'Bold (Datáfonos)',
    description: 'Integración con datáfonos Bold',
    icon: <PaymentIcon />,
    enabled: false,
    category: 'development',
    status: 'development',
    licenseFeature: 'bold',
  },
  // Experimental modules
  {
    id: 'ia_mcp',
    name: 'IA (MCP)',
    description: 'Integración con Claude',
    icon: <SmartToyIcon />,
    enabled: false,
    category: 'experimental',
    status: 'experimental',
    licenseFeature: 'mcp_ai',
  },
];

// Storage key for module configuration
const STORAGE_KEY = 'pos_module_config';

// Application modules configuration (synced with backend)
export interface AppModuleConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  backendKey: string; // Key in RestaurantConfig
  licenseFeature?: string; // If set, the module is only available when this feature is in the active license
}

export const defaultAppModules: AppModuleConfig[] = [
  {
    id: 'inventory',
    name: 'Inventario',
    description: 'Gestión de stock y movimientos',
    icon: <InventoryIcon />,
    enabled: true,
    backendKey: 'enable_inventory_module',
    licenseFeature: 'inventory',
  },
  {
    id: 'ingredients',
    name: 'Ingredientes',
    description: 'Control de ingredientes y recetas',
    icon: <KitchenIcon />,
    enabled: false,
    backendKey: 'enable_ingredients_module',
    licenseFeature: 'ingredients',
  },
  {
    id: 'combos',
    name: 'Combos',
    description: 'Paquetes de productos',
    icon: <FastfoodIcon />,
    enabled: false,
    backendKey: 'enable_combos_module',
    licenseFeature: 'combos',
  },
  {
    id: 'customers',
    name: 'Clientes',
    description: 'Registro y gestión de clientes',
    icon: <PeopleIcon />,
    enabled: true,
    backendKey: 'enable_customers_module',
    licenseFeature: 'customers_module',
  },
  {
    id: 'reports',
    name: 'Reportes',
    description: 'Informes y estadísticas',
    icon: <AssessmentIcon />,
    enabled: true,
    backendKey: 'enable_reports_module',
  },
  {
    id: 'profit',
    name: 'Costos y Ganancias',
    description: 'Análisis de costos, márgenes y rentabilidad por producto',
    icon: <TrendingUpIcon />,
    enabled: true,
    backendKey: 'enable_profit_module',
    licenseFeature: 'profit_report',
  },
  {
    id: 'accounting',
    name: 'Contabilidad',
    description: 'Libros contables, plan de cuentas PUC, estados financieros (NIIF Grupo 3)',
    icon: <AccountBalanceIcon />,
    enabled: false,
    backendKey: 'enable_accounting_module',
    licenseFeature: 'accounting',
  },
  {
    id: 'shifts',
    name: 'Autoservicio (Turnos)',
    description: 'Cola visual de pedidos con número de turno grande. Activá para flujos de mostrador / kiosko con tickets de turno.',
    icon: <TicketIcon />,
    enabled: false,
    backendKey: 'enable_shifts_module',
    licenseFeature: 'self_service',
  },
  {
    id: 'discounts',
    name: 'Descuentos',
    description: 'Configuración de descuentos',
    icon: <LocalOfferIcon />,
    enabled: true,
    backendKey: 'enable_discounts_module',
  },
];

// Load module configuration from localStorage
export const loadModuleConfig = (): ModuleConfig[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const savedConfig = JSON.parse(saved) as { id: string; enabled: boolean }[];
      // Merge with defaults to handle new modules
      return defaultModuleConfig.map(module => {
        const savedModule = savedConfig.find(s => s.id === module.id);
        return {
          ...module,
          enabled: module.category === 'essential' ? true : (savedModule?.enabled ?? module.enabled),
        };
      });
    }
  } catch (e) {
    console.error('Error loading module config:', e);
  }
  return defaultModuleConfig;
};

// Save module configuration to localStorage
export const saveModuleConfig = (config: ModuleConfig[]) => {
  try {
    const toSave = config.map(m => ({ id: m.id, enabled: m.enabled }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Error saving module config:', e);
  }
};

// Returns true when a license entry is needed but missing.
// `licenseModules` is the map returned by wailsLicenseService.getEnabledModules().
// While the license is still loading the map is empty — we treat that as "allow" so
// nothing flickers off; gating only kicks in once the map has been populated.
export const isLockedByLicense = (
  feature: string | undefined,
  licenseModules: Record<string, boolean>,
): boolean => {
  if (!feature) return false;
  if (!licenseModules || Object.keys(licenseModules).length === 0) return false;
  return licenseModules[feature] !== true;
};

// Check if a specific module is enabled (and not locked by the active license)
export const isModuleEnabled = (
  moduleId: string,
  config: ModuleConfig[],
  licenseModules: Record<string, boolean> = {},
): boolean => {
  const module = config.find(m => m.id === moduleId);
  if (!module || !module.enabled) return false;
  if (isLockedByLicense(module.licenseFeature, licenseModules)) return false;
  return true;
};

// Check if an application module is enabled (and not locked by the active license)
export const isAppModuleEnabled = (
  moduleId: string,
  modules: AppModuleConfig[],
  licenseModules: Record<string, boolean> = {},
): boolean => {
  const module = modules.find(m => m.id === moduleId);
  if (!module || !module.enabled) return false;
  if (isLockedByLicense(module.licenseFeature, licenseModules)) return false;
  return true;
};

// Load application modules from backend config
export const loadAppModulesFromConfig = (config: any): AppModuleConfig[] => {
  return defaultAppModules.map(module => ({
    ...module,
    enabled: config?.[module.backendKey] ?? module.enabled,
  }));
};

interface GeneralSettingsProps {
  moduleConfig: ModuleConfig[];
  onModuleConfigChange: (config: ModuleConfig[]) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  moduleConfig,
  onModuleConfigChange,
}) => {
  // State for application modules (synced with backend)
  const [appModules, setAppModules] = useState<AppModuleConfig[]>(defaultAppModules);
  const [loadingAppModules, setLoadingAppModules] = useState(true);
  const [savingModule, setSavingModule] = useState<string | null>(null);
  // Modules unlocked by the active license. Used to hide rows entirely when the
  // user does not have access to that feature (e.g. no `bold` in license → no
  // Bold module shown in the Settings list).
  const [licenseModules, setLicenseModules] = useState<Record<string, boolean>>({});

  // Load application modules from backend on mount
  useEffect(() => {
    const loadAppModules = async () => {
      try {
        const config = await wailsConfigService.getRestaurantConfig();
        if (config) {
          setAppModules(loadAppModulesFromConfig(config));
        }
      } catch (error) {
        console.error('Error loading app modules:', error);
      } finally {
        setLoadingAppModules(false);
      }
    };
    loadAppModules();

    wailsLicenseService.getEnabledModules()
      .then(modules => setLicenseModules(modules || {}))
      .catch(() => { /* license not ready, all features visible by default */ });
  }, []);

  // Toggle application module and save to backend
  const handleToggleAppModule = async (moduleId: string) => {
    const module = appModules.find(m => m.id === moduleId);
    if (!module) return;

    setSavingModule(moduleId);
    const newEnabled = !module.enabled;

    console.log(`\n🔄 [handleToggleAppModule] Cambiando módulo "${module.name}"`);
    console.log(`   Estado actual:`, appModules.map(m => `${m.id}=${m.enabled}`).join(', '));
    console.log(`   Enviando al backend: ${module.backendKey}=${newEnabled}`);

    try {
      // Update backend
      const updateData = {
        [module.backendKey]: newEnabled,
      };
      console.log(`   📤 Objeto completo enviado:`, updateData);

      await wailsConfigService.updateRestaurantConfig(updateData);

      console.log(`   ✅ Backend actualizado exitosamente`);

      // Update local state
      setAppModules(prev => {
        const updated = prev.map(m => m.id === moduleId ? { ...m, enabled: newEnabled } : m);
        console.log(`   🔄 Estado local actualizado:`, updated.map(m => `${m.id}=${m.enabled}`).join(', '));
        return updated;
      });

      // Notify other components (like MainLayout) that module config changed
      console.log(`   📢 Disparando evento 'moduleConfigChanged'`);
      window.dispatchEvent(new CustomEvent('moduleConfigChanged'));

      toast.success(`Módulo "${module.name}" ${newEnabled ? 'activado' : 'desactivado'}`);
    } catch (error) {
      console.error('❌ Error toggling app module:', error);
      toast.error('Error al cambiar el módulo');
    } finally {
      setSavingModule(null);
    }
  };

  const handleToggleModule = (moduleId: string) => {
    const newConfig = moduleConfig.map(module => {
      if (module.id === moduleId && module.category !== 'essential') {
        return { ...module, enabled: !module.enabled };
      }
      return module;
    });
    onModuleConfigChange(newConfig);
    saveModuleConfig(newConfig);
  };

  const getStatusChip = (status?: string) => {
    switch (status) {
      case 'beta':
        return <Chip label="Beta" size="small" color="warning" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />;
      case 'development':
        return <Chip label="En desarrollo" size="small" color="info" icon={<span style={{ fontSize: '0.8rem', marginLeft: 4 }}>🚧</span>} sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />;
      case 'experimental':
        return <Chip label="Experimental" size="small" color="secondary" icon={<span style={{ fontSize: '0.8rem', marginLeft: 4 }}>🧪</span>} sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />;
      default:
        return null;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'essential':
        return { title: 'Módulos Esenciales', subtitle: 'Siempre activos para el funcionamiento del sistema' };
      case 'optional':
        return { title: 'Módulos Opcionales', subtitle: 'Actívalos según las necesidades de tu negocio' };
      case 'development':
        return { title: 'En Desarrollo', subtitle: 'Funcionalidades en proceso, pueden tener limitaciones' };
      case 'experimental':
        return { title: 'Experimental', subtitle: 'Funcionalidades avanzadas en pruebas' };
      default:
        return { title: '', subtitle: '' };
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'essential':
        return '#4caf50';
      case 'optional':
        return '#2196f3';
      case 'development':
        return '#ff9800';
      case 'experimental':
        return '#9c27b0';
      default:
        return '#666';
    }
  };

  const renderModuleCategory = (category: 'essential' | 'optional' | 'development' | 'experimental') => {
    const modules = moduleConfig
      .filter(m => m.category === category)
      .filter(m => !isLockedByLicense(m.licenseFeature, licenseModules));
    const { title, subtitle } = getCategoryTitle(category);
    const color = getCategoryColor(category);

    // Skip the entire category card if every module in it is hidden by license
    if (modules.length === 0) return null;

    return (
      <Card
        sx={{
          mb: 3,
          border: `1px solid ${alpha(color, 0.3)}`,
          '& .MuiCardContent-root': { pb: 2 }
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box
              sx={{
                width: 4,
                height: 24,
                bgcolor: color,
                borderRadius: 1,
                mr: 1.5,
              }}
            />
            <Box>
              <Typography variant="subtitle1" fontWeight="600">
                {title}
                {category === 'essential' && (
                  <LockIcon sx={{ ml: 1, fontSize: 16, color: 'text.secondary', verticalAlign: 'middle' }} />
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {modules.map((module) => (
              <Box
                key={module.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: module.enabled ? alpha(color, 0.05) : 'transparent',
                  border: `1px solid ${module.enabled ? alpha(color, 0.2) : 'transparent'}`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: alpha(color, 0.08),
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      bgcolor: module.enabled ? alpha(color, 0.15) : 'action.hover',
                      color: module.enabled ? color : 'text.secondary',
                      mr: 2,
                    }}
                  >
                    {module.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body1" fontWeight={module.enabled ? 600 : 400}>
                        {module.name}
                      </Typography>
                      {getStatusChip(module.status)}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {module.description}
                    </Typography>
                  </Box>
                </Box>
                <Switch
                  checked={module.enabled}
                  onChange={() => handleToggleModule(module.id)}
                  disabled={module.category === 'essential'}
                  color={category === 'experimental' ? 'secondary' : category === 'development' ? 'warning' : 'primary'}
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render application modules section
  const renderAppModules = () => {
    const color = '#FF9800'; // Orange for app modules

    return (
      <Card
        sx={{
          mb: 3,
          border: `1px solid ${alpha(color, 0.3)}`,
          '& .MuiCardContent-root': { pb: 2 }
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box
              sx={{
                width: 4,
                height: 24,
                bgcolor: color,
                borderRadius: 1,
                mr: 1.5,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="600">
                Módulos de la Aplicación
                <AppsIcon sx={{ ml: 1, fontSize: 16, color: 'text.secondary', verticalAlign: 'middle' }} />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Controla las secciones visibles en el menú lateral
              </Typography>
            </Box>
            {loadingAppModules && <CircularProgress size={20} />}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {appModules
              .filter((module) => !isLockedByLicense(module.licenseFeature, licenseModules))
              .map((module) => (
              <Box
                key={module.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: module.enabled ? alpha(color, 0.05) : 'transparent',
                  border: `1px solid ${module.enabled ? alpha(color, 0.2) : 'transparent'}`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: alpha(color, 0.08),
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      bgcolor: module.enabled ? alpha(color, 0.15) : 'action.hover',
                      color: module.enabled ? color : 'text.secondary',
                      mr: 2,
                    }}
                  >
                    {module.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight={module.enabled ? 600 : 400}>
                      {module.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {module.description}
                    </Typography>
                  </Box>
                </Box>
                {savingModule === module.id ? (
                  <CircularProgress size={24} />
                ) : (
                  <Switch
                    checked={module.enabled}
                    onChange={() => handleToggleAppModule(module.id)}
                    disabled={loadingAppModules}
                    color="warning"
                  />
                )}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight="600">
            Configuración General
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra los módulos y funcionalidades activas del sistema
          </Typography>
        </Box>
      </Box>

      {/* Application Modules - First section */}
      {renderAppModules()}

      {renderModuleCategory('essential')}
      {renderModuleCategory('optional')}
      {renderModuleCategory('development')}
      {renderModuleCategory('experimental')}

      <Card sx={{ bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>💡</span>
            <span>
              Los módulos de la aplicación controlan la visibilidad en el menú lateral.
              Los módulos de configuración controlan las pestañas de ajustes.
            </span>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default GeneralSettings;
