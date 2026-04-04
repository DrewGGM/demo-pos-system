import { getAll, getById, create, update, remove, getStore, setStore } from './mockBackend';
import { Employee, CashRegister, CashRegisterReport } from '../types/models';

interface LoginResponse {
  token: string;
  employee: Employee;
}

interface AuthResponse {
  success: boolean;
  message?: string;
}

// Optimized sales summary for cash register (uses SQL aggregation)
export interface CashRegisterSalesSummary {
  by_payment_method: { [key: string]: number };
  by_payment_method_display: { [key: string]: number };
  total: number;
  total_display: number;
  count: number;
  count_display: number;
  service_charge_by_payment?: { [key: string]: number };
  total_service_charge?: number;
}

class WailsAuthService {
  async login(username: string, password: string): Promise<LoginResponse> {
    const employees = getAll<any>('employees');
    const emp = employees.find(
      (e: any) => e.username === username && e.password === password && e.is_active
    );
    if (!emp) throw new Error('Credenciales invalidas');
    const token = btoa(`${emp.id}:${Date.now()}`);
    localStorage.setItem('token', token);
    return { token, employee: emp as Employee };
  }

  async loginWithPIN(pin: string): Promise<LoginResponse> {
    const employees = getAll<any>('employees');
    const emp = employees.find((e: any) => e.pin === pin && e.is_active);
    if (!emp) throw new Error('PIN invalido');
    const token = btoa(`${emp.id}:${Date.now()}`);
    localStorage.setItem('token', token);
    return { token, employee: emp as Employee };
  }

  async logout(): Promise<void> {
    localStorage.removeItem('token');
  }

  async validateToken(token: string): Promise<Employee | null> {
    try {
      const decoded = atob(token);
      const [employeeId] = decoded.split(':');
      if (!employeeId || localStorage.getItem('token') !== token) return null;
      const emp = getById<any>('employees', parseInt(employeeId));
      if (!emp || !emp.is_active) return null;
      return emp as Employee;
    } catch {
      return null;
    }
  }

  async changePassword(_oldPassword: string, _newPassword: string): Promise<AuthResponse> {
    return { success: true, message: 'Contrasena actualizada' };
  }

  async changePIN(_oldPIN: string, _newPIN: string): Promise<AuthResponse> {
    return { success: true, message: 'PIN actualizado' };
  }

  // Cash Register Management
  async openCashRegister(employeeId: number, openingAmount: number, notes: string): Promise<CashRegister> {
    const emp = getById<any>('employees', employeeId);
    const register = create<any>('cash_registers', {
      employee_id: employeeId,
      employee: emp ? { id: emp.id, name: emp.name, email: emp.email || '' } : undefined,
      opening_amount: openingAmount,
      closing_amount: 0,
      expected_amount: openingAmount,
      difference: 0,
      status: 'open',
      notes,
      opened_at: new Date().toISOString(),
      movements: [],
    });
    return register as CashRegister;
  }

  async closeCashRegister(registerId: number, closingAmount: number, notes: string): Promise<CashRegisterReport> {
    const register = getById<any>('cash_registers', registerId);
    if (!register) throw new Error('Caja no encontrada');
    const sales = getAll<any>('sales').filter((s: any) => s.cash_register_id === registerId);
    const totalSales = sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
    const expectedAmount = (register.opening_amount || 0) + totalSales;

    update('cash_registers', registerId, {
      status: 'closed',
      closing_amount: closingAmount,
      expected_amount: expectedAmount,
      difference: closingAmount - expectedAmount,
      closed_at: new Date().toISOString(),
      notes,
    });

    const report: any = {
      id: Date.now(),
      cash_register_id: registerId,
      date: new Date().toISOString(),
      total_sales: totalSales,
      total_cash: totalSales,
      total_card: 0,
      total_digital: 0,
      total_other: 0,
      total_refunds: 0,
      total_discounts: 0,
      total_tax: 0,
      number_of_sales: sales.length,
      number_of_refunds: 0,
      cash_deposits: 0,
      cash_withdrawals: 0,
      opening_balance: register.opening_amount || 0,
      closing_balance: closingAmount,
      expected_balance: expectedAmount,
      difference: closingAmount - expectedAmount,
      notes,
      generated_by: register.employee_id,
      created_at: new Date().toISOString(),
    };
    return report as CashRegisterReport;
  }

  async getOpenCashRegister(employeeId: number): Promise<CashRegister | null> {
    const registers = getAll<any>('cash_registers');
    const open = registers.find((r: any) => r.employee_id === employeeId && r.status === 'open');
    return open ? (open as CashRegister) : null;
  }

