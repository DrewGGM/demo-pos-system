import { getAll, getById, create, update, remove } from '../../../src/services/mockBackend';

export async function GetAllProducts() { return getAll('products'); }
export async function GetInventoryMovements(_id: number) { return []; }
export async function AssignModifierToProduct(_pid: number, _mid: number) {}
export async function RemoveModifierFromProduct(_pid: number, _mid: number) {}
export async function GetModifierGroups() { return getAll('modifier_groups'); }
export async function GetModifiers() { return getAll('modifier_groups').flatMap((g: any) => g.modifiers || []); }
export async function CreateModifierGroup(g: any) { return create('modifier_groups', g); }
export async function UpdateModifierGroup(g: any) { return update('modifier_groups', g.id, g); }
export async function DeleteModifierGroup(id: number) { return remove('modifier_groups', id); }
export async function CreateModifier(m: any) { return m; }
export async function UpdateModifier(m: any) { return m; }
export async function DeleteModifier(_id: number) {}
export async function GetProduct(id: number) { return getById('products', id); }
export async function CreateProduct(p: any) { return create('products', p); }
export async function UpdateProduct(p: any) { return update('products', p.id, p); }
export async function DeleteProduct(id: number) { return remove('products', id); }
