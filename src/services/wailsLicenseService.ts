// Demo mock — no license system, always returns active
export interface LicenseInfo {
  license_key: string;
  status: 'active' | 'expiring' | 'grace' | 'expired' | 'invalid' | 'offline';
  plan: string;
  business_name: string;
  expires_at: string;
  days_remaining: number;
  message: string;
  features?: string[];
  is_blocked: boolean;
}

const mockInfo: LicenseInfo = {
  license_key: 'DEMO-DEMO-DEMO-DEMO',
  status: 'active',
  plan: 'demo',
  business_name: 'Demo Restaurant',
  expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
  days_remaining: 365,
  message: 'Versión demo',
  features: ['all'],
  is_blocked: false,
};

export const wailsLicenseService = {
  async getStatus(): Promise<LicenseInfo> {
    return mockInfo;
  },
  async checkLicense(): Promise<LicenseInfo> {
    return mockInfo;
  },
  async activateLicense(_key: string): Promise<LicenseInfo> {
    return mockInfo;
  },
  async deactivateLicense(): Promise<void> {},
  async getLicenseKey(): Promise<string> {
    return mockInfo.license_key;
  },
  async isFeatureEnabled(_feature: string): Promise<boolean> {
    return true;
  },
  async getEnabledModules(): Promise<Record<string, boolean>> {
    return {};
  },
};
