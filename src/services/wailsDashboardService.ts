import { getAll } from './mockBackend';

export interface DashboardStats {
  today_sales: number;
  today_sales_count: number;
  today_orders: number;
  today_customers: number;
  pending_orders: number;
  low_stock_products: number;
  active_tables: number;
  sales_growth: number;
  average_ticket: number;
  top_selling_items: TopSellingItem[];
}

export interface TopSellingItem {
  product_id: number;
  product_name: string;
  quantity: number;
  total_sales: number;
}

export interface SalesChartData {
  date: string;
  sales: number;
  orders: number;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computeStats(): DashboardStats {
  const today = getTodayString();
  const sales = getAll<any>('sales');
  const orders = getAll<any>('orders');
  const tables = getAll<any>('tables');
  const products = getAll<any>('products');

  const todaySales = sales.filter((s: any) => (s.created_at || '').startsWith(today));
  const todayOrders = orders.filter((o: any) => (o.created_at || '').startsWith(today));
  const totalSalesAmount = todaySales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
  const pendingOrders = orders.filter((o: any) => o.status === 'pending' || o.status === 'preparing').length;
  const activeTables = tables.filter((t: any) => t.status === 'occupied').length;
  const lowStock = products.filter((p: any) => p.track_inventory && p.stock <= 5).length;

  // sales_growth: comparar últimos 7 días vs los 7 anteriores. Antes
  // siempre devolvía 5.2 hardcodeado y el dashboard mentía sobre crecimiento.
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const fourteenDaysAgo = Date.now() - 14 * 86400000;
  const sumIfBetween = (from: number, to: number) =>
    sales.reduce((sum: number, s: any) => {
      const t = new Date(s.created_at || 0).getTime();
      if (t >= from && t < to) return sum + (s.total || 0);
      return sum;
    }, 0);
  const last7 = sumIfBetween(sevenDaysAgo, Date.now());
  const prev7 = sumIfBetween(fourteenDaysAgo, sevenDaysAgo);
  const salesGrowth = prev7 === 0 ? (last7 > 0 ? 100 : 0) : ((last7 - prev7) / prev7) * 100;

  // Top selling items — aggregate every product across every sale (not
  // limited to today) so the demo dashboard has something interesting to
  // show even right after a fresh boot. We rank by units sold; ties broken
  // by revenue.
  const productById = new Map<number, any>(products.map((p: any) => [p.id, p]));
  const itemBuckets: Record<number, { product_id: number; product_name: string; quantity: number; total_sales: number }> = {};
  for (const sale of sales) {
    const items = sale.order?.items || [];
    for (const item of items) {
      const id = item.product_id;
      if (!id) continue;
      const product = productById.get(id);
      const bucket = itemBuckets[id] || (itemBuckets[id] = {
        product_id: id,
        product_name: product?.name || item.product?.name || `Producto ${id}`,
        quantity: 0,
        total_sales: 0,
      });
      bucket.quantity += item.quantity || 0;
      bucket.total_sales += item.subtotal || (item.unit_price || 0) * (item.quantity || 0);
    }
  }
  const top_selling_items = Object.values(itemBuckets)
    .sort((a, b) => (b.quantity - a.quantity) || (b.total_sales - a.total_sales))
    .slice(0, 5);

  return {
    today_sales: totalSalesAmount,
    today_sales_count: todaySales.length,
    today_orders: todayOrders.length,
    today_customers: todaySales.length,
    pending_orders: pendingOrders,
    low_stock_products: lowStock,
    active_tables: activeTables,
    sales_growth: Math.round(salesGrowth * 10) / 10,
    average_ticket: todaySales.length > 0 ? totalSalesAmount / todaySales.length : 0,
    top_selling_items,
  };
}

export const wailsDashboardService = {
  async getDashboardStats(): Promise<DashboardStats | null> {
    return computeStats();
  },

  async getSalesChartData(days: number = 7): Promise<SalesChartData[]> {
    const result: SalesChartData[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const daySales = getAll<any>('sales').filter((s: any) => (s.created_at || '').startsWith(dateStr));
      result.push({
        date: dateStr,
        sales: daySales.reduce((sum: number, s: any) => sum + (s.total || 0), 0),
        orders: daySales.length,
      });
    }
    return result;
  },

  async getPendingOrdersDetails(): Promise<any[]> {
    return getAll<any>('orders').filter((o: any) => o.status === 'pending' || o.status === 'preparing');
  },

  async getLowStockProducts(): Promise<any[]> {
    return getAll<any>('products').filter((p: any) => p.track_inventory && p.stock <= 5);
  },

  async getActiveTables(): Promise<any[]> {
    return getAll<any>('tables').filter((t: any) => t.status === 'occupied');
  },

  async getDashboardStatsDIAN(): Promise<DashboardStats | null> {
    return computeStats();
  },

  async getSalesChartDataDIAN(days: number = 7): Promise<SalesChartData[]> {
    return this.getSalesChartData(days);
  },
};
