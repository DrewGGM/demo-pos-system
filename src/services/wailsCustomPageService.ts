import { getAll, getById, create, update, remove } from './mockBackend';

// custom_pages_products: tabla N:M página↔producto con posición.
// Almacenamos la entidad completa para que getPageWithProducts pueda
// devolver los productos hidratados sin necesidad de joins.
export const wailsCustomPageService = {
  getAllPages: async () => {
    return getAll<any>('custom_pages');
  },

  getPage: async (id: number) => {
    return getById<any>('custom_pages', id);
  },

  // Devuelve los productos asignados a la página, ordenados por position.
  // La página en el POS espera la entidad Product completa (no sólo el id).
  getPageWithProducts: async (pageId: number) => {
    const assignments = getAll<any>('custom_pages_products').filter(
      (a: any) => a.page_id === pageId
    );
    assignments.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
    const products = getAll<any>('products');
    return assignments
      .map((a: any) => products.find((p: any) => p.id === a.product_id))
      .filter((p: any) => p !== undefined);
  },

  createPage: async (page: any) => {
    const { id, ...rest } = page || {};
    return create('custom_pages', rest);
  },

  updatePage: async (page: any) => {
    if (page.id) {
      update('custom_pages', page.id, page);
    }
  },

  deletePage: async (id: number) => {
    // Limpieza: borramos también las asignaciones para no dejar huérfanos.
    const assignments = getAll<any>('custom_pages_products').filter(
      (a: any) => a.page_id === id
    );
    for (const a of assignments) remove('custom_pages_products', a.id);
    remove('custom_pages', id);
  },

  addProductToPage: async (pageId: number, productId: number, position: number) => {
    // Evita duplicados — si ya está, sólo actualizamos la posición.
    const existing = getAll<any>('custom_pages_products').find(
      (a: any) => a.page_id === pageId && a.product_id === productId
    );
    if (existing) {
      update('custom_pages_products', existing.id, { position });
      return;
    }
    create('custom_pages_products', {
      page_id: pageId,
      product_id: productId,
      position: position || 0,
    } as any);
  },

  removeProductFromPage: async (pageId: number, productId: number) => {
    const target = getAll<any>('custom_pages_products').find(
      (a: any) => a.page_id === pageId && a.product_id === productId
    );
    if (target) remove('custom_pages_products', target.id);
  },

  setPageProducts: async (pageId: number, productIds: number[]) => {
    // Borra todas las asignaciones existentes y reinserta en el orden recibido.
    const existing = getAll<any>('custom_pages_products').filter(
      (a: any) => a.page_id === pageId
    );
    for (const a of existing) remove('custom_pages_products', a.id);
    productIds.forEach((pid, idx) => {
      create('custom_pages_products', {
        page_id: pageId,
        product_id: pid,
        position: idx,
      } as any);
    });
  },
};
