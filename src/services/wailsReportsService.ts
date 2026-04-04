import { getAll } from './mockBackend';

export interface SalesReport {
  period: string;
  start_date: string;
  end_date: string;
  total_sales: number;
  total_tax: number;
  total_discounts: number;
  number_of_sales: number;
  average_sale: number;
  payment_breakdown: { [key: string]: number };
  top_products: ProductSalesData[];
  hourly_sales: HourlySalesData[];
  daily_sales: DailySalesData[];
}

export interface ProductSalesData {
  product_id: number;
  product_name: string;
  quantity: number;
  total_sales: number;
  percentage: number;
}

export interface HourlySalesData {
  hour: number;
  sales: number;
  orders: number;
}

export interface DailySalesData {
  date: string;
  sales: number;
  orders: number;
}

export interface CustomerStatsData {
  total_customers: number;
  new_customers_month: number;
  retention_rate: number;
  average_value_per_customer: number;
  visit_frequency: number;
}

export interface CategorySalesComparison {
  category: string;
  current_sales: number;
  previous_sales: number;
  growth_percent: number;
}

export interface KeyMetricsComparison {
  metric: string;
  current_value: number;
  previous_value: number;
  growth_percent: number;
}

export interface InventoryReport {
  generated_at: string;
  total_products: number;
  total_value: number;
  low_stock_items: any[];
  out_of_stock_items: any[];
  top_moving_items: any[];
  category_breakdown: any[];
}

function buildSalesReport(startDate: string, endDate: string): SalesReport {
  const sales = getAll<any>('sales');
  const filtered = sales.filter((s: any) => {
    const d = (s.created_at || '').slice(0, 10);
    return d >= startDate && d <= endDate;
  });
  const total = filtered.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
  const count = filtered.length;

  const hourly: HourlySalesData[] = [];
  for (let h = 0; h < 24; h++) {
    hourly.push({ hour: h, sales: h >= 11 && h <= 21 ? Math.floor(total / 11) : 0, orders: h >= 11 && h <= 21 ? Math.max(1, Math.floor(count / 11)) : 0 });
  }

  return {
    period: `${startDate} - ${endDate}`,
    start_date: startDate,
    end_date: endDate,
    total_sales: total,
    total_tax: Math.round(total * 0.08),
    total_discounts: 0,
    number_of_sales: count,
    average_sale: count > 0 ? total / count : 0,
    payment_breakdown: { cash: Math.round(total * 0.6), debit_card: Math.round(total * 0.25), credit_card: Math.round(total * 0.15) },
    top_products: [
      { product_id: 3, product_name: 'Bandeja Paisa', quantity: 12, total_sales: 384000, percentage: 30 },
      { product_id: 7, product_name: 'Hamburguesa Clasica', quantity: 15, total_sales: 330000, percentage: 25 },
      { product_id: 4, product_name: 'Lomo de Res', quantity: 8, total_sales: 304000, percentage: 20 },
    ],
    hourly_sales: hourly,
    daily_sales: [{ date: startDate, sales: total, orders: count }],
  };
}

export const wailsReportsService = {
  async getSalesReport(startDate: string, endDate: string, _onlyElectronic: boolean = false): Promise<SalesReport | null> {
    return buildSalesReport(startDate, endDate);
  },

  async getDailySalesReport(date: string): Promise<SalesReport | null> {
    return buildSalesReport(date, date);
  },

  async getWeeklySalesReport(): Promise<SalesReport | null> {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return buildSalesReport(fmt(weekAgo), fmt(now));
  },

  async getMonthlySalesReport(year: number, month: number): Promise<SalesReport | null> {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return buildSalesReport(start, end);
  },

  async getSalesByPaymentMethod(startDate: string, endDate: string): Promise<{ [key: string]: number } | null> {
    const report = buildSalesReport(startDate, endDate);
    return report.payment_breakdown;
  },

  async getCustomerStats(_startDate: string, _endDate: string, _onlyElectronic: boolean = false): Promise<CustomerStatsData | null> {
    const customers = getAll<any>('customers');
    return {
      total_customers: customers.length,
      new_customers_month: Math.min(customers.length, 5),
      retention_rate: 72.5,
      average_value_per_customer: 45000,
      visit_frequency: 2.3,
    };
  },

  async getSalesByCategory(_startDate: string, _endDate: string, _onlyElectronic: boolean = false): Promise<CategorySalesComparison[]> {
    const categories = getAll<any>('categories');
    return categories.map((c: any) => ({
      category: c.name,
      current_sales: Math.floor(Math.random() * 500000) + 100000,
      previous_sales: Math.floor(Math.random() * 500000) + 100000,
      growth_percent: Math.round((Math.random() - 0.3) * 20),
    }));
  },

  async getKeyMetricsComparison(_startDate: string, _endDate: string, _onlyElectronic: boolean = false): Promise<KeyMetricsComparison[]> {
    return [
      { metric: 'Ventas Totales', current_value: 2500000, previous_value: 2300000, growth_percent: 8.7 },
      { metric: 'Ticket Promedio', current_value: 35000, previous_value: 32000, growth_percent: 9.4 },
      { metric: 'Numero de Ventas', current_value: 72, previous_value: 68, growth_percent: 5.9 },
      { metric: 'Clientes', current_value: 45, previous_value: 40, growth_percent: 12.5 },
    ];
  },

  async getInventoryReport(): Promise<InventoryReport | null> {
    const products = getAll<any>('products');
    return {
      generated_at: new Date().toISOString(),
      total_products: products.length,
      total_value: products.reduce((sum: number, p: any) => sum + (p.price || 0) * (p.stock || 0), 0),
      low_stock_items: products.filter((p: any) => p.track_inventory && p.stock <= 5),
      out_of_stock_items: products.filter((p: any) => p.track_inventory && p.stock === 0),
      top_moving_items: products.slice(0, 5),
      category_breakdown: [],
    };
  },

  async getLowStockReport(threshold: number): Promise<any[]> {
    return getAll<any>('products').filter((p: any) => p.track_inventory && p.stock <= threshold);
  },

  async getEmployeePerformanceReport(_startDate: string, _endDate: string): Promise<any> {
    const employees = getAll<any>('employees');
    return employees.map((e: any) => ({
      employee_id: e.id,
      employee_name: e.name,
      total_sales: Math.floor(Math.random() * 1000000) + 200000,
      number_of_sales: Math.floor(Math.random() * 30) + 5,
      average_sale: 35000,
    }));
  },

  async getEmployeeSalesReport(_employeeId: number, startDate: string, endDate: string): Promise<SalesReport | null> {
    return buildSalesReport(startDate, endDate);
  },

  async exportSalesReportCSV(_report: SalesReport): Promise<Uint8Array | null> {
    return new TextEncoder().encode('demo,csv,data\n');
  },

  async exportSalesReportJSON(_report: SalesReport): Promise<Uint8Array | null> {
    return new TextEncoder().encode(JSON.stringify(_report));
  },

  async getDashboardStats(): Promise<any> {
    const sales = getAll<any>('sales');
    return {
      total_sales: sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0),
      total_orders: sales.length,
    };
  },
};
