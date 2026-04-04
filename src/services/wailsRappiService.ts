// Mock types replacing Wails-generated types
export type RappiConfig = {
  id?: number;
  enabled: boolean;
  store_id: string;
  api_key: string;
  webhook_url: string;
};

export const RappiConfigClass = {
  createFrom: (data: any) => ({ ...data }),
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

export const wailsRappiService = {
  async getConfig(): Promise<RappiConfig> {
    return {
      enabled: false,
      store_id: '',
      api_key: '',
      webhook_url: '',
    };
  },

  async saveConfig(_config: RappiConfig): Promise<void> {
  },

  async testConnection(_config: RappiConfig): Promise<TestConnectionResponse> {
    return { success: false, message: 'Demo mode - Rappi not available' };
  },

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return {
      connected: false,
      last_ping: '',
      orders_received: 0,
      orders_processed: 0,
    };
  },

  async resetStatistics(): Promise<void> {
  },
};
