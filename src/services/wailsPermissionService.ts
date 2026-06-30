// Wrapper around the Go PermissionService.
//
// Two consumption modes:
//   - Cashier flow: getMine() once on login → snapshot map<code,value>.
//     Components use hooks/usePermissions to check can('code') without RPC.
//   - Admin flow: listMatrix() / setRolePermission() for the role × code grid.
//
// Demo fallback: when the Wails binding is missing (running the frontend
// standalone with `npm run dev`, or before `wails generate bindings` has been
// re-run after adding the service), we serve a baseline matrix that mirrors
// what database.seedPermissions writes. This keeps the demo functional and
// lets devs iterate on the UI without rebuilding Go.

const W = (window as any).go?.services?.PermissionService;

// Baseline matrix mirrored from app/database/connection.go::seedPermissions.
// Keep these in sync — they're the source of truth when Wails isn't running.
const DEMO_PERMISSIONS: Permission[] = [
  { id: 1, code: 'pos.discount.apply', name: 'Aplicar descuento', description: 'Permite aplicar descuentos sobre la orden en el punto de venta.', category: 'pos', type: 'boolean', default_value: 'false', display_order: 10 },
  { id: 2, code: 'pos.discount.max_percent', name: 'Máximo % de descuento', description: 'Porcentaje máximo de descuento que este rol puede aplicar. 0 = sin límite.', category: 'pos', type: 'number', default_value: '0', display_order: 11 },
  { id: 3, code: 'pos.order.cancel', name: 'Cancelar órdenes', description: 'Permite cancelar órdenes pendientes desde el POS.', category: 'pos', type: 'boolean', default_value: 'true', display_order: 20 },
  { id: 4, code: 'pos.cash_register.open', name: 'Abrir caja', description: 'Permite abrir una sesión de caja.', category: 'pos', type: 'boolean', default_value: 'true', display_order: 30 },
  { id: 5, code: 'pos.cash_register.close', name: 'Cerrar caja', description: 'Permite cerrar la sesión de caja al final del turno.', category: 'pos', type: 'boolean', default_value: 'true', display_order: 31 },
  { id: 6, code: 'reports.view', name: 'Ver reportes', description: 'Acceso al módulo de reportes.', category: 'reports', type: 'boolean', default_value: 'true', display_order: 50 },
  { id: 7, code: 'reports.profit.view', name: 'Ver utilidad', description: 'Permite ver márgenes y utilidad. Sensible — sólo perfiles confiables.', category: 'reports', type: 'boolean', default_value: 'false', display_order: 51 },
  { id: 8, code: 'settings.access', name: 'Acceso a configuración', description: 'Acceso al panel de configuración del sistema.', category: 'settings', type: 'boolean', default_value: 'false', display_order: 70 },
  { id: 9, code: 'products.manage', name: 'Administrar productos', description: 'Crear, editar y eliminar productos y categorías.', category: 'catalog', type: 'boolean', default_value: 'false', display_order: 80 },
  { id: 10, code: 'employees.manage', name: 'Administrar empleados', description: 'Crear, editar y eliminar empleados, y modificar permisos.', category: 'admin', type: 'boolean', default_value: 'false', display_order: 90 },
];

const DEMO_MATRIX: Record<string, Record<string, string>> = {
  admin: {
    'pos.discount.apply': 'true', 'pos.discount.max_percent': '0',
    'pos.order.cancel': 'true', 'pos.cash_register.open': 'true', 'pos.cash_register.close': 'true',
    'reports.view': 'true', 'reports.profit.view': 'true',
    'settings.access': 'true', 'products.manage': 'true', 'employees.manage': 'true',
  },
  cashier: {
    'pos.discount.apply': 'true', 'pos.discount.max_percent': '10',
    'pos.order.cancel': 'true', 'pos.cash_register.open': 'true', 'pos.cash_register.close': 'true',
    'reports.view': 'true', 'reports.profit.view': 'false',
    'settings.access': 'false', 'products.manage': 'false', 'employees.manage': 'false',
  },
  waiter: {
    'pos.discount.apply': 'false', 'pos.discount.max_percent': '0',
    'pos.order.cancel': 'true', 'pos.cash_register.open': 'false', 'pos.cash_register.close': 'false',
    'reports.view': 'false', 'reports.profit.view': 'false',
    'settings.access': 'false', 'products.manage': 'false', 'employees.manage': 'false',
  },
  kitchen: {
    'pos.discount.apply': 'false',
    'pos.order.cancel': 'false',
    'reports.view': 'false', 'reports.profit.view': 'false',
    'settings.access': 'false', 'products.manage': 'false', 'employees.manage': 'false',
  },
};

// Override layer para la pantalla de Permisos en modo demo. Persistimos en
// localStorage para que el ajuste sobreviva un reload (antes vivía en
// memoria y se perdía). Cuando hay Wails real este storage se ignora.
const DEMO_OVERRIDES_KEY = 'pos_demo_permission_overrides';

