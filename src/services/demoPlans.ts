// Demo plan catalog. Mirrors the public Lyroo website pricing
// (https://lyroo.com.co/#precios) so prospects see the same names, prices and
// inclusions as on marketing material. Each plan maps to a feature set
// understood by the rest of the app (LicenseService.GetEnabledModules keys),
// driving sidebar visibility, settings tabs, DIAN simulation, etc.
//
// The selected plan is persisted in localStorage under DEMO_PLAN_STORAGE_KEY
// so reloads keep the same tier. Switching emits a custom event the layout
// listens to in order to re-fetch the license modules.

export const DEMO_PLAN_STORAGE_KEY = 'demo_selected_plan';
export const DEMO_PLAN_CHANGED_EVENT = 'demoPlanChanged';

export type DemoPlanId = 'esencial' | 'comercio' | 'restaurante' | 'business';

export interface DemoPlan {
  id: DemoPlanId;
  name: string;
  tagline: string; // "ideal for ..." line from the website
  monthlyPrice: number; // COP — same numbers as the website
  features: string[]; // Feature-flag keys (LicenseService)
  highlights: string[]; // Marketing bullets shown in the switcher card
  badge?: string; // Ribbon ("Más popular", etc.) — matches website "popular" flag
  hasDian?: boolean; // Mirrors website hasDian — only used to show DIAN chip
}

// Base features included in every plan. Match LicenseService keys.
const BASE_FEATURES = ['pos_base', 'basic_reports'];

export const DEMO_PLANS: DemoPlan[] = [
  {
    id: 'esencial',
    name: 'Esencial',
    tagline: 'Vendedores y micronegocios sin DIAN',
    monthlyPrice: 24900,
    features: [...BASE_FEATURES, 'combos'],
    hasDian: false,
    highlights: [
      'POS táctil completo, 1 usuario',
      'Productos, categorías y combos',
      'Caja registradora con arqueo',
      '1 impresora térmica',
    ],
  },
  {
    id: 'comercio',
    name: 'Comercio',
    tagline: 'Tiendas y comercios con DIAN',
    monthlyPrice: 44900,
    features: [
      ...BASE_FEATURES,
      'combos',
      'inventory',
      'customers_module',
      'dian_invoicing',
      'credit_notes',
      'invoice_limits',
    ],
    hasDian: true,
    highlights: [
      'Facturación electrónica DIAN ilimitada',
      'Notas crédito y débito',
      'Inventario básico + alertas de stock',
      '3 usuarios con roles',
    ],
  },
  {
    id: 'restaurante',
    name: 'Restaurante',
    tagline: 'Restaurantes, cafeterías y bares',
    monthlyPrice: 64900,
    badge: 'Más popular',
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
      'ingredients',
      'reports_pwa',
    ],
    hasDian: true,
    highlights: [
      'Mesas y áreas (drag-and-drop)',
      'App de Cocina (KDS) + App de Meseros',
      'División de cuentas + cargo de servicio',
      'Multi-impresora (caja, cocina), 5 usuarios',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Cadenas, multi-sede y empresas',
    monthlyPrice: 89900,
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
    hasDian: true,
    highlights: [
      'Multi-sede ilimitado',
      'Contabilidad NIIF (Libros, Estados financieros)',
      'Bold, Rappi y Google Sheets',
      'Asistente IA (MCP), 10 usuarios, SLA 24/7',
    ],
  },
];

export const DEFAULT_DEMO_PLAN_ID: DemoPlanId = 'restaurante';

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
