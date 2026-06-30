// Mock types replacing Wails-generated types. Mantenemos la superficie
// completa que GoogleSheetsSettings espera (is_enabled, sync_mode,
// include_*, last_sync_status, etc.) — antes faltaban y la UI tiraba
// "property does not exist" en consola.
import { getStore, setStore } from './mockBackend';

export type GoogleSheetsConfig = {
  id?: number;
  enabled: boolean;
  is_enabled?: boolean;
  spreadsheet_id: string;
  credentials_json?: string;
  sheet_name?: string;
  sync_interval?: number;
  last_sync?: string;
  last_sync_at?: string;
  last_sync_status?: 'success' | 'error' | string;
  last_sync_error?: string;
  service_account_email?: string;
  private_key?: string;
  auto_sync?: boolean;
  sync_on_payment?: boolean;
  sync_mode?: 'manual' | 'auto' | 'daily';
  sync_time?: string;
  include_sales?: boolean;
  include_orders?: boolean;
  include_products?: boolean;
  include_clients?: boolean;
  separate_by_order_type?: boolean;
  total_syncs?: number;
};

const DEFAULTS: GoogleSheetsConfig = {
  id: 1,
  enabled: false,
  is_enabled: false,
  spreadsheet_id: '',
  credentials_json: '',
  sheet_name: 'Ventas',
  sync_interval: 30,
  auto_sync: false,
  sync_on_payment: false,
  sync_mode: 'manual',
  sync_time: '23:00',
  include_sales: true,
  include_orders: false,
  include_products: false,
  include_clients: false,
  separate_by_order_type: false,
  total_syncs: 0,
};

// Clase real para que `new GoogleSheetsConfigClass(data)` funcione.
// El shim anterior era `{ createFrom }`, así que el `new` arrojaba
// TypeError y la pantalla quedaba muerta apenas el usuario tocaba un input.
export class GoogleSheetsConfigClass implements GoogleSheetsConfig {
  id?: number;
  enabled: boolean = false;
  is_enabled?: boolean;
  spreadsheet_id: string = '';
  credentials_json?: string;
  sheet_name?: string;
  sync_interval?: number;
  last_sync?: string;
  last_sync_at?: string;
  last_sync_status?: string;
  last_sync_error?: string;
  service_account_email?: string;
  private_key?: string;
  auto_sync?: boolean;
  sync_on_payment?: boolean;
  sync_mode?: 'manual' | 'auto' | 'daily';
  sync_time?: string;
  include_sales?: boolean;
  include_orders?: boolean;
  include_products?: boolean;
  include_clients?: boolean;
  separate_by_order_type?: boolean;
  total_syncs?: number;

  constructor(data: Partial<GoogleSheetsConfig> = {}) {
    Object.assign(this, DEFAULTS, data);
    // Mantén `enabled` y `is_enabled` sincronizados — ambos viven en el UI.
    if (data.is_enabled !== undefined) this.enabled = data.is_enabled;
    if (data.enabled !== undefined) this.is_enabled = data.enabled;
  }

  static createFrom(data: any) {
    return new GoogleSheetsConfigClass(data || {});
  }
}

export type FullSyncResult = {
  success: boolean;
  days_synced: number;
  synced_days?: number;
  total_days?: number;
  status?: 'success' | 'error' | string;
  message?: string;
  errors: string[];
};

const CONFIG_KEY = 'google_sheets_config';

export const wailsGoogleSheetsService = {
  async getConfig(): Promise<GoogleSheetsConfig> {
    return getStore<GoogleSheetsConfig>(CONFIG_KEY, DEFAULTS);
  },

  async saveConfig(config: GoogleSheetsConfig): Promise<void> {
    setStore(CONFIG_KEY, { ...DEFAULTS, ...config });
  },

  async testConnection(_config: GoogleSheetsConfig): Promise<void> {
    // En la demo aceptamos cualquier config con spreadsheet_id como "ok".
    if (!_config?.spreadsheet_id) throw new Error('Configura un Spreadsheet ID');
  },

  async syncNow(): Promise<void> {
    const cfg = await this.getConfig();
    cfg.last_sync = new Date().toISOString();
    cfg.last_sync_at = cfg.last_sync;
    cfg.last_sync_status = 'success';
    cfg.last_sync_error = '';
    cfg.total_syncs = (cfg.total_syncs || 0) + 1;
    await this.saveConfig(cfg);
  },

  async syncAllDays(): Promise<FullSyncResult> {
    return {
      success: true,
      days_synced: 0,
      synced_days: 0,
      total_days: 0,
      status: 'success',
      message: 'Sincronización completa (modo demo: sin red real)',
      errors: [],
    };
  },
};
