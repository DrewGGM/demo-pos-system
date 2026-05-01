// Demo mock — drives the plan-aware UI from the demoPlans catalog. The selected
// plan determines which feature keys are exposed via getEnabledModules so the
// rest of the app (sidebar items, settings tabs, etc.) reacts the same way it
// would with a real license.
import {
  getCurrentDemoPlan,
  getCurrentDemoPlanId,
  featuresToModuleMap,
  DEMO_PLAN_CHANGED_EVENT,
} from './demoPlans';

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

const buildInfo = (): LicenseInfo => {
  const plan = getCurrentDemoPlan();
  return {
    license_key: `DEMO-${plan.id.toUpperCase().padEnd(8, 'X')}`,
    status: 'active',
    plan: plan.name,
    business_name: 'Demo Restaurant',
    expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    days_remaining: 365,
    message: `Versión demo — Plan ${plan.name}`,
    features: plan.features,
    is_blocked: false,
  };
};

export const wailsLicenseService = {
  async getStatus(): Promise<LicenseInfo> {
    return buildInfo();
  },
  async checkLicense(): Promise<LicenseInfo> {
    return buildInfo();
  },
  async activateLicense(_key: string): Promise<LicenseInfo> {
    return buildInfo();
  },
  async deactivateLicense(): Promise<void> {},
  async getLicenseKey(): Promise<string> {
    return `DEMO-${getCurrentDemoPlanId().toUpperCase()}`;
  },
  async isFeatureEnabled(feature: string): Promise<boolean> {
    return getCurrentDemoPlan().features.includes(feature);
  },
  async getEnabledModules(): Promise<Record<string, boolean>> {
    return featuresToModuleMap(getCurrentDemoPlan().features);
  },
};

// Re-export so consumers can listen to plan changes if they cache results
export { DEMO_PLAN_CHANGED_EVENT };
