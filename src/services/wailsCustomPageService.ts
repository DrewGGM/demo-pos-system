import { getAll, getById, create, update, remove } from './mockBackend';

export const wailsCustomPageService = {
  getAllPages: async () => {
    return getAll<any>('custom_pages');
  },

  getPage: async (id: number) => {
    return getById<any>('custom_pages', id);
  },

  getPageWithProducts: async (_pageID: number) => {
    // Return empty product list for custom pages in demo
    return [];
  },

  createPage: async (page: any) => {
    return create('custom_pages', page);
  },

  updatePage: async (page: any) => {
    if (page.id) {
      update('custom_pages', page.id, page);
    }
  },

  deletePage: async (id: number) => {
    remove('custom_pages', id);
  },

  addProductToPage: async (_pageId: number, _productId: number, _position: number) => {
  },

  removeProductFromPage: async (_pageId: number, _productId: number) => {
  },

  setPageProducts: async (_pageId: number, _productIds: number[]) => {
  },
};
