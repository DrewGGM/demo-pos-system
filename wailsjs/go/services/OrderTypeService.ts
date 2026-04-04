import { getAll } from '../../../src/services/mockBackend';
export async function GetAllOrderTypes() { return getAll('order_types'); }
export async function GetActiveOrderTypes() { return getAll('order_types').filter((t: any) => t.is_active); }
export async function CreateOrderType(data: any) { return data; }
export async function UpdateOrderType(data: any) { return data; }
export async function DeleteOrderType(_id: number) {}
export async function ToggleOrderTypeActive(_id: number) {}
