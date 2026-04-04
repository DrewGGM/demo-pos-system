import { getAll, getById, create, update, remove, generateOrderNumber, generateSaleNumber, initDemoData, getStore, setStore } from './mockBackend';

type AnyObject = Record<string, any>;

const SYSTEM_CONFIG_KEY = 'system_configs';

export const wailsConfigService = {
  async getRestaurantConfig(): Promise<any> {
    return getStore<any>('restaurant_config', {
      name: 'Restaurant Demo POS',
      business_name: 'Demo Restaurant S.A.S',
      nit: '900123456',
      address: 'Calle 10 #15-20, Armenia, Quindio',
      phone: '3001234567',
      email: 'demo@restaurantpos.co',
      logo: '',
    });
  },

  async updateRestaurantConfig(config: AnyObject): Promise<void> {
    const current = getStore<any>('restaurant_config', {});
    setStore('restaurant_config', { ...current, ...config });
  },

  async getDIANConfig(): Promise<any> {
    return getStore<any>('dian_config', {
      enabled: false,
      environment: 'test',
      nit: '900123456',
      dv: '7',
      type_regime_id: 1,
      type_liability_id: 1,
      type_document_id: 1,
      type_organization_id: 1,
      municipality_id: 1,
      resolution_number: '',
      resolution_prefix: 'FE',
      resolution_from: 1,
      resolution_to: 10000,
      resolution_date_from: '2024-01-01',
      resolution_date_to: '2026-12-31',
      software_id: '',
      software_pin: '',
      certificate_password: '',
      test_set_id: '',
    });
  },

  async updateDIANConfig(config: AnyObject): Promise<void> {
    const current = getStore<any>('dian_config', {});
    setStore('dian_config', { ...current, ...config });
  },

  async getPrinterConfigs(): Promise<any[]> {
    return getStore<any[]>('printer_configs', []);
  },

  async getDefaultPrinter(): Promise<any> {
    const printers = getStore<any[]>('printer_configs', []);
    return printers.find((p: any) => p.is_default) || null;
  },

  async savePrinterConfig(config: AnyObject): Promise<void> {
    const printers = getStore<any[]>('printer_configs', []);
    const idx = printers.findIndex((p: any) => p.id === config.id);
    if (idx !== -1) {
      printers[idx] = { ...printers[idx], ...config };
    } else {
      printers.push({ ...config, id: Date.now() });
    }
    setStore('printer_configs', printers);
  },

  async deletePrinterConfig(id: number): Promise<void> {
    const printers = getStore<any[]>('printer_configs', []).filter((p: any) => p.id !== id);
    setStore('printer_configs', printers);
  },

  async getSyncConfig(): Promise<any> {
    return getStore<any>('sync_config', {
      enabled: false,
      server_url: '',
      interval_seconds: 60,
    });
  },

  async updateSyncConfig(config: AnyObject): Promise<void> {
    const current = getStore<any>('sync_config', {});
    setStore('sync_config', { ...current, ...config });
  },

  async getSystemConfig(key: string): Promise<string> {
    const configs = getStore<Record<string, string>>(SYSTEM_CONFIG_KEY, {});
    return configs[key] || '';
  },

  async setSystemConfig(key: string, value: string, type: string, category: string): Promise<void> {
    const configs = getStore<Record<string, string>>(SYSTEM_CONFIG_KEY, {});
    configs[key] = value;
    setStore(SYSTEM_CONFIG_KEY, configs);
  },

  async getAllSystemConfigs(): Promise<any[]> {
    const configs = getStore<Record<string, string>>(SYSTEM_CONFIG_KEY, {});
    return Object.entries(configs).map(([key, value]) => ({ key, value, type: 'string', category: 'general' }));
  },

  async getUITheme(): Promise<any> {
    return getStore<any>('ui_theme', {
      primary_color: '#1976d2',
      secondary_color: '#dc004e',
      mode: 'light',
    });
  },

  async updateUITheme(theme: AnyObject): Promise<void> {
    const current = getStore<any>('ui_theme', {});
    setStore('ui_theme', { ...current, ...theme });
  },

  async getTableLayout(): Promise<any> {
    return getStore<any>('table_layout', null);
  },

  async saveTableLayout(layout: AnyObject): Promise<void> {
    setStore('table_layout', layout);
  },

  async validateConfiguration(): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] };
  },

  async getNetworkConfig(): Promise<any> {
    return getStore<any>('network_config', {
      port: 8080,
      host: 'localhost',
    });
  },

  async saveNetworkConfig(config: AnyObject): Promise<void> {
    setStore('network_config', config);
  },

  async getTunnelConfigDB(): Promise<any> {
    return getStore<any>('tunnel_config', null);
  },

  async saveTunnelConfigDB(config: AnyObject): Promise<void> {
    setStore('tunnel_config', config);
  },

  async getTunnelStatus(): Promise<any> {
    return { running: false, url: '', error: '' };
  },

  async startQuickTunnel(port: number): Promise<void> {
  },

  async startTunnelWithToken(token: string): Promise<void> {
  },

  async stopTunnel(): Promise<void> {
    // no-op
  },

  async downloadCloudflared(): Promise<void> {
  },

  async isTunnelInstalled(): Promise<boolean> {
    return false;
  },

  async getTunnelDownloadURL(): Promise<string> {
    return '';
  },

  async clearTunnelOutput(): Promise<void> {
    // no-op
  },

  async installCloudflaredViaPackageManager(): Promise<void> {
  },

  async loginToCloudflare(): Promise<void> {
  },

  async getPackageManagerCommand(): Promise<string> {
    return '';
  },

  async canUsePackageManager(): Promise<boolean> {
    return false;
  }
};
