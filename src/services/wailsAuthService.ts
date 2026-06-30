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

  // Valida la credencial actual contra el empleado del token y persiste la
  // nueva. Antes el método mentía con success:true sin tocar nada, así que
  // el usuario "cambiaba" su clave y al cerrar sesión seguía igual.
  async changePassword(oldPassword: string, newPassword: string): Promise<AuthResponse> {
    if (!newPassword || newPassword.length < 3) {
      return { success: false, message: 'La nueva contraseña es muy corta' };
    }
    const token = localStorage.getItem('token');
    if (!token) return { success: false, message: 'Sesión inválida' };
    const employeeId = parseInt(atob(token).split(':')[0], 10);
    const emp = getById<any>('employees', employeeId);
    if (!emp) return { success: false, message: 'Empleado no encontrado' };
    if (emp.password !== oldPassword) {
      return { success: false, message: 'Contraseña actual incorrecta' };
    }
    update('employees', employeeId, { password: newPassword } as any);
    return { success: true, message: 'Contraseña actualizada' };
  }

  async changePIN(oldPIN: string, newPIN: string): Promise<AuthResponse> {
    if (!newPIN || !/^\d{4,6}$/.test(newPIN)) {
      return { success: false, message: 'El PIN debe tener 4-6 dígitos' };
    }
    const token = localStorage.getItem('token');
    if (!token) return { success: false, message: 'Sesión inválida' };
    const employeeId = parseInt(atob(token).split(':')[0], 10);
    const emp = getById<any>('employees', employeeId);
    if (!emp) return { success: false, message: 'Empleado no encontrado' };
    if (emp.pin !== oldPIN) {
      return { success: false, message: 'PIN actual incorrecto' };
    }
    update('employees', employeeId, { pin: newPIN } as any);
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
      // Movimiento OPENING — la UI lo filtra (reference !== 'OPENING') para
      // no mostrarlo en el historial, pero lo necesita en el array para
      // saber qué empleado abrió la caja con cuánto dinero.
      movements: [{
        id: Date.now(),
        cash_register_id: 0, // se sobrescribe abajo con register.id
        type: 'deposit',
        movement_type: 'in',
        amount: openingAmount,
        description: 'Apertura de caja',
        reason: 'Apertura de caja',
        reference: 'OPENING',
        employee_id: employeeId,
        employee_name: emp?.name || '',
        created_at: new Date().toISOString(),
      }],
    });
    // mockBackend.create asignó id; rellenamos cash_register_id en el primer
    // movement para que las queries por id funcionen.
    if (register?.id && Array.isArray(register.movements)) {
      register.movements[0].cash_register_id = register.id;
      update('cash_registers', register.id, { movements: register.movements } as any);
    }
    return register as CashRegister;
  }

  async closeCashRegister(registerId: number, closingAmount: number, notes: string): Promise<CashRegisterReport> {
    const register = getById<any>('cash_registers', registerId);
    if (!register) throw new Error('Caja no encontrada');
    const sales = getAll<any>('sales').filter((s: any) => s.cash_register_id === registerId);

    // Reconciliation math: expected_amount is opening + cash payments only.
    // Card / transferencia payments increase total_sales but the cashier
    // doesn't count them when closing the drawer (they sit in the bank).
    // Previous version summed sale.total which made the expected always
    // exceed the cash actually in the drawer by the value of card/transfer
    // sales, producing a constant phantom shortage. Now we walk
    // payment_details and only include amounts where the method's
    // affects_cash_register flag is on.
    const methodsCatalog = getAll<any>('payment_methods');
    const methodById = new Map<number, any>(methodsCatalog.map((m: any) => [m.id, m]));
    let totalSales = 0; // gross revenue (every payment counts)
    let totalCash = 0;
    let totalCard = 0;
    let totalDigital = 0;
    let totalOther = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    for (const sale of sales) {
      totalSales += sale.total || 0;
      totalDiscounts += sale.discount || 0;
      totalTax += sale.tax || 0;
      const details: any[] = Array.isArray(sale.payment_details) ? sale.payment_details : [];
      for (const d of details) {
        const method = d.payment_method || methodById.get(d.payment_method_id);
        const amount = d.amount || 0;
        const type = (method?.type || 'cash').toLowerCase();
        if (type === 'cash') totalCash += amount;
        else if (type === 'card' || type === 'debit' || type === 'credit') totalCard += amount;
        else if (type === 'digital' || type === 'transfer' || type === 'qr') totalDigital += amount;
        else totalOther += amount;
      }
    }
    const movements: any[] = Array.isArray(register.movements) ? register.movements : [];
    // addCashMovement guarda `type`; el seed y openCashRegister escriben
    // ambos campos. Aceptamos cualquiera para no perder movimientos.
    // OPENING ya está reflejado en register.opening_amount → lo excluimos
    // del cálculo para no duplicar.
    const isDepositMov = (m: any) =>
      m.reference !== 'OPENING' &&
      (m.movement_type === 'deposit' || m.movement_type === 'in' || m.type === 'deposit' || m.type === 'in');
    const isWithdrawMov = (m: any) =>
      m.movement_type === 'withdrawal' || m.movement_type === 'out' || m.type === 'withdrawal' || m.type === 'out';
    const cashDeposits = movements.filter(isDepositMov).reduce((s, m) => s + (m.amount || 0), 0);
    const cashWithdrawals = movements.filter(isWithdrawMov).reduce((s, m) => s + (m.amount || 0), 0);
    // Expected drawer = opening + cash sales + cash-in movements - cash-out movements.
    const expectedAmount = (register.opening_amount || 0) + totalCash + cashDeposits - cashWithdrawals;

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
      total_cash: totalCash,
      total_card: totalCard,
      total_digital: totalDigital,
      total_other: totalOther,
      total_refunds: 0,
      total_discounts: totalDiscounts,
      total_tax: totalTax,
      number_of_sales: sales.length,
      number_of_refunds: 0,
      cash_deposits: cashDeposits,
      cash_withdrawals: cashWithdrawals,
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
    const emp = getById<any>('employees', employeeId);
    const movements = register.movements || [];
    movements.push({
      id: Date.now(),
      cash_register_id: registerId,
      // Escribimos type Y movement_type para que tanto closeCashRegister
      // (filtra movement_type) como la UI de historial (filtra type) lean
      // el mismo movimiento.
      type,
      movement_type: type === 'deposit' ? 'in' : 'out',
      amount,
      description,
      reason: description,
      reference,
      employee_id: employeeId,
      employee_name: emp?.name || '',
      created_at: new Date().toISOString(),
    });
    update('cash_registers', registerId, { movements } as any);
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

  // Reporte de una caja específica. Antes devolvía solo ceros; ahora reusa
  // closeCashRegister-style math sobre los datos persistidos, lo que da un
  // snapshot real cuando el usuario abre "Ver reporte" desde el historial.
  async getCashRegisterReport(reportId: number): Promise<CashRegisterReport> {
    const register = getById<any>('cash_registers', reportId);
    if (!register) {
      throw new Error('Caja no encontrada');
    }
    const sales = getAll<any>('sales').filter((s: any) => s.cash_register_id === reportId);
    const methodsCatalog = getAll<any>('payment_methods');
    const methodById = new Map<number, any>(methodsCatalog.map((m: any) => [m.id, m]));

    let totalSales = 0, totalCash = 0, totalCard = 0, totalDigital = 0, totalOther = 0;
    let totalDiscounts = 0, totalTax = 0;
    for (const sale of sales) {
      totalSales += sale.total || 0;
      totalDiscounts += sale.discount || 0;
      totalTax += sale.tax || 0;
      const details: any[] = Array.isArray(sale.payment_details) ? sale.payment_details : [];
      for (const d of details) {
        const method = d.payment_method || methodById.get(d.payment_method_id);
        const type = (method?.type || 'cash').toLowerCase();
        const amount = d.amount || 0;
        if (type === 'cash') totalCash += amount;
        else if (type === 'card' || type === 'debit' || type === 'credit') totalCard += amount;
        else if (type === 'digital' || type === 'transfer' || type === 'qr') totalDigital += amount;
        else totalOther += amount;
      }
    }
    const movements: any[] = Array.isArray(register.movements) ? register.movements : [];
    const cashDeposits = movements
      .filter((m: any) => m.reference !== 'OPENING' && (m.movement_type === 'in' || m.movement_type === 'deposit' || m.type === 'deposit' || m.type === 'in'))
      .reduce((s: number, m: any) => s + (m.amount || 0), 0);
    const cashWithdrawals = movements
      .filter((m: any) => m.movement_type === 'out' || m.movement_type === 'withdrawal' || m.type === 'withdrawal' || m.type === 'out')
      .reduce((s: number, m: any) => s + (m.amount || 0), 0);
    const expected = (register.opening_amount || 0) + totalCash + cashDeposits - cashWithdrawals;

    return {
      id: reportId,
      cash_register_id: reportId,
      date: register.opened_at || new Date().toISOString(),
      total_sales: totalSales,
      total_cash: totalCash,
      total_card: totalCard,
      total_digital: totalDigital,
      total_other: totalOther,
      total_refunds: 0,
      total_discounts: totalDiscounts,
      total_tax: totalTax,
      number_of_sales: sales.length,
      number_of_refunds: 0,
      cash_deposits: cashDeposits,
      cash_withdrawals: cashWithdrawals,
      opening_balance: register.opening_amount || 0,
      closing_balance: register.closing_amount || 0,
      expected_balance: expected,
      difference: (register.closing_amount || 0) - expected,
      notes: register.notes || '',
      generated_by: register.employee_id || 0,
      created_at: register.closed_at || register.opened_at || new Date().toISOString(),
    } as CashRegisterReport;
  }

  async printCurrentCashRegisterReport(_registerId: number): Promise<void> {
    if (typeof window !== 'undefined' && typeof window.print === 'function') window.print();
  }

  async printLastCashRegisterReport(_employeeId: number): Promise<void> {
    if (typeof window !== 'undefined' && typeof window.print === 'function') window.print();
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

  // Optimized sales summary for cash register.
  //
  // Aggregates the cash register's sales into the shape the production
  // backend returns (by_payment_method keyed by method type for the
  // reconciliation math, by_payment_method_display keyed by human name
  // for the UI table). by_payment_method respects the `affects_cash_register`
  // flag on each PaymentMethod — credit-card / transferencia payments
  // count toward `total` but NOT toward `by_payment_method.cash` so the
  // expected-vs-actual calc on close doesn't ask the cashier for the card
  // money.
  //
  // _onlyElectronic mirrors the production toggle: when true, restrict to
  // sales flagged needs_electronic_invoice. The cash register UI uses it
  // for the "ventas DIAN" sub-panel.
  async getCashRegisterSalesSummary(_registerId: number, _onlyElectronic: boolean = false): Promise<CashRegisterSalesSummary> {
    const allSales = getAll<any>('sales');
    const sales = allSales.filter((s: any) => {
      if (s.cash_register_id !== _registerId) return false;
      if (_onlyElectronic && !s.needs_electronic_invoice) return false;
      return true;
    });

    const methodsCatalog = getAll<any>('payment_methods');
    const methodById = new Map<number, any>(methodsCatalog.map((m: any) => [m.id, m]));

    const by_payment_method: Record<string, number> = {};
    const by_payment_method_display: Record<string, number> = {};
    const service_charge_by_payment: Record<string, number> = {};
    let total = 0;
    let total_service_charge = 0;

    for (const sale of sales) {
      total += sale.total || 0;
      total_service_charge += sale.service_charge || 0;
      const details: any[] = Array.isArray(sale.payment_details) ? sale.payment_details : [];
      const saleTotal = sale.total || 0;
      const saleService = sale.service_charge || 0;
      const sumDetails = details.reduce((s, d) => s + (d.amount || 0), 0) || saleTotal;
      for (const d of details) {
        const method = d.payment_method || methodById.get(d.payment_method_id);
        const key = (method?.type || 'cash') as string;
        const label = method?.name || 'Efectivo';
        const affectsCash = method?.affects_cash_register !== false;
        const amount = d.amount || 0;
        // affects_cash_register drives reconciliation; everything counts
        // toward display so cashiers can see card / transfer totals too.
        if (affectsCash) {
          by_payment_method[key] = (by_payment_method[key] || 0) + amount;
        }
        by_payment_method_display[label] = (by_payment_method_display[label] || 0) + amount;
        // Service charge is split proportionally by each payment's share of
        // the sale total — mirrors the backend allocation.
        const shareOfService = sumDetails > 0 ? saleService * (amount / sumDetails) : 0;
        service_charge_by_payment[label] = (service_charge_by_payment[label] || 0) + shareOfService;
      }
    }

    return {
      by_payment_method,
      by_payment_method_display,
      total,
      total_display: total,
      count: sales.length,
      count_display: sales.length,
      service_charge_by_payment,
      total_service_charge,
    };
  }
}

export const wailsAuthService = new WailsAuthService();
