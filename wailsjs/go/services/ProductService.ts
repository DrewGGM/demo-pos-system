import { getAll, getById, create, update, remove } from '../../../src/services/mockBackend';

export async function GetAllProducts() {
  return getAll('products');
}

// Historial de movimientos: leemos los registros que dejó el adjustStock
// del demo. mockBackend no tiene una colección dedicada, así que filtramos
// `inventory_movements` (vacío en la demo recién instalada — la UI sólo
// debe mostrar lo que el usuario haya generado manualmente).
export async function GetInventoryMovements(productId: number) {
  const all = getAll<any>('inventory_movements');
  return all.filter((m: any) => m.product_id === productId)
    .sort((a: any, b: any) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
}

export async function AssignModifierToProduct(productId: number, modifierGroupId: number) {
  const p = getById<any>('products', productId);
  if (!p) return;
  const group = getById<any>('modifier_groups', modifierGroupId);
  if (!group) return;
  const modifiers = Array.isArray(p.modifiers) ? p.modifiers.slice() : [];
  if (!modifiers.find((m: any) => m.id === modifierGroupId)) {
    modifiers.push(group);
    update('products', productId, { modifiers } as any);
  }
}

export async function RemoveModifierFromProduct(productId: number, modifierGroupId: number) {
  const p = getById<any>('products', productId);
  if (!p) return;
  const modifiers = (Array.isArray(p.modifiers) ? p.modifiers : []).filter(
    (m: any) => m.id !== modifierGroupId
  );
  update('products', productId, { modifiers } as any);
}

export async function GetModifierGroups() {
  return getAll('modifier_groups');
}

export async function GetModifiers() {
  return getAll('modifier_groups').flatMap((g: any) => g.modifiers || []);
}

export async function CreateModifierGroup(g: any) {
  const { id, ...rest } = g || {};
  return create('modifier_groups', { ...rest, modifiers: rest.modifiers || [] } as any);
}

export async function UpdateModifierGroup(g: any) {
  if (!g?.id) throw new Error('id requerido');
  return update('modifier_groups', g.id, g);
}

export async function DeleteModifierGroup(id: number) {
  return remove('modifier_groups', id);
}

// Modificadores individuales: la API real persiste en su propia tabla,
// pero la demo los guarda anidados dentro del grupo. Mantenemos esa shape
// y mutamos el array `modifiers` del grupo padre.
function nextModifierId(): number {
  const groups = getAll<any>('modifier_groups');
  let max = 0;
  for (const g of groups) {
    for (const m of g.modifiers || []) {
      if (typeof m.id === 'number' && m.id > max) max = m.id;
    }
  }
  return max + 1;
}

export async function CreateModifier(m: any) {
  const groupId = m?.modifier_group_id;
  if (!groupId) throw new Error('modifier_group_id requerido');
  const group = getById<any>('modifier_groups', groupId);
  if (!group) throw new Error('grupo de modificador no existe');
  const newMod = { ...m, id: nextModifierId() };
  const next = Array.isArray(group.modifiers) ? [...group.modifiers, newMod] : [newMod];
  update('modifier_groups', groupId, { modifiers: next } as any);
  return newMod;
}

export async function UpdateModifier(m: any) {
  if (!m?.id || !m?.modifier_group_id) throw new Error('id y modifier_group_id requeridos');
  const group = getById<any>('modifier_groups', m.modifier_group_id);
  if (!group) return m;
  const next = (group.modifiers || []).map((x: any) => (x.id === m.id ? { ...x, ...m } : x));
  update('modifier_groups', m.modifier_group_id, { modifiers: next } as any);
  return m;
}

export async function DeleteModifier(id: number) {
  const groups = getAll<any>('modifier_groups');
  for (const g of groups) {
    const before = g.modifiers || [];
    const after = before.filter((m: any) => m.id !== id);
    if (after.length !== before.length) {
      update('modifier_groups', g.id, { modifiers: after } as any);
      return;
    }
  }
}

export async function GetProduct(id: number) {
  return getById('products', id);
}

export async function CreateProduct(p: any) {
  const { id, ...rest } = p || {};
  return create('products', rest as any);
}

export async function UpdateProduct(p: any) {
  if (!p?.id) throw new Error('id requerido');
  return update('products', p.id, p);
}

export async function DeleteProduct(id: number) {
  return remove('products', id);
}

// Export/Import/Template — el frontend real los implementa en Go; aquí
// hacemos un CSV minimalista para que los botones de la página Productos
// funcionen en la demo. El formato coincide con el que entiende ImportProducts.
const CSV_HEADERS = ['name', 'category_id', 'price', 'cost', 'stock', 'track_inventory', 'is_active', 'tax_type_id', 'description'];

function escapeCsv(v: any): string {
  const s = v === undefined || v === null ? '' : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cur += c; }
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"') { inQuotes = true; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out;
}

export async function ExportProducts(_format: string = 'csv') {
  const products = getAll<any>('products');
  const rows = [CSV_HEADERS.join(',')];
  for (const p of products) {
    rows.push(CSV_HEADERS.map((h) => escapeCsv(p[h])).join(','));
  }
  return rows.join('\n');
}

export async function GenerateImportTemplate() {
  const sample = {
    name: 'Producto Ejemplo',
    category_id: 1,
    price: 10000,
    cost: 4500,
    stock: 100,
    track_inventory: true,
    is_active: true,
    tax_type_id: 1,
    description: 'Descripción opcional',
  };
  return [
    CSV_HEADERS.join(','),
    CSV_HEADERS.map((h) => escapeCsv((sample as any)[h])).join(','),
  ].join('\n');
}

export async function ImportProducts(data: number[], _format: string = 'csv') {
  const text = new TextDecoder().decode(new Uint8Array(data));
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error('CSV vacío');
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  let created = 0;
  let updated = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row: any = {};
    headers.forEach((h, idx) => { row[h] = cells[idx]; });
    if (!row.name) continue;
    const product: any = {
      name: row.name,
      category_id: Number(row.category_id) || 1,
      price: Number(row.price) || 0,
      cost: Number(row.cost) || 0,
      stock: Number(row.stock) || 0,
      track_inventory: row.track_inventory === 'true' || row.track_inventory === '1',
      is_active: row.is_active !== 'false' && row.is_active !== '0',
      tax_type_id: Number(row.tax_type_id) || 1,
      description: row.description || '',
      modifiers: [],
    };
    // Si trae id existente actualizamos; si no, creamos.
    const existingId = row.id ? Number(row.id) : 0;
    if (existingId && getById<any>('products', existingId)) {
      update('products', existingId, product);
      updated++;
    } else {
      create('products', product);
      created++;
    }
  }
  return { created, updated, total: created + updated };
}
