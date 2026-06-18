// LocalStorage-backed mock of the Wails PriceListService for the demo
// build. Mirrors the same shape as the real backend so the Settings page
// and POS cart can be shared between frontend/ and demo-frontend/
// without code-path divergence.

const STORAGE_KEY = 'pos_demo_price_lists';
const OVERRIDES_KEY = 'pos_demo_price_list_overrides';

export interface PriceList {
  id: number;
  name: string;
  description: string;
  markup_pct: number;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
}

export interface ProductPriceListPrice {
  product_id: number;
  price_list_id: number;
  price: number;
}

export interface ProductPriceRow {
  product_id: number;
  name: string;
  base_price: number;
  override_price?: number;
}

function load<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

function ensureDefault(): PriceList[] {
  const lists = load<PriceList[]>(STORAGE_KEY, []);
  if (lists.some(l => l.is_default)) return lists;
  const seeded: PriceList = {
    id: Date.now(),
    name: 'Estándar',
    description: 'Lista de precios por defecto (mismo precio del catálogo)',
    markup_pct: 0,
    is_default: true,
    is_active: true,
    display_order: 0,
  };
  const all = [seeded, ...lists];
  save(STORAGE_KEY, all);
  return all;
}

// Mirrors the wails binding surface the real PriceListsSettings.tsx and
// POS cart call. PascalCase method names so the (window as any).go shim
// below resolves to the same shape the production app uses.
export const demoPriceListService = {
  ListAll: async (): Promise<PriceList[]> => {
    return ensureDefault().sort((a, b) =>
      (a.display_order - b.display_order) || a.name.localeCompare(b.name),
    );
  },
  ListActive: async (): Promise<PriceList[]> => {
    const all = await demoPriceListService.ListAll();
    return all.filter(l => l.is_active);
  },
  Create: async (input: PriceList): Promise<PriceList> => {
    const lists = ensureDefault();
    const fresh: PriceList = { ...input, id: Date.now(), is_default: false };
    save(STORAGE_KEY, [...lists, fresh]);
    return fresh;
  },
  Update: async (id: number, input: PriceList): Promise<PriceList> => {
    const lists = ensureDefault();
    const updated = lists.map(l => l.id === id ? {
      ...l,
      name: input.name || l.name,
      description: input.description,
      markup_pct: input.markup_pct,
      is_active: input.is_active,
      display_order: input.display_order,
    } : l);
    save(STORAGE_KEY, updated);
    return updated.find(l => l.id === id)!;
  },
  SetDefault: async (id: number): Promise<void> => {
    const lists = ensureDefault();
    save(STORAGE_KEY, lists.map(l => ({ ...l, is_default: l.id === id })));
  },
  Delete: async (id: number): Promise<void> => {
    const lists = ensureDefault();
    const target = lists.find(l => l.id === id);
    if (!target) return;
    if (target.is_default) {
      throw new Error('No se puede eliminar la lista por defecto');
    }
    save(STORAGE_KEY, lists.filter(l => l.id !== id));
    // Cascade overrides for this list.
    const overrides = load<ProductPriceListPrice[]>(OVERRIDES_KEY, []);
    save(OVERRIDES_KEY, overrides.filter(o => o.price_list_id !== id));
  },
  GetAllOverrides: async (): Promise<ProductPriceListPrice[]> => {
    return load<ProductPriceListPrice[]>(OVERRIDES_KEY, []);
  },
  GetProductPricesForList: async (listId: number): Promise<ProductPriceRow[]> => {
    // The demo's products catalog lives in mockBackend; the API there is
    // synchronous (localStorage-backed), so we read it directly. Keeping
    // the lookup here instead of plumbing it through the service avoids a
    // circular import.
    const productsRaw = localStorage.getItem('pos_demo_products');
    const products = productsRaw ? JSON.parse(productsRaw) as Array<{ id: number; name: string; price: number; is_active: boolean }> : [];
    const overrides = load<ProductPriceListPrice[]>(OVERRIDES_KEY, [])
      .filter(o => o.price_list_id === listId);
    const byProduct = new Map(overrides.map(o => [o.product_id, o.price]));
    return products
      .filter(p => p.is_active !== false)
      .map(p => ({
        product_id: p.id,
        name: p.name,
        base_price: p.price,
        override_price: byProduct.get(p.id),
      }));
  },
  SetProductPriceForList: async (productId: number, listId: number, price: number, clear: boolean): Promise<void> => {
    const overrides = load<ProductPriceListPrice[]>(OVERRIDES_KEY, []);
    const next = overrides.filter(o => !(o.product_id === productId && o.price_list_id === listId));
    if (!clear) {
      next.push({ product_id: productId, price_list_id: listId, price });
    }
    save(OVERRIDES_KEY, next);
  },
};

// Plug the mock into the window.go.services shape the production
// components dereference. Idempotent — re-installing in HMR re-imports
// this module which just rebinds the same handlers.
export function installDemoPriceListService() {
  const w = window as any;
  w.go = w.go || {};
  w.go.services = w.go.services || {};
  w.go.services.PriceListService = demoPriceListService;
}
