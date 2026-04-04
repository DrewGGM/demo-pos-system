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

  return {
    today_sales: totalSalesAmount,
    today_sales_count: todaySales.length,
    today_orders: todayOrders.length,
    today_customers: todaySales.length,
    pending_orders: pendingOrders,
    low_stock_products: lowStock,
    active_tables: activeTables,
    sales_growth: 5.2,
    average_ticket: todaySales.length > 0 ? totalSalesAmount / todaySales.length : 0,
    top_selling_items: [
      { product_id: 3, product_name: 'Bandeja Paisa', quantity: 12, total_sales: 384000 },
      { product_id: 4, product_name: 'Lomo de Res a la Parrilla', quantity: 8, total_sales: 304000 },
      { product_id: 7, product_name: 'Hamburguesa Clasica', quantity: 15, total_sales: 330000 },
      { product_id: 8, product_name: 'Limonada Natural', quantity: 20, total_sales: 120000 },
      { product_id: 1, product_name: 'Empanadas (3 unidades)', quantity: 10, total_sales: 120000 },
    ],
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
