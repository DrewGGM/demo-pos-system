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

  // Normalize discount like the real Go OrderService.calculateOrderTotals:
  // - "percentage" raw value (e.g. 10) becomes subtotal × 10/100
  // - clamped to [0, subtotal]
  // The frontend keeps `discount_type` for re-rendering the dialog with the
  // same mode; the stored `discount` is always the absolute amount.
  let discount = order.discount || 0;
  if (order.discount_type === 'percentage') {
    if (discount < 0) discount = 0;
    if (discount > 100) discount = 100;
    discount = subtotal * (discount / 100);
  }
  if (discount < 0) discount = 0;
  if (discount > subtotal) discount = subtotal;

  const newOrder = {
    ...order,
    order_number: orderNumber,
    items,
    subtotal,
    tax: 0,
    discount,
    discount_type: order.discount_type || 'amount',
    discount_reason_id: order.discount_reason_id,
    discount_reason_text: order.discount_reason_text || '',
    service_charge: order.service_charge || 0,
    total: subtotal + (order.service_charge || 0) - discount,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };
  return create('orders', newOrder);
}

export async function GetOrder(id: number) { return getById('orders', id); }

// The real Wails binding accepts a single Order object (with id inside) —
// the TS wrapper in wailsOrderService.ts calls it that way. The earlier mock
// signature `(id, order)` made every cart-save raise "Error al actualizar orden".
export async function UpdateOrder(order: any) {
  if (!order || !order.id) {
    throw new Error('UpdateOrder: missing id');
  }

  // Recompute items + subtotal from the items array sent by the cart, just
  // like CreateOrder. Without this, items added/removed after creation aren't
  // re-priced and the discount math goes off.
  const items = (order.items || []).map((item: any, idx: number) => {
    const unitPrice = item.unit_price || item.price || 0;
    return {
      id: item.id || Date.now() + idx,
      product_id: item.product_id,
      product: item.product,
      quantity: item.quantity || 1,
      unit_price: unitPrice,
      price: unitPrice,
      subtotal: unitPrice * (item.quantity || 1),
      notes: item.notes || '',
      modifiers: item.modifiers || [],
      status: item.status || 'pending',
      created_at: item.created_at,
      updated_at: new Date().toISOString(),
    };
  });
  const subtotal = items.reduce((s: number, i: any) => s + i.subtotal, 0);

  // Same percentage→absolute normalization as CreateOrder.
  let discount = order.discount || 0;
  if (order.discount_type === 'percentage') {
    if (discount < 0) discount = 0;
    if (discount > 100) discount = 100;
    discount = subtotal * (discount / 100);
  }
  if (discount < 0) discount = 0;
  if (discount > subtotal) discount = subtotal;

  const serviceCharge = order.service_charge || 0;
  return update('orders', order.id, {
    ...order,
    items,
    subtotal,
    discount,
    discount_type: order.discount_type || 'amount',
    discount_reason_id: order.discount_reason_id,
    discount_reason_text: order.discount_reason_text || '',
    service_charge: serviceCharge,
    total: subtotal - discount + serviceCharge,
    updated_at: new Date().toISOString(),
  });
}

export async function DeleteOrder(id: number) { return remove('orders', id); }

export async function CancelOrder(id: number, _reason?: string) {
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
