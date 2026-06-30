// Mock DIAN service. Persistimos la config en localStorage para que el
// wizard de Setup avance pasos coherentemente entre recargas.
// Antes todos los métodos eran no-op y la UI siempre mostraba toast de
// éxito pero el progreso se perdía al refrescar.
import { getStore, setStore } from './mockBackend';

const CONFIG_KEY = 'dian_config';

const DEFAULTS = {
  enabled: false,
  environment: 'test' as 'test' | 'production',
  company_configured: false,
  software_configured: false,
  certificate_configured: false,
  logo_configured: false,
  resolution_configured: false,
  credit_note_resolution_configured: false,
  debit_note_resolution_configured: false,
  nit: '',
  business_name: '',
  software_id: '',
  software_pin: '',
  resolution_prefix: 'SETP',
  resolution_number_start: 990000000,
  resolution_number_end: 990001000,
  resolution_current: 990000000,
  alert_threshold: 100,
};

function getCfg(): any {
  return getStore<any>(CONFIG_KEY, DEFAULTS);
}

function setCfg(patch: any): any {
  const next = { ...getCfg(), ...patch };
  setStore(CONFIG_KEY, next);
  return next;
}

export const wailsDianService = {
  async getConfig(): Promise<any> {
    return getCfg();
  },

  async updateConfig(config: any): Promise<void> {
    setCfg(config || {});
  },

  async configureCompany(data?: any): Promise<any> {
    setCfg({ ...(data || {}), company_configured: true });
    return { success: true };
  },

  async configureSoftware(data?: any): Promise<void> {
    setCfg({ ...(data || {}), software_configured: true });
  },

  async configureCertificate(data?: any): Promise<void> {
    setCfg({ ...(data || {}), certificate_configured: true });
  },

  async configureLogo(_data?: any): Promise<void> {
    setCfg({ logo_configured: true });
  },

  async configureResolution(data?: any): Promise<void> {
    setCfg({
      ...(data || {}),
      resolution_configured: true,
      resolution_current: data?.resolution_number_start ?? getCfg().resolution_number_start,
    });
  },

  async configureCreditNoteResolution(data?: any): Promise<void> {
    setCfg({ ...(data || {}), credit_note_resolution_configured: true });
  },

  async configureDebitNoteResolution(data?: any): Promise<void> {
    setCfg({ ...(data || {}), debit_note_resolution_configured: true });
  },

  async changeEnvironment(environment: 'test' | 'production'): Promise<void> {
    setCfg({ environment });
  },

  async getNumberingRanges(): Promise<any> {
    const cfg = getCfg();
    return {
      ranges: [
        {
          prefix: cfg.resolution_prefix,
          start: cfg.resolution_number_start,
          end: cfg.resolution_number_end,
          current: cfg.resolution_current,
        },
      ],
    };
  },

  async migrateToProduction(): Promise<void> {
    setCfg({ environment: 'production' });
  },

  async testConnection(): Promise<void> {
    const cfg = getCfg();
    if (!cfg.company_configured || !cfg.software_configured) {
      throw new Error('Falta configurar empresa o software antes de probar conexión');
    }
  },

  async resetConfigurationSteps(): Promise<void> {
    setCfg({
      company_configured: false,
      software_configured: false,
      certificate_configured: false,
      logo_configured: false,
      resolution_configured: false,
      credit_note_resolution_configured: false,
      debit_note_resolution_configured: false,
    });
  },

  async resendInvoiceEmail(_prefix: string, _invoiceNumber: string): Promise<void> {
    // No-op simulado (no hay SMTP en demo). El llamador asume éxito.
  },

  async resetTestResolution(): Promise<void> {
    setCfg({ resolution_current: getCfg().resolution_number_start });
  },

  async registerNewResolution(data?: any): Promise<void> {
    setCfg({
      resolution_prefix: data?.prefix || getCfg().resolution_prefix,
      resolution_number_start: data?.start ?? getCfg().resolution_number_start,
      resolution_number_end: data?.end ?? getCfg().resolution_number_end,
      resolution_current: data?.start ?? getCfg().resolution_number_start,
      resolution_configured: true,
    });
  },

  async getResolutionLimitStatus(): Promise<{
    remaining_invoices: number;
    alert_threshold: number;
    is_near_limit: boolean;
    current_number: number;
    end_number: number;
  }> {
    const cfg = getCfg();
    const current = cfg.resolution_current || 0;
    const end = cfg.resolution_number_end || 0;
    const remaining = Math.max(0, end - current);
    return {
      remaining_invoices: remaining,
      alert_threshold: cfg.alert_threshold || 100,
      is_near_limit: remaining <= (cfg.alert_threshold || 100),
      current_number: current,
      end_number: end,
    };
  },

  async updateAlertThreshold(threshold: number): Promise<void> {
    setCfg({ alert_threshold: threshold });
  },

  async getNextConsecutive(typeDocumentId: number, prefix: string): Promise<{
    success: boolean;
    type_document_id: number;
    prefix: string;
    number: number;
  }> {
    const cfg = getCfg();
    const next = (cfg.resolution_current || cfg.resolution_number_start || 1) + 1;
    setCfg({ resolution_current: next });
    return {
      success: true,
      type_document_id: typeDocumentId,
      prefix,
      number: next,
    };
  },
};
