// Wrapper around the Go PermissionService.
//
// Two consumption modes:
//   - Cashier flow: getMine() once on login → snapshot map<code,value>.
//     Components use hooks/usePermissions to check can('code') without RPC.
//   - Admin flow: listMatrix() / setRolePermission() for the role × code grid.

const W = (window as any).go?.services?.PermissionService;

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
    if (!W) return [];
    try {
      const rows = await W.ListPermissions();
      return (rows || []).map(mapPerm);
    } catch (err: any) {
      throw new Error(err?.message || 'Error al cargar permisos');
    }
  }

  async listMatrix(): Promise<RoleMatrixRow[]> {
    if (!W) return [];
    try {
      const rows = await W.ListRoleMatrix();
      return (rows || []).map(mapRow);
    } catch (err: any) {
      throw new Error(err?.message || 'Error al cargar matriz de permisos');
    }
  }

  // Returns the effective code → value map for the given employee. The map is
  // ready to drop into the usePermissions provider.
  async getForEmployee(employeeID: number): Promise<Record<string, string>> {
    if (!W || !employeeID) return {};
    try {
      const m = await W.EmployeePermissions(employeeID);
      return m || {};
    } catch {
      return {};
    }
  }

  async setRolePermission(role: string, code: string, value: string): Promise<void> {
    if (!W) throw new Error('PermissionService no disponible');
    await W.SetRolePermission(role, code, value);
  }
}

export const wailsPermissionService = new WailsPermissionService();
