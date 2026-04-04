// Mock types replacing Wails-generated types
export type GoogleSheetsConfig = {
  id?: number;
  enabled: boolean;
  spreadsheet_id: string;
  credentials_json: string;
  sheet_name: string;
  sync_interval: number;
  last_sync?: string;
};

// Provide a mock class-like constructor
export const GoogleSheetsConfigClass = {
  createFrom: (data: any) => ({ ...data }),
};

export type FullSyncResult = {
  success: boolean;
  days_synced: number;
  errors: string[];
};

export const wailsGoogleSheetsService = {
  async getConfig(): Promise<GoogleSheetsConfig> {
    return {
      enabled: false,
      spreadsheet_id: '',
      credentials_json: '',
      sheet_name: 'Ventas',
      sync_interval: 30,
    };
  },

  async saveConfig(_config: GoogleSheetsConfig): Promise<void> {
  },

  async testConnection(_config: GoogleSheetsConfig): Promise<void> {
  },

  async syncNow(): Promise<void> {
  },

  async syncAllDays(): Promise<FullSyncResult> {
    return { success: true, days_synced: 0, errors: [] };
  },
};
