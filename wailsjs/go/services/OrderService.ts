import { getAll, getById, create, update, remove, generateOrderNumber } from '../../../src/services/mockBackend';

export async function CreateOrder(order: any) {
  const orderNumber = generateOrderNumber();
  const now = new Date().toISOString();
  const items = (order.items || []).map((item: any, idx: number) => {
    const unitPrice = item.unit_price || item.price || 0;
    return {
      id: Date.now() + idx,
      product_id: item.product_id,
      product: item.product,
      quantity: item.quantity || 1,
      unit_price: unitPrice,
      price: unitPrice,
      subtotal: unitPrice * (item.quantity || 1),
      notes: item.notes || '',
      modifiers: item.modifiers || [],
      status: 'pending',
      created_at: now,
      updated_at: now,
    };
  });
  const subtotal = items.reduce((s: number, i: any) => s + i.subtotal, 0);
  const newOrder = {
    ...order,
    order_number: orderNumber,
    items,
    subtotal,
    tax: 0,
    discount: order.discount || 0,
    service_charge: order.service_charge || 0,
    total: subtotal + (order.service_charge || 0) - (order.discount || 0),
    status: 'pending',
    created_at: now,
    updated_at: now,
  };
  return create('orders', newOrder);
}

export async function GetOrder(id: number) { return getById('orders', id); }

export async function UpdateOrder(id: number, order: any) {
  return update('orders', id, order);
}

export async function DeleteOrder(id: number) { return remove('orders', id); }

export async function CancelOrder(id: number) {
  return update('orders', id, { status: 'cancelled' });
}

export async function GetPendingOrders() {
  return getAll<any>('orders').filter((o: any) => o.status === 'pending');
}

export async function GetTodayOrders() {
  const today = new Date().toISOString().split('T')[0];
  return getAll<any>('orders').filter((o: any) => (o.created_at || '').startsWith(today));
}

export async function GetOrdersByStatus(status: string) {
  return getAll<any>('orders').filter((o: any) => o.status === status);
}

export async function GetOrdersByTable(tableId: number) {
  return getAll<any>('orders').filter((o: any) => o.table_id === tableId);
}

export async function SendToKitchen(_id: number) {}

// Tables
export async function GetTables() { return getAll('tables'); }

export async function CreateTable(table: any) { return create('tables', table); }

export async function UpdateTable(id: number, table: any) {
  return update('tables', id, table);
}

export async function DeleteTable(id: number) { return remove('tables', id); }

export async function UpdateTableStatus(id: number, status: string) {
  return update('tables', id, { status });
}

// Table Areas
export async function GetTableAreas() {
  return getAll<any>('table_areas').length > 0
    ? getAll('table_areas')
    : [{ id: 1, name: 'Salón Principal', is_active: true }];
}

export async function CreateTableArea(area: any) { return create('table_areas', area); }

export async function UpdateTableArea(id: number, area: any) {
  return update('table_areas', id, area);
}

export async function DeleteTableArea(id: number) { return remove('table_areas', id); }
