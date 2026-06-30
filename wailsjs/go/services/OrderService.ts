import { getAll, getById, create, update, remove, generateOrderNumber } from '../../../src/services/mockBackend';

// Tax rate por producto. tax_type_id=1 → IVA general 19%; otros → 0.
// El backend real lee de tax_types; aquí mantenemos un mapa fijo simple.
function taxRateForProduct(productId: number): number {
  const p = getById<any>('products', productId);
  if (!p) return 0;
  if (typeof p.tax_rate === 'number') return p.tax_rate;
  return p.tax_type_id === 1 ? 0.19 : 0;
}

export async function CreateOrder(order: any) {
  const orderNumber = generateOrderNumber();
  const now = new Date().toISOString();
  const items = (order.items || []).map((item: any, idx: number) => {
    const unitPrice = item.unit_price || item.price || 0;
    const qty = item.quantity || 1;
    const subtotal = unitPrice * qty;
    const rate = taxRateForProduct(item.product_id);
    // IVA incluido en el precio — Colombia: precio mostrado = IVA in.
    // tax extraído de subtotal usando rate/(1+rate).
    const tax = rate > 0 ? subtotal - subtotal / (1 + rate) : 0;
    return {
      id: Date.now() + idx,
      product_id: item.product_id,
      product: item.product,
      quantity: qty,
      unit_price: unitPrice,
      price: unitPrice,
      subtotal,
      tax,
      notes: item.notes || '',
      modifiers: item.modifiers || [],
      status: 'pending',
      created_at: now,
      updated_at: now,
    };
  });
  const subtotal = items.reduce((s: number, i: any) => s + i.subtotal, 0);
  const totalTax = items.reduce((s: number, i: any) => s + (i.tax || 0), 0);

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
    tax: totalTax,
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
    const qty = item.quantity || 1;
    const subtotal = unitPrice * qty;
    const rate = taxRateForProduct(item.product_id);
    const tax = rate > 0 ? subtotal - subtotal / (1 + rate) : 0;
    return {
      id: item.id || Date.now() + idx,
      product_id: item.product_id,
      product: item.product,
      quantity: qty,
      unit_price: unitPrice,
      price: unitPrice,
      subtotal,
      tax,
      notes: item.notes || '',
      modifiers: item.modifiers || [],
      status: item.status || 'pending',
      created_at: item.created_at,
      updated_at: new Date().toISOString(),
    };
  });
  const subtotal = items.reduce((s: number, i: any) => s + i.subtotal, 0);
  const totalTax = items.reduce((s: number, i: any) => s + (i.tax || 0), 0);

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
    tax: totalTax,
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

export async function CancelOrder(id: number, reason?: string) {
  return update('orders', id, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancel_reason: reason || '',
  } as any);
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

// Marca la orden como enviada a cocina. La UI lee kitchen_acknowledged
// para distinguir "enviado pero no confirmado" vs "confirmado por cocina".
// En la demo simulamos la confirmación inmediata después de 1s para que
// el icono de alerta no se quede colgado eternamente.
export async function SendToKitchen(id: number) {
  if (!id) return;
  const now = new Date().toISOString();
  update('orders', id, {
    sent_to_kitchen: true,
    sent_to_kitchen_at: now,
    kitchen_acknowledged: false,
  } as any);
  // Confirmación automática a los 2s — simula que el bonito tablero de
  // cocina recibió el ticket. En producción esto viene por WebSocket.
  setTimeout(() => {
    update('orders', id, {
      kitchen_acknowledged: true,
      kitchen_acknowledged_at: new Date().toISOString(),
    } as any);
  }, 2000);
}

// Tables — el wrapper Wails real pasa la entidad completa (con id incluido)
// porque así genera Go el binding. Si pasamos (id, entity) por separado
// la firma se rompe. Aceptamos cualquiera de las dos formas.
export async function GetTables() { return getAll('tables'); }

export async function CreateTable(table: any) {
  const { id, ...rest } = table || {};
  return create('tables', rest as any);
}

export async function UpdateTable(tableOrId: any, maybeTable?: any) {
  const isTwoArg = typeof tableOrId === 'number' && maybeTable;
  const table = isTwoArg ? maybeTable : tableOrId;
  const id = isTwoArg ? tableOrId : table?.id;
  if (!id) throw new Error('UpdateTable: id requerido');
  return update('tables', id, table);
}

export async function DeleteTable(id: number) { return remove('tables', id); }

export async function UpdateTableStatus(id: number, status: string) {
  return update('tables', id, { status } as any);
}

// Table Areas
export async function GetTableAreas() {
  return getAll<any>('table_areas').length > 0
    ? getAll('table_areas')
    : [{ id: 1, name: 'Salón Principal', is_active: true }];
}

export async function CreateTableArea(area: any) {
  const { id, ...rest } = area || {};
  return create('table_areas', rest as any);
}

export async function UpdateTableArea(areaOrId: any, maybeArea?: any) {
  const isTwoArg = typeof areaOrId === 'number' && maybeArea;
  const area = isTwoArg ? maybeArea : areaOrId;
  const id = isTwoArg ? areaOrId : area?.id;
  if (!id) throw new Error('UpdateTableArea: id requerido');
  return update('table_areas', id, area);
}

export async function DeleteTableArea(id: number) { return remove('table_areas', id); }
