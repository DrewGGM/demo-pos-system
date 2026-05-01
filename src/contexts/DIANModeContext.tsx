import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { DIANConfig } from '../types/models';
import { wailsConfigService } from '../services/wailsConfigService';
import { getCurrentDemoPlan, DEMO_PLAN_CHANGED_EVENT } from '../services/demoPlans';

interface DIANModeContextType {
  isDIANMode: boolean;
  toggleDIANMode: () => void;
  setDIANMode: (value: boolean) => void;
  dianConfig: DIANConfig | null;
  isElectronicInvoicingEnabled: boolean;
  dianApiUrl: string | null;
  refreshDIANConfig: () => Promise<void>;
}

export const DIANModeContext = createContext<DIANModeContextType>({
  isDIANMode: false,
  toggleDIANMode: () => {},
  setDIANMode: () => {},
  dianConfig: null,
  isElectronicInvoicingEnabled: false,
  dianApiUrl: null,
  refreshDIANConfig: async () => {},
});

interface DIANModeProviderProps {
  children: ReactNode;
}

// Demo: when the active plan licenses dian_invoicing we synthesize a DIAN
// config that looks fully provisioned, so the rest of the app behaves as if
// electronic invoicing were live (consecutivos, CUFE, etc.).
const DEMO_DIAN_CONFIG: DIANConfig = {
  id: 1,
  is_enabled: true,
  api_url: 'https://api.dian.demo.lyroo.com.co',
  test_mode: false,
  software_id: 'DEMO-SOFT-001',
  software_pin: 'demo',
  api_token: 'demo-token',
  resolution_number: 'RESOLUCION-DIAN-DEMO-2026',
  resolution_prefix: 'FE',
  resolution_from: 1,
  resolution_to: 100000,
  resolution_current: 1247,
  resolution_valid_until: new Date(Date.now() + 365 * 86400000).toISOString(),
  technical_key: 'DEMO-TECH-KEY',
  send_email: true,
  generate_pdf: true,
  certificate_path: '',
  certificate_password: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as unknown as DIANConfig;

export const DIANModeProvider: React.FC<DIANModeProviderProps> = ({ children }) => {
  const [isDIANMode, setIsDIANMode] = useState(false);
  const [dianConfig, setDianConfig] = useState<DIANConfig | null>(null);
  const [planLicensesDian, setPlanLicensesDian] = useState<boolean>(
    () => getCurrentDemoPlan().features.includes('dian_invoicing'),
  );

  const fetchDIANConfig = useCallback(async () => {
    try {
      const config = await wailsConfigService.getDIANConfig();
      setDianConfig(config);
    } catch (error) {
      setDianConfig(null);
    }
  }, []);

  useEffect(() => {
    fetchDIANConfig();
  }, [fetchDIANConfig]);

  // Track plan changes so DIAN simulation enables/disables in real time.
  useEffect(() => {
    const handler = () => setPlanLicensesDian(getCurrentDemoPlan().features.includes('dian_invoicing'));
    window.addEventListener(DEMO_PLAN_CHANGED_EVENT, handler as EventListener);
    return () => window.removeEventListener(DEMO_PLAN_CHANGED_EVENT, handler as EventListener);
  }, []);

  const toggleDIANMode = useCallback(() => {
    setIsDIANMode(prev => !prev);
  }, []);

  const setDIANMode = useCallback((value: boolean) => {
    setIsDIANMode(value);
  }, []);

  // If the demo plan licenses DIAN, prefer the synthesized config over whatever
  // the (mocked) backend returned, so the demo can showcase the full flow.
  const effectiveConfig: DIANConfig | null = planLicensesDian
    ? (dianConfig?.is_enabled ? dianConfig : DEMO_DIAN_CONFIG)
    : dianConfig;
  const isElectronicInvoicingEnabled = planLicensesDian || (dianConfig?.is_enabled ?? false);
  const dianApiUrl = effectiveConfig?.api_url || null;

  return (
    <DIANModeContext.Provider value={{
      isDIANMode,
      toggleDIANMode,
      setDIANMode,
      dianConfig: effectiveConfig,
      isElectronicInvoicingEnabled,
      dianApiUrl,
      refreshDIANConfig: fetchDIANConfig
    }}>
      {children}
    </DIANModeContext.Provider>
  );
};
