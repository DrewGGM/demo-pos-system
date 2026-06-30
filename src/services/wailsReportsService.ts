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

export interface EmployeePerformance {
  employee_id: number;
  employee_name: string;
  total_sales: number;
  number_of_sales: number;
  average_sale: number;
  total_items: number;
}

// Convierte un ISO string a "YYYY-MM-DD" en local time (no UTC) para que las
// ventas de hoy aparezcan en el rango "hoy" sin importar la zona horaria.
function localDateKey(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function filterSales(sales: any[], startDate: string, endDate: string, onlyElectronic: boolean) {
  return sales.filter((s: any) => {
    const d = localDateKey(s.created_at);
    if (!d || d < startDate || d > endDate) return false;
    if (onlyElectronic && !s.needs_electronic_invoice) return false;
    return true;
  });
}

function buildPaymentBreakdown(filtered: any[]): { [key: string]: number } {
  const methodsCatalog = getAll<any>('payment_methods');
  const methodById = new Map<number, any>(methodsCatalog.map((m: any) => [m.id, m]));
  const breakdown: { [key: string]: number } = {};
  for (const sale of filtered) {
    const details: any[] = Array.isArray(sale.payment_details) ? sale.payment_details : [];
    if (details.length === 0) {
      // Fallback: counted as cash so the dashboard never shows $0 when
      // payment_details wasn't captured.
      breakdown['Efectivo'] = (breakdown['Efectivo'] || 0) + (sale.total || 0);
      continue;
    }
    for (const d of details) {
      const method = d.payment_method || methodById.get(d.payment_method_id);
      const label = method?.name || 'Otro';
      breakdown[label] = (breakdown[label] || 0) + (d.amount || 0);
    }
  }
  return breakdown;
}

function buildTopProducts(filtered: any[]): ProductSalesData[] {
  const productsCatalog = getAll<any>('products');
  const productById = new Map<number, any>(productsCatalog.map((p: any) => [p.id, p]));
  const agg = new Map<number, { name: string; qty: number; total: number }>();
  let grandTotal = 0;
  for (const sale of filtered) {
    const items: any[] = Array.isArray(sale.items) ? sale.items : [];
    for (const item of items) {
      const pid = item.product_id || item.product?.id;
      if (!pid) continue;
      const name = item.product_name || item.product?.name || productById.get(pid)?.name || `Producto #${pid}`;
      const qty = item.quantity || 0;
      const total = item.total ?? (item.unit_price || 0) * qty;
      const entry = agg.get(pid) || { name, qty: 0, total: 0 };
      entry.qty += qty;
      entry.total += total;
      grandTotal += total;
      agg.set(pid, entry);
    }
  }
  const arr = Array.from(agg.entries()).map(([id, v]) => ({
    product_id: id,
    product_name: v.name,
    quantity: v.qty,
    total_sales: v.total,
    percentage: grandTotal > 0 ? Math.round((v.total / grandTotal) * 100) : 0,
  }));
  arr.sort((a, b) => b.quantity - a.quantity);
  return arr.slice(0, 10);
}

function buildHourlySales(filtered: any[]): HourlySalesData[] {
  const buckets: HourlySalesData[] = [];
  for (let h = 0; h < 24; h++) buckets.push({ hour: h, sales: 0, orders: 0 });
  for (const sale of filtered) {
    const d = new Date(sale.created_at || Date.now());
    const h = d.getHours();
    if (h >= 0 && h < 24) {
      buckets[h].sales += sale.total || 0;
      buckets[h].orders += 1;
    }
  }
  return buckets;
}

function buildDailySales(filtered: any[]): DailySalesData[] {
  const byDay = new Map<string, { sales: number; orders: number }>();
  for (const sale of filtered) {
    const d = localDateKey(sale.created_at);
    if (!d) continue;
    const entry = byDay.get(d) || { sales: 0, orders: 0 };
    entry.sales += sale.total || 0;
    entry.orders += 1;
    byDay.set(d, entry);
  }
  return Array.from(byDay.entries())
    .map(([date, v]) => ({ date, sales: v.sales, orders: v.orders }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildSalesReport(startDate: string, endDate: string, onlyElectronic: boolean = false): SalesReport {
  const allSales = getAll<any>('sales');
  const filtered = filterSales(allSales, startDate, endDate, onlyElectronic);

  const total = filtered.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
  const tax = filtered.reduce((sum: number, s: any) => sum + (s.tax || 0), 0);
  const discount = filtered.reduce((sum: number, s: any) => sum + (s.discount || 0), 0);
  const count = filtered.length;

  return {
    period: `${startDate} - ${endDate}`,
    start_date: startDate,
    end_date: endDate,
    total_sales: total,
    total_tax: tax,
    total_discounts: discount,
    number_of_sales: count,
    average_sale: count > 0 ? total / count : 0,
    payment_breakdown: buildPaymentBreakdown(filtered),
    top_products: buildTopProducts(filtered),
    hourly_sales: buildHourlySales(filtered),
    daily_sales: buildDailySales(filtered),
  };
}

function previousPeriod(startDate: string, endDate: string): { prevStart: string; prevEnd: string } {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const spanMs = end.getTime() - start.getTime() + 86400000; // inclusive
  const prevEndDate = new Date(start.getTime() - 86400000);
  const prevStartDate = new Date(prevEndDate.getTime() - spanMs + 86400000);
  return {
    prevStart: localDateKey(prevStartDate.toISOString()),
    prevEnd: localDateKey(prevEndDate.toISOString()),
  };
}

function growth(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

export const wailsReportsService = {
  async getSalesReport(startDate: string, endDate: string, onlyElectronic: boolean = false): Promise<SalesReport | null> {
    return buildSalesReport(startDate, endDate, onlyElectronic);
  },

  async getDailySalesReport(date: string): Promise<SalesReport | null> {
    return buildSalesReport(date, date);
  },

  async getWeeklySalesReport(): Promise<SalesReport | null> {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return buildSalesReport(localDateKey(weekAgo.toISOString()), localDateKey(now.toISOString()));
  },

  async getMonthlySalesReport(year: number, month: number): Promise<SalesReport | null> {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return buildSalesReport(start, end);
  },

  async getSalesByPaymentMethod(startDate: string, endDate: string): Promise<{ [key: string]: number } | null> {
    return buildSalesReport(startDate, endDate).payment_breakdown;
  },

  async getCustomerStats(startDate: string, endDate: string, onlyElectronic: boolean = false): Promise<CustomerStatsData | null> {
    const customers = getAll<any>('customers');
    const sales = filterSales(getAll<any>('sales'), startDate, endDate, onlyElectronic);

    // Cliente "nuevo" = primera venta dentro del rango.
    const allSales = getAll<any>('sales');
    const firstSaleByCustomer = new Map<number, string>();
    for (const s of allSales) {
      const cid = s.customer_id;
      if (!cid) continue;
      const date = localDateKey(s.created_at);
      const prev = firstSaleByCustomer.get(cid);
      if (!prev || date < prev) firstSaleByCustomer.set(cid, date);
    }
    let newCustomers = 0;
    for (const [, firstDate] of firstSaleByCustomer) {
      if (firstDate >= startDate && firstDate <= endDate) newCustomers += 1;
    }

    // Clientes con >=2 ventas en el período = "recurrentes" => tasa de retención.
    const visitsByCustomer = new Map<number, number>();
    for (const s of sales) {
      if (!s.customer_id) continue;
      visitsByCustomer.set(s.customer_id, (visitsByCustomer.get(s.customer_id) || 0) + 1);
    }
    const totalActive = visitsByCustomer.size;
    const repeats = Array.from(visitsByCustomer.values()).filter((v) => v >= 2).length;
    const retentionRate = totalActive > 0 ? (repeats / totalActive) * 100 : 0;
    const totalSpent = sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
    const avgPerCustomer = totalActive > 0 ? totalSpent / totalActive : 0;

    // Frecuencia: visitas promedio por cliente sobre el rango en meses.
    const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
    const months = days / 30;
    const totalVisits = Array.from(visitsByCustomer.values()).reduce((s, v) => s + v, 0);
    const visitFrequency = totalActive > 0 ? totalVisits / totalActive / months : 0;

    return {
      total_customers: customers.length,
      new_customers_month: newCustomers,
      retention_rate: retentionRate,
      average_value_per_customer: avgPerCustomer,
      visit_frequency: visitFrequency,
    };
  },

  async getSalesByCategory(startDate: string, endDate: string, onlyElectronic: boolean = false): Promise<CategorySalesComparison[]> {
    const categories = getAll<any>('categories');
    const productsCatalog = getAll<any>('products');
    const productCategoryById = new Map<number, number>(productsCatalog.map((p: any) => [p.id, p.category_id]));

    const aggregateByCategory = (range: { start: string; end: string }): Map<number, number> => {
      const sales = filterSales(getAll<any>('sales'), range.start, range.end, onlyElectronic);
      const agg = new Map<number, number>();
      for (const sale of sales) {
        const items: any[] = Array.isArray(sale.items) ? sale.items : [];
        for (const it of items) {
          const pid = it.product_id || it.product?.id;
          if (!pid) continue;
          const cid = productCategoryById.get(pid);
          if (!cid) continue;
          const lineTotal = it.total ?? (it.unit_price || 0) * (it.quantity || 0);
          agg.set(cid, (agg.get(cid) || 0) + lineTotal);
        }
      }
      return agg;
    };

    const currAgg = aggregateByCategory({ start: startDate, end: endDate });
    const { prevStart, prevEnd } = previousPeriod(startDate, endDate);
    const prevAgg = aggregateByCategory({ start: prevStart, end: prevEnd });

    return categories.map((c: any) => {
      const curr = currAgg.get(c.id) || 0;
      const prev = prevAgg.get(c.id) || 0;
      return {
        category: c.name,
        current_sales: curr,
        previous_sales: prev,
        growth_percent: growth(curr, prev),
      };
    });
  },

  async getKeyMetricsComparison(startDate: string, endDate: string, onlyElectronic: boolean = false): Promise<KeyMetricsComparison[]> {
    const curr = buildSalesReport(startDate, endDate, onlyElectronic);
    const { prevStart, prevEnd } = previousPeriod(startDate, endDate);
    const prev = buildSalesReport(prevStart, prevEnd, onlyElectronic);

    const uniqueCustomers = (report: SalesReport, rangeStart: string, rangeEnd: string) => {
      const sales = filterSales(getAll<any>('sales'), rangeStart, rangeEnd, onlyElectronic);
      return new Set(sales.map((s: any) => s.customer_id).filter(Boolean)).size;
    };
    const currCust = uniqueCustomers(curr, startDate, endDate);
    const prevCust = uniqueCustomers(prev, prevStart, prevEnd);

    return [
      { metric: 'Ventas Totales', current_value: curr.total_sales, previous_value: prev.total_sales, growth_percent: growth(curr.total_sales, prev.total_sales) },
      { metric: 'Órdenes', current_value: curr.number_of_sales, previous_value: prev.number_of_sales, growth_percent: growth(curr.number_of_sales, prev.number_of_sales) },
      { metric: 'Ticket Promedio', current_value: Math.round(curr.average_sale), previous_value: Math.round(prev.average_sale), growth_percent: growth(curr.average_sale, prev.average_sale) },
      { metric: 'Clientes Únicos', current_value: currCust, previous_value: prevCust, growth_percent: growth(currCust, prevCust) },
    ];
  },

  async getInventoryReport(): Promise<InventoryReport | null> {
    const products = getAll<any>('products');
    const categories = getAll<any>('categories');
    const categoryById = new Map<number, any>(categories.map((c: any) => [c.id, c]));

    // top_moving = productos más vendidos en los últimos 30 días.
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 29);
    const topProducts = buildTopProducts(
      filterSales(getAll<any>('sales'), localDateKey(monthAgo.toISOString()), localDateKey(now.toISOString()), false)
    );

    const productBreakdown = new Map<number, { name: string; products: number; value: number; lowStock: number }>();
    for (const p of products) {
      const cid = p.category_id;
      const entry = productBreakdown.get(cid) || { name: categoryById.get(cid)?.name || 'Sin categoría', products: 0, value: 0, lowStock: 0 };
      entry.products += 1;
      entry.value += (p.cost || p.price || 0) * (p.stock || 0);
      if (p.track_inventory && (p.stock || 0) <= 5) entry.lowStock += 1;
      productBreakdown.set(cid, entry);
    }

    return {
      generated_at: new Date().toISOString(),
      total_products: products.length,
      total_value: products.reduce((sum: number, p: any) => sum + (p.cost || p.price || 0) * (p.stock || 0), 0),
      low_stock_items: products.filter((p: any) => p.track_inventory && (p.stock || 0) > 0 && (p.stock || 0) <= 5),
      out_of_stock_items: products.filter((p: any) => p.track_inventory && (p.stock || 0) === 0),
      top_moving_items: topProducts,
      category_breakdown: Array.from(productBreakdown.values()),
    };
  },

  async getLowStockReport(threshold: number): Promise<any[]> {
    return getAll<any>('products').filter((p: any) => p.track_inventory && (p.stock || 0) <= threshold);
  },

  async getEmployeePerformanceReport(startDate: string, endDate: string): Promise<EmployeePerformance[]> {
    const employees = getAll<any>('employees');
    const employeeById = new Map<number, any>(employees.map((e: any) => [e.id, e]));
    const sales = filterSales(getAll<any>('sales'), startDate, endDate, false);

    const agg = new Map<number, { name: string; total: number; count: number; items: number }>();
    for (const sale of sales) {
      const eid = sale.employee_id || sale.cashier_id;
      if (!eid) continue;
      const name = sale.employee?.name || employeeById.get(eid)?.name || `Empleado #${eid}`;
      const items: any[] = Array.isArray(sale.items) ? sale.items : [];
      const itemQty = items.reduce((s, it) => s + (it.quantity || 0), 0);
      const entry = agg.get(eid) || { name, total: 0, count: 0, items: 0 };
      entry.total += sale.total || 0;
      entry.count += 1;
      entry.items += itemQty;
      agg.set(eid, entry);
    }

    const result: EmployeePerformance[] = Array.from(agg.entries()).map(([id, v]) => ({
      employee_id: id,
      employee_name: v.name,
      total_sales: v.total,
      number_of_sales: v.count,
      average_sale: v.count > 0 ? v.total / v.count : 0,
      total_items: v.items,
    }));
    result.sort((a, b) => b.total_sales - a.total_sales);
    return result;
  },

  async getEmployeeSalesReport(employeeId: number, startDate: string, endDate: string): Promise<SalesReport | null> {
    const sales = getAll<any>('sales').filter((s: any) => (s.employee_id || s.cashier_id) === employeeId);
    const filtered = sales.filter((s: any) => {
      const d = localDateKey(s.created_at);
      return d >= startDate && d <= endDate;
    });
    const total = filtered.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
    const tax = filtered.reduce((sum: number, s: any) => sum + (s.tax || 0), 0);
    const discount = filtered.reduce((sum: number, s: any) => sum + (s.discount || 0), 0);
    const count = filtered.length;
    return {
      period: `${startDate} - ${endDate}`,
      start_date: startDate,
      end_date: endDate,
      total_sales: total,
      total_tax: tax,
      total_discounts: discount,
      number_of_sales: count,
      average_sale: count > 0 ? total / count : 0,
      payment_breakdown: buildPaymentBreakdown(filtered),
      top_products: buildTopProducts(filtered),
      hourly_sales: buildHourlySales(filtered),
      daily_sales: buildDailySales(filtered),
    };
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