function loadOverrides(): Record<string, Record<string, string>> {
  try {
    const raw = localStorage.getItem(DEMO_OVERRIDES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveOverrides(overrides: Record<string, Record<string, string>>) {
  try { localStorage.setItem(DEMO_OVERRIDES_KEY, JSON.stringify(overrides)); } catch { /* ignore quota */ }
}

const demoOverrides: Record<string, Record<string, string>> = loadOverrides();

function resolveDemoValue(role: string, code: string): string {
  const r = role.toLowerCase();
  const override = demoOverrides[r]?.[code];
  if (override !== undefined) return override;
  const matrixValue = DEMO_MATRIX[r]?.[code];
  if (matrixValue !== undefined) return matrixValue;
  const perm = DEMO_PERMISSIONS.find((p) => p.code === code);
  return perm?.default_value ?? '';
}

export function isPermissionsDemoMode(): boolean {
  return !W;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  type: 'boolean' | 'number' | string;
  default_value: string;
  display_order: number;
}

export interface RoleMatrixRow {
  role: string;
  code: string;
  name: string;
  description: string;
  category: string;
  type: 'boolean' | 'number' | string;
  default_value: string;
  value: string;
  has_override: boolean;
  display_order: number;
}

function mapPerm(p: any): Permission {
  return {
    id: p.id as number,
    code: p.code || '',
    name: p.name || '',
    description: p.description || '',
    category: p.category || '',
    type: p.type || 'boolean',
    default_value: p.default_value || '',
    display_order: p.display_order || 0,
  };
}

function mapRow(r: any): RoleMatrixRow {
  return {
    role: r.role || '',
    code: r.code || '',
    name: r.name || '',
    description: r.description || '',
    category: r.category || '',
    type: r.type || 'boolean',
    default_value: r.default_value || '',
    value: r.value || '',
    has_override: r.has_override === true,
    display_order: r.display_order || 0,
  };
}

class WailsPermissionService {
  async listPermissions(): Promise<Permission[]> {
    if (!W) return DEMO_PERMISSIONS;
    try {
      const rows = await W.ListPermissions();
      return (rows || []).map(mapPerm);
    } catch (err: any) {
      throw new Error(err?.message || 'Error al cargar permisos');
    }
  }

  async listMatrix(): Promise<RoleMatrixRow[]> {
    if (!W) {
      // Demo fallback: synthesize the full role × permission grid from the
      // baseline matrix, with overrides applied so admin edits during the
      // session are reflected.
      const roles = Object.keys(DEMO_MATRIX);
      const out: RoleMatrixRow[] = [];
      for (const role of roles) {
        for (const perm of DEMO_PERMISSIONS) {
          const value = resolveDemoValue(role, perm.code);
          const baseline = DEMO_MATRIX[role]?.[perm.code];
          const override = demoOverrides[role]?.[perm.code];
          out.push({
            role,
            code: perm.code,
            name: perm.name,
            description: perm.description,
            category: perm.category,
            type: perm.type,
            default_value: perm.default_value,
            value,
            has_override:
              override !== undefined || (baseline !== undefined && baseline !== perm.default_value),
            display_order: perm.display_order,
          });
        }
      }
      return out;
    }
    try {
      const rows = await W.ListRoleMatrix();
      return (rows || []).map(mapRow);
    } catch (err: any) {
      throw new Error(err?.message || 'Error al cargar matriz de permisos');
    }
  }

  // Returns the effective code → value map for the given employee. When the
  // Wails backend is available we ask the resolver (which respects DB
  // overrides). In demo mode (`!W`) we synthesize the snapshot from the
  // baseline matrix using the provided roleHint — the hook supplies it from
  // useAuth().user.role.
  async getForEmployee(employeeID: number, roleHint?: string): Promise<Record<string, string>> {
    if (W && employeeID) {
      try {
        const m = await W.EmployeePermissions(employeeID);
        if (m && Object.keys(m).length > 0) return m;
      } catch {
        // fall through to demo fallback so the UI keeps working
      }
    }
    if (!roleHint) return {};
    const snapshot: Record<string, string> = {};
    for (const perm of DEMO_PERMISSIONS) {
      snapshot[perm.code] = resolveDemoValue(roleHint, perm.code);
    }
    return snapshot;
  }

  async setRolePermission(role: string, code: string, value: string): Promise<void> {
    if (W) {
      await W.SetRolePermission(role, code, value);
      return;
    }
    // Demo mode: persist to the localStorage-backed override layer. Sobrevive reloads.
    const r = role.toLowerCase();
    if (!demoOverrides[r]) demoOverrides[r] = {};
    demoOverrides[r][code] = value;
    saveOverrides(demoOverrides);
  }
}

export const wailsPermissionService = new WailsPermissionService();
