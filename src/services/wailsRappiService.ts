// Mock types replacing Wails-generated types. La UI Rappi (RappiSettings)
// usa los campos client_id/client_secret/store_ids/webhook_url; el tipo
// anterior los tenía con otros nombres y la validación nunca pasaba.
import { getStore, setStore } from './mockBackend';

export type RappiConfig = {
  id?: number;
  enabled: boolean;
  client_id?: string;
  client_secret?: string;
  store_ids?: string;
  store_id?: string; // alias legacy
  api_key?: string;
  webhook_url?: string;
  environment?: 'test' | 'production';
};

export const RappiConfigClass = {
  createFrom: (data: any) => ({ ...(data || {}) }),
};

const DEFAULTS: RappiConfig = {
  id: 1,
  enabled: false,
  client_id: '',
  client_secret: '',
  store_ids: '',
  webhook_url: '',
  environment: 'test',
};

export type TestConnectionResponse = {
  success: boolean;
  message: string;
};

export type ConnectionStatus = {
  connected: boolean;
  last_ping: string;
  orders_received: number;
  orders_processed: number;
};

const CONFIG_KEY = 'rappi_config';
const STATUS_KEY = 'rappi_status';

export const wailsRappiService = {
  async getConfig(): Promise<RappiConfig> {
    return getStore<RappiConfig>(CONFIG_KEY, DEFAULTS);
  },

  async saveConfig(config: RappiConfig): Promise<void> {
    setStore(CONFIG_KEY, { ...DEFAULTS, ...config });
  },

  async testConnection(config: RappiConfig): Promise<TestConnectionResponse> {
    if (!config?.client_id || !config?.client_secret) {
      return { success: false, message: 'Falta client_id o client_secret' };
    }
    // Demo: aceptamos cualquier credencial no vacía y actualizamos status.
    setStore(STATUS_KEY, {
      connected: true,
      last_ping: new Date().toISOString(),
      orders_received: 0,
      orders_processed: 0,
    });
    return { success: true, message: 'Conexión exitosa (modo demo: sin Rappi real)' };
  },

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return getStore<ConnectionStatus>(STATUS_KEY, {
      connected: false,
      last_ping: '',
      orders_received: 0,
      orders_processed: 0,
    });
  },

  async resetStatistics(): Promise<void> {
    setStore(STATUS_KEY, {
      connected: false,
      last_ping: '',
      orders_received: 0,
      orders_processed: 0,
    });
  },
};
