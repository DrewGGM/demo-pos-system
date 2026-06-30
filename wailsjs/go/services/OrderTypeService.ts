import { getAll, getById, create, update, remove } from '../../../src/services/mockBackend';

export async function GetAllOrderTypes() {
  return getAll('order_types');
}

export async function GetActiveOrderTypes() {
  return getAll('order_types').filter((t: any) => t.is_active);
}

export async function CreateOrderType(data: any) {
  // Strip id so genId assigns a fresh one — UI sends id:0 on create.
  const { id, ...rest } = data || {};
  return create('order_types', rest as any);
}

export async function UpdateOrderType(data: any) {
  if (!data?.id) throw new Error('id requerido para actualizar');
  return update('order_types', data.id, data);
}

export async function DeleteOrderType(id: number) {
  if (!id) return;
  const existing = getById<any>('order_types', id);
  if (existing?.is_system) throw new Error('No se puede eliminar un tipo del sistema');
  remove('order_types', id);
}

export async function ToggleOrderTypeActive(id: number) {
  const existing = getById<any>('order_types', id);
  if (!existing) return;
  update('order_types', id, { is_active: !existing.is_active } as any);
}
