import { getAll, getById, create, update, remove, generateOrderNumber, generateSaleNumber, initDemoData, getStore, setStore } from './mockBackend';
import { Sale, Customer, PaymentMethod, ProcessSaleData } from '../types/models';

// DIAN Closing Report Types
export interface CategorySalesDetail {
  category_id: number;
  category_name: string;
  quantity: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface TaxBreakdownDetail {
  tax_type_id: number;
  tax_type_name: string;
  tax_percent: number;
  base_amount: number;
  tax_amount: number;
  total: number;
  item_count: number;
}

export interface NoteDetail {
  number: string;
  prefix: string;
  reason: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface PaymentMethodSummary {
  method_id: number;
  method_name: string;
  method_type: string;
  transactions: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export interface DIANClosingReport {
  // Business Info
  business_name: string;
  commercial_name: string;
  nit: string;
  dv: string;
  regime: string;
  liability: string;
  address: string;
  city: string;
  department: string;
  phone: string;
  email: string;
  resolution: string;
  resolution_prefix: string;
  resolution_from: number;
  resolution_to: number;
  resolution_date_from: string;
  resolution_date_to: string;

  // Report Info
  report_date: string;
  generated_at: string;

  // Invoice Range
  first_invoice_number: string;
  last_invoice_number: string;
  total_invoices: number;

  // Sales by Category
  sales_by_category: CategorySalesDetail[];

  // Sales by Tax Type
  sales_by_tax: TaxBreakdownDetail[];

  // Adjustments (Credit/Debit Notes)
  credit_notes: NoteDetail[];
  debit_notes: NoteDetail[];
  total_credit_notes: number;
  total_debit_notes: number;

  // Payment Methods
  payment_methods: PaymentMethodSummary[];

  // Totals
  total_transactions: number;
  total_subtotal: number;
  total_tax: number;
  total_discount: number;
  total_sales: number;
  total_adjustments: number;
  grand_total: number;
}

class WailsSalesService {
  // Sales
  async processSale(saleData: ProcessSaleData): Promise<Sale> {
    if (!saleData.order_id) throw new Error('Order ID is required');
    if (!saleData.employee_id) throw new Error('Employee ID is required');
    if (!saleData.payment_methods || saleData.payment_methods.length === 0) {
      throw new Error('At least one payment method is required');
    }

    const order = getById<any>('orders', saleData.order_id);
    if (!order) throw new Error('Error al procesar venta: orden no encontrada');

    const saleNumber = generateSaleNumber();
    const now = new Date().toISOString();
    const amountPaid = saleData.payment_methods.reduce((sum: number, pm: any) => sum + (pm.amount || 0), 0);

    // Look up customer if provided
    let customer: any = null;
    if (saleData.customer_id) {
      customer = getById<any>('customers', saleData.customer_id);
    }

    // Build payment details
    const allPaymentMethods = getAll<any>('payment_methods');
    const paymentDetails = saleData.payment_methods.map((pm: any, idx: number) => {
      const method = allPaymentMethods.find((m: any) => m.id === pm.payment_method_id);
      return {
        id: Date.now() + idx,
        sale_id: 0,
        payment_method_id: pm.payment_method_id,
        payment_method: method ? {
          id: method.id,
          name: method.name || '',
          type: method.type || 'cash',
          icon: method.icon || '',
          requires_ref: method.requires_ref || false,
          requires_reference: method.requires_ref || false,
          requires_voucher: method.requires_voucher || false,
          is_active: method.is_active ?? true,
          display_order: method.display_order || 0,
        } : undefined,
        amount: pm.amount || 0,
        reference: pm.reference || '',
        voucher_image: pm.voucher_image || '',
      };
    });

    const sale: any = {
      sale_number: saleNumber,
      order_id: order.id,
      order: {
        id: order.id,
        order_number: order.order_number || '',
        type: order.type,
        status: 'paid',
        items: order.items || [],
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        total: order.total || 0,
      },
      customer_id: saleData.customer_id || 0,
      customer: customer ? {
        id: customer.id,
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        identification_type: customer.identification_type || '',
        identification_number: customer.identification_number || '',
      } : undefined,
      employee_id: saleData.employee_id,
      payment_details: paymentDetails,
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      discount: order.discount || 0,
      total: order.total || 0,
      amount_paid: amountPaid,
      change: Math.max(0, amountPaid - (order.total || 0)),
      payment_method: saleData.payment_methods[0]?.payment_method_id ? '' : 'cash',
      status: 'completed',
      invoice_type: saleData.needs_electronic_invoice ? 'electronic' : 'none',
      needs_electronic_invoice: saleData.needs_electronic_invoice || false,
      cash_register_id: saleData.cash_register_id || 0,
      notes: '',
      is_synced: false,
      created_at: now,
      updated_at: now,
    };

    const created = create<any>('sales', sale);

    // Update payment_details sale_id references
    const sales = getAll<any>('sales');
    const saleIdx = sales.findIndex((s: any) => s.id === created.id);
    if (saleIdx !== -1) {
      sales[saleIdx].payment_details = sales[saleIdx].payment_details.map((pd: any) => ({ ...pd, sale_id: created.id }));
      setStore('sales', sales);
    }

    // Mark order as paid
    update<any>('orders', order.id, { status: 'paid' });

    // Free the table if order had one
    if (order.table_id) {
      try {
        update<any>('tables', order.table_id, { status: 'available' });
      } catch (_) { /* ignore */ }
    }

    return this._mapSale(created);
  }

  async getSale(id: number): Promise<Sale> {
    const sale = getById<any>('sales', id);
    if (!sale) throw new Error('Error al obtener venta');
    return this._mapSale(sale);
  }

  async getSales(): Promise<Sale[]> {
    return getAll<any>('sales').map((s: any) => this._mapSale(s));
  }

  async getSalesHistory(limit: number = 100, offset: number = 0): Promise<{ sales: Sale[]; total: number }> {
    const all = getAll<any>('sales');
    const sorted = all.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
    const sliced = sorted.slice(offset, offset + limit);
    return {
      sales: sliced.map((s: any) => this._mapSale(s)),
      total: all.length,
    };
  }

  async resendElectronicInvoice(saleId: number): Promise<void> {
    // no-op in demo
  }

  async convertToElectronicInvoice(saleId: number): Promise<void> {
    update<any>('sales', saleId, { invoice_type: 'electronic', needs_electronic_invoice: true });
  }

  async getSalesReport(startDate?: string, endDate?: string): Promise<any> {
    const sales = getAll<any>('sales');
    const filtered = sales.filter((s: any) => {
      if (startDate && s.created_at < startDate) return false;
      if (endDate && s.created_at > endDate) return false;
      return true;
    });
    return {
      sales: filtered.map((s: any) => this._mapSale(s)),
      total_sales: filtered.reduce((sum: number, s: any) => sum + (s.total || 0), 0),
      count: filtered.length,
    };
  }

  // Payment Methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return getAll<any>('payment_methods').map((m: any) => this._mapPaymentMethod(m));
  }

  async CreatePaymentMethod(method: PaymentMethod): Promise<void> {
    create<any>('payment_methods', method);
  }

  async UpdatePaymentMethod(method: PaymentMethod): Promise<void> {
    if (method.id) {
      update<any>('payment_methods', method.id, method);
    }
  }

  async DeletePaymentMethod(id: number): Promise<void> {
    remove('payment_methods', id);
  }

  async GetPaymentMethods(): Promise<PaymentMethod[]> {
    return this.getPaymentMethods();
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return getAll<any>('customers').map((c: any) => this._mapCustomer(c));
  }

  async getCustomer(id: number): Promise<Customer> {
    const customer = getById<any>('customers', id);
    if (!customer) throw new Error('Error al obtener cliente');
    return this._mapCustomer(customer);
  }

  async createCustomer(customer: Partial<Customer>): Promise<void> {
    create<any>('customers', { ...customer, is_active: true });
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<void> {
    update<any>('customers', id, customer);
  }

  async deleteCustomer(id: number): Promise<void> {
    remove('customers', id);
  }

  async getCustomerStats(onlyElectronic: boolean = false): Promise<{
    total_customers: number;
    total_purchases: number;
    total_spent: number;
    top_customers: Array<{ id: number; name: string; total_spent: number }>;
  }> {
    const customers = getAll<any>('customers');
    const sales = getAll<any>('sales');
    const topCustomers = customers
      .filter((c: any) => c.id !== 1) // Exclude CONSUMIDOR FINAL
      .map((c: any) => {
        const customerSales = sales.filter((s: any) => s.customer_id === c.id);
        return {
          id: c.id,
          name: c.name || '',
          total_spent: customerSales.reduce((sum: number, s: any) => sum + (s.total || 0), 0),
        };
      })
      .sort((a: any, b: any) => b.total_spent - a.total_spent)
      .slice(0, 10);

    return {
      total_customers: customers.length,
      total_purchases: sales.length,
      total_spent: sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0),
      top_customers: topCustomers,
    };
  }

  // Utility methods
  calculateSubtotal(items: any[]): number {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  calculateTax(subtotal: number, taxRate: number = 0.19): number {
    return subtotal * taxRate;
  }

  calculateTotal(subtotal: number, tax: number, discount: number = 0): number {
    return subtotal + tax - discount;
  }

  calculateChange(total: number, paid: number): number {
    return paid - total;
  }

  async printReceipt(saleId: number): Promise<void> {
    // no-op in demo
  }

  async printInvoice(saleId: number): Promise<void> {
  }

  async exportSalesReport(startDate?: Date, endDate?: Date): Promise<Blob> {
    const report = await this.getSalesReport(
      startDate?.toISOString(),
      endDate?.toISOString()
    );
    return new Blob([JSON.stringify(report)], { type: 'application/json' });
  }

  // Additional methods for Redux slices
  async getTodaySales(): Promise<Sale[]> {
    const today = new Date().toISOString().split('T')[0];
    return getAll<any>('sales')
      .filter((s: any) => s.created_at?.startsWith(today))
      .map((s: any) => this._mapSale(s));
  }

  async refundSale(saleId: number, amount: number, reason: string, employeeId: number): Promise<void> {
    const sale = getById<any>('sales', saleId);
    if (!sale) throw new Error('Error al reembolsar venta');
    const newStatus = amount >= (sale.total || 0) ? 'refunded' : 'partial_refund';
    update<any>('sales', saleId, { status: newStatus, notes: (sale.notes ? sale.notes + ' | ' : '') + 'Reembolso: ' + reason });
  }

  async deleteSale(saleId: number, employeeId: number): Promise<void> {
    remove('sales', saleId);
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const customers = getAll<any>('customers');
    const q = query.toLowerCase();
    return customers
      .filter((c: any) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.identification_number || '').includes(query) ||
        (c.email || '').toLowerCase().includes(q)
      )
      .map((c: any) => this._mapCustomer(c));
  }

  async sendElectronicInvoice(saleId: number): Promise<void> {
    // no-op in demo
  }

  async updateSaleCustomer(saleId: number, customerId: number): Promise<void> {
    const customer = getById<any>('customers', customerId);
    update<any>('sales', saleId, {
      customer_id: customerId,
      customer: customer ? {
        id: customer.id,
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        identification_type: customer.identification_type || '',
        identification_number: customer.identification_number || '',
      } : undefined,
    });
  }

  // DIAN Closing Report Methods
  async getDIANClosingReport(date: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' = 'daily', endDate?: string): Promise<DIANClosingReport> {
    const config = getStore<any>('restaurant_config', {});
    const sales = getAll<any>('sales');
    const filteredSales = sales.filter((s: any) => {
      const saleDate = (s.created_at || '').split('T')[0];
      if (period === 'daily') return saleDate === date;
      if (period === 'custom' && endDate) return saleDate >= date && saleDate <= endDate;
      return saleDate >= date;
    });

    const totalSales = filteredSales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
    const totalTax = filteredSales.reduce((sum: number, s: any) => sum + (s.tax || 0), 0);
    const totalSubtotal = filteredSales.reduce((sum: number, s: any) => sum + (s.subtotal || 0), 0);
    const totalDiscount = filteredSales.reduce((sum: number, s: any) => sum + (s.discount || 0), 0);

    return {
      business_name: config.business_name || 'Demo Restaurant S.A.S',
      commercial_name: config.name || 'Restaurant Demo POS',
      nit: config.nit || '900123456',
      dv: '7',
      regime: 'Responsable de IVA',
      liability: 'O-13',
      address: config.address || '',
      city: 'Armenia',
      department: 'Quindio',
      phone: config.phone || '',
      email: config.email || '',
      resolution: 'No configurada (Demo)',
      resolution_prefix: 'FE',
      resolution_from: 1,
      resolution_to: 10000,
      resolution_date_from: '2024-01-01',
      resolution_date_to: '2026-12-31',
      report_date: date,
      generated_at: new Date().toISOString(),
      first_invoice_number: filteredSales.length > 0 ? filteredSales[0].sale_number || '' : '',
      last_invoice_number: filteredSales.length > 0 ? filteredSales[filteredSales.length - 1].sale_number || '' : '',
      total_invoices: filteredSales.length,
      sales_by_category: [],
      sales_by_tax: [{
        tax_type_id: 1,
        tax_type_name: 'IVA 19%',
        tax_percent: 19,
        base_amount: totalSubtotal,
        tax_amount: totalTax,
        total: totalSales,
        item_count: filteredSales.length,
      }],
      credit_notes: [],
      debit_notes: [],
      total_credit_notes: 0,
      total_debit_notes: 0,
      payment_methods: [],
      total_transactions: filteredSales.length,
      total_subtotal: totalSubtotal,
      total_tax: totalTax,
      total_discount: totalDiscount,
      total_sales: totalSales,
      total_adjustments: 0,
      grand_total: totalSales,
    };
  }

  async printDIANClosingReport(date: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' = 'daily', endDate?: string): Promise<void> {
  }

  // Internal mappers
  private _mapSale(s: any): Sale {
    return {
      id: s.id,
      sale_number: s.sale_number || '',
      order_id: s.order_id,
      order: s.order,
      customer_id: s.customer_id,
      customer: s.customer,
      employee_id: s.employee_id,
      employee: s.employee,
      payment_details: s.payment_details || [],
      subtotal: s.subtotal || 0,
      tax: s.tax || 0,
      discount: s.discount || 0,
      total: s.total || 0,
      amount_paid: s.amount_paid || 0,
      change: s.change || 0,
      payment_method: s.payment_method || '',
      status: s.status as 'completed' | 'refunded' | 'partial_refund',
      invoice_type: s.invoice_type || 'none',
      needs_electronic_invoice: s.needs_electronic_invoice || false,
      electronic_invoice: s.electronic_invoice,
      cash_register_id: s.cash_register_id,
      notes: s.notes || '',
      is_synced: s.is_synced || false,
      created_at: s.created_at || new Date().toISOString(),
      updated_at: s.updated_at || new Date().toISOString(),
    } as Sale;
  }

  private _mapCustomer(c: any): Customer {
    return {
      id: c.id,
      identification_type: c.identification_type || '',
      identification_number: c.identification_number || '',
      document_type: c.identification_type,
      document_number: c.identification_number,
      dv: c.dv || '',
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      city: c.city || '',
      is_active: c.is_active ?? true,
      notes: c.notes || '',
      total_spent: c.total_spent || 0,
      total_purchases: c.total_purchases || 0,
      loyalty_points: c.loyalty_points || 0,
      type_regime_id: c.type_regime_id,
      type_liability_id: c.type_liability_id,
      municipality_id: c.municipality_id,
      created_at: c.created_at || new Date().toISOString(),
      updated_at: c.updated_at || new Date().toISOString(),
    } as Customer;
  }

  private _mapPaymentMethod(m: any): PaymentMethod {
    return {
      id: m.id,
      name: m.name || '',
      type: m.type as 'cash' | 'digital' | 'card' | 'check' | 'other',
      icon: m.icon || '',
      requires_ref: m.requires_ref || false,
      requires_reference: m.requires_ref || false,
      requires_voucher: m.requires_voucher || false,
      dian_payment_method_id: m.dian_payment_method_id,
      affects_cash_register: m.affects_cash_register !== false,
      show_in_cash_summary: m.show_in_cash_summary !== false,
      code: m.code || '',
      is_active: m.is_active ?? true,
      display_order: m.display_order || 0,
      use_bold_terminal: m.use_bold_terminal || false,
      bold_payment_method: m.bold_payment_method || '',
      created_at: m.created_at || new Date().toISOString(),
      updated_at: m.updated_at || new Date().toISOString(),
    } as PaymentMethod;
  }
}

export const wailsSalesService = new WailsSalesService();
