// Demo plan catalog. Mirrors the feature keys exposed by the real
// LicenseService.GetEnabledModules() so the demo can showcase how each
// subscription tier looks without any real backend.
//
// The selected plan is persisted in localStorage under DEMO_PLAN_STORAGE_KEY
// so reloads keep the same tier. Switching emits a custom event the layout
// listens to in order to re-fetch the license modules.

export const DEMO_PLAN_STORAGE_KEY = 'demo_selected_plan';
export const DEMO_PLAN_CHANGED_EVENT = 'demoPlanChanged';

export type DemoPlanId = 'basico' | 'restaurante' | 'profesional' | 'empresarial';

export interface DemoPlan {
  id: DemoPlanId;
  name: string;
  tagline: string;
  monthlyPrice: number; // COP
  features: string[];
  highlights: string[]; // Short marketing-style bullets shown on the switcher
  badge?: string; // Optional ribbon ("Recomendado", "Más completo", etc.)
}

// Base features included in every plan. Match LicenseService keys.
const BASE_FEATURES = ['pos_base', 'basic_reports'];

export const DEMO_PLANS: DemoPlan[] = [
  {
    id: 'basico',
    name: 'Básico',
    tagline: 'Para empezar a vender hoy mismo',
    monthlyPrice: 49000,
    features: [...BASE_FEATURES],
    highlights: [
      'Punto de venta y reportes básicos',
      'Ideal para tiendas pequeñas',
    ],
  },
  {
    id: 'restaurante',
    name: 'Restaurante',
    tagline: 'Operación completa de un restaurante',
    monthlyPrice: 119000,
    badge: 'Popular',
    features: [
      ...BASE_FEATURES,
      'tables',
      'combos',
      'inventory',
      'split_bill',
      'kitchen_app',
      'waiter_app',
      'service_charge',
      'multi_printer',
      'customers_module',
    ],
    highlights: [
      'Mesas, combos, inventario',
      'Apps de cocina y meseros',
      'Cargo por servicio y multi-impresora',
    ],
  },
  {
    id: 'profesional',
    name: 'Profesional',
    tagline: 'Facturación electrónica y costos avanzados',
    monthlyPrice: 199000,
    badge: 'Recomendado',
    features: [
      ...BASE_FEATURES,
      'tables',
      'combos',
      'inventory',
      'split_bill',
      'kitchen_app',
      'waiter_app',
      'service_charge',
      'multi_printer',
      'customers_module',
      'dian_invoicing',
      'credit_notes',
      'invoice_limits',
      'profit_report',
      'ingredients',
      'reports_pwa',
      'google_sheets',
    ],
    highlights: [
      'Facturación electrónica DIAN',
      'Notas crédito y costos/ganancias',
      'Reportes web y Google Sheets',
    ],
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    tagline: 'Todo el ecosistema, multi-sucursal e IA',
    monthlyPrice: 349000,
    badge: 'Más completo',
    features: [
      ...BASE_FEATURES,
      'tables',
      'combos',
      'inventory',
      'split_bill',
      'kitchen_app',
      'waiter_app',
      'service_charge',
      'multi_printer',
      'customers_module',
      'dian_invoicing',
      'credit_notes',
      'invoice_limits',
      'profit_report',
      'ingredients',
      'reports_pwa',
      'google_sheets',
      'bold',
      'rappi',
      'mcp_ai',
      'multi_branch',
      'tunneling',
    ],
    highlights: [
      'Datáfono Bold y pedidos Rappi',
      'Asistente IA, multi-sucursal',
      'Acceso remoto via túnel',
    ],
  },
];

export const DEFAULT_DEMO_PLAN_ID: DemoPlanId = 'profesional';

export const getCurrentDemoPlanId = (): DemoPlanId => {
  try {
    const stored = localStorage.getItem(DEMO_PLAN_STORAGE_KEY);
    if (stored && DEMO_PLANS.some(p => p.id === stored)) {
      return stored as DemoPlanId;
    }
  } catch {
    /* localStorage unavailable */
  }
  return DEFAULT_DEMO_PLAN_ID;
};

export const getCurrentDemoPlan = (): DemoPlan => {
  const id = getCurrentDemoPlanId();
  return DEMO_PLANS.find(p => p.id === id) || DEMO_PLANS[0];
};

export const setCurrentDemoPlan = (id: DemoPlanId): void => {
  try {
    localStorage.setItem(DEMO_PLAN_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(DEMO_PLAN_CHANGED_EVENT, { detail: { planId: id } }));
};

export const featuresToModuleMap = (features: string[]): Record<string, boolean> => {
  const map: Record<string, boolean> = {};
  features.forEach(f => { map[f] = true; });
  return map;
};