  async getCurrentCashRegister(): Promise<CashRegister | null> {
    const registers = getAll<any>('cash_registers');
    const open = registers.find((r: any) => r.status === 'open');
    return open ? (open as CashRegister) : null;
  }

  async addCashMovement(
    registerId: number,
    amount: number,
    type: 'deposit' | 'withdrawal',
    description: string,
    reference: string,
    employeeId: number
  ): Promise<void> {
    const register = getById<any>('cash_registers', registerId);
    if (!register) throw new Error('Caja no encontrada');
    const movements = register.movements || [];
    movements.push({
      id: Date.now(),
      cash_register_id: registerId,
      type,
      amount,
      description,
      reason: description,
      reference,
      employee_id: employeeId,
      created_at: new Date().toISOString(),
    });
    update('cash_registers', registerId, { movements });
  }

  async updateCashMovement(
    movementId: number,
    amount: number,
    type: 'deposit' | 'withdrawal',
    description: string
  ): Promise<void> {
    const registers = getAll<any>('cash_registers');
    for (const reg of registers) {
      const movements = reg.movements || [];
      const idx = movements.findIndex((m: any) => m.id === movementId);
      if (idx !== -1) {
        movements[idx] = { ...movements[idx], amount, type, description };
        update('cash_registers', reg.id, { movements });
        return;
      }
    }
  }

  async deleteCashMovement(movementId: number): Promise<void> {
    const registers = getAll<any>('cash_registers');
    for (const reg of registers) {
      const movements = reg.movements || [];
      const idx = movements.findIndex((m: any) => m.id === movementId);
      if (idx !== -1) {
        movements.splice(idx, 1);
        update('cash_registers', reg.id, { movements });
        return;
      }
    }
  }

  async getCashRegisterReport(_reportId: number): Promise<CashRegisterReport> {
    return {
      id: _reportId,
      cash_register_id: 0,
      date: new Date().toISOString(),
      total_sales: 0,
      total_cash: 0,
      total_card: 0,
      total_digital: 0,
      total_other: 0,
      total_refunds: 0,
      total_discounts: 0,
      total_tax: 0,
      number_of_sales: 0,
      number_of_refunds: 0,
      cash_deposits: 0,
      cash_withdrawals: 0,
      opening_balance: 0,
      closing_balance: 0,
      expected_balance: 0,
      difference: 0,
      notes: '',
      generated_by: 0,
      created_at: new Date().toISOString(),
    } as CashRegisterReport;
  }

  async printCurrentCashRegisterReport(_registerId: number): Promise<void> {
  }

  async printLastCashRegisterReport(_employeeId: number): Promise<void> {
  }

  async getEmployees(): Promise<Employee[]> {
    return getAll<any>('employees') as Employee[];
  }

  async getEmployee(id: number): Promise<Employee> {
    const emp = getById<any>('employees', id);
    if (!emp) throw new Error('Error al obtener empleado');
    return emp as Employee;
  }

  async createEmployee(employee: Partial<Employee>, password: string, pin: string): Promise<void> {
    create('employees', {
      ...employee,
      password,
      pin,
      is_active: employee.is_active ?? true,
    } as any);
  }

  async updateEmployee(id: number, employee: Partial<Employee>): Promise<void> {
    update('employees', id, employee as any);
  }

  async deleteEmployee(id: number): Promise<void> {
    remove('employees', id);
  }

  // Cash Register History
  async getCashRegisterHistory(limit: number = 20, offset: number = 0): Promise<CashRegister[]> {
    const registers = getAll<any>('cash_registers');
    const sorted = registers.sort((a: any, b: any) =>
      new Date(b.opened_at || b.created_at).getTime() - new Date(a.opened_at || a.created_at).getTime()
    );
    return sorted.slice(offset, offset + limit) as CashRegister[];
  }

  // Optimized sales summary for cash register
  async getCashRegisterSalesSummary(_registerId: number, _onlyElectronic: boolean = false): Promise<CashRegisterSalesSummary> {
    const sales = getAll<any>('sales').filter((s: any) => s.cash_register_id === _registerId);
    const total = sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
    return {
      by_payment_method: { cash: total },
      by_payment_method_display: { Efectivo: total },
      total,
      total_display: total,
      count: sales.length,
      count_display: sales.length,
      service_charge_by_payment: {},
      total_service_charge: 0,
    };
  }
}

export const wailsAuthService = new WailsAuthService();
