import { getAll, getById, create, update, remove, generateOrderNumber, generateSaleNumber, initDemoData, getStore, setStore } from './mockBackend';

// Re-export types — in demo mode these are plain objects
export type AppConfig = any;
export type DatabaseConfig = any;
export type MySQLConfig = any;

export interface ExistingConfigData {
  has_config: boolean;
  restaurant_name: string;
  business_name: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
  has_system_config: boolean;
}

export const wailsConfigManagerService = {
  async getConfig(): Promise<AppConfig | null> {
    return {
      database: {
        type: 'sqlite',
        path: 'demo.db',
      },
      setup_completed: true,
    };
  },

  async saveConfig(config: AppConfig): Promise<void> {
    // no-op in demo — config is hardcoded
  },

  async configExists(): Promise<boolean> {
    return true;
  },

  async isFirstRun(): Promise<boolean> {
    return false; // demo is never first run
  },

  async createDefaultConfig(): Promise<AppConfig | null> {
    return {
      database: {
        type: 'sqlite',
        path: 'demo.db',
      },
      setup_completed: true,
    };
  },

  async testDatabaseConnection(dbConfig: DatabaseConfig): Promise<void> {
    // always succeeds in demo
  },

  async initializeDatabase(dbConfig: DatabaseConfig): Promise<void> {
    // no-op
  },

  async completeSetup(): Promise<void> {
    // no-op
  },

  async getConfigPath(): Promise<string | null> {
    return '/demo/config.json';
  },

  async checkExistingConfig(dbConfig: DatabaseConfig): Promise<ExistingConfigData | null> {
    const config = getStore<any>('restaurant_config', {});
    return {
      has_config: true,
      restaurant_name: config.name || 'Restaurant Demo POS',
      business_name: config.business_name || 'Demo Restaurant S.A.S',
      nit: config.nit || '900123456',
      address: config.address || '',
      phone: config.phone || '',
      email: config.email || '',
      has_system_config: true,
    };
  },

  async saveRestaurantConfig(
    name: string,
    businessName: string,
    nit: string,
    address: string,
    phone: string,
    email: string
  ): Promise<void> {
    setStore('restaurant_config', {
      name,
      business_name: businessName,
      nit,
      address,
      phone,
      email,
      logo: '',
    });
  },

  // DIAN MySQL Database Configuration — no-ops in demo
  async testMySQLConnection(mysqlConfig: MySQLConfig): Promise<void> {
    // always succeeds in demo
  },

  async saveDIANDatabaseConfig(mysqlConfig: MySQLConfig): Promise<void> {
    setStore('dian_database_config', mysqlConfig);
  },

  async getDIANDatabaseConfig(): Promise<MySQLConfig | null> {
    return getStore<any>('dian_database_config', null);
  },

  async removeDIANDatabaseConfig(): Promise<void> {
    setStore('dian_database_config', null);
  },
};
