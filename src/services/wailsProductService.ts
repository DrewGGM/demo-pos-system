import { getAll, getById, create, update, remove, generateOrderNumber, generateSaleNumber, initDemoData, getStore, setStore } from './mockBackend';
import { Product, Category, ModifierGroup, Modifier } from '../types/models';

class WailsProductService {
  // Products
  async getProducts(): Promise<Product[]> {
    const products = getAll<any>('products').filter((p: any) => p.is_active !== false);
    const categories = getAll<any>('categories');
    const modifierGroups = getAll<any>('modifier_groups');

    return products.map((p: any) => {
      const category = categories.find((c: any) => c.id === p.category_id);
      // Resolve modifier groups attached to the product
      const resolvedModifiers: Modifier[] = [];
      if (p.modifiers && Array.isArray(p.modifiers)) {
        for (const mg of p.modifiers) {
          const group = modifierGroups.find((g: any) => g.id === (mg.id || mg));
          if (group && group.modifiers) {
            for (const mod of group.modifiers) {
              resolvedModifiers.push({
                id: mod.id,
                name: mod.name,
                type: mod.type || 'addition',
                price_change: mod.price_change || 0,
                group_id: group.id,
                group: {
                  id: group.id,
                  name: group.name,
                  required: group.required || false,
                  multiple: group.multiple || false,
                  min_select: group.min_select || 0,
                  max_select: group.max_select || 0,
                  created_at: group.created_at || new Date().toISOString(),
                  updated_at: group.updated_at || new Date().toISOString(),
                } as ModifierGroup,
                created_at: mod.created_at || new Date().toISOString(),
                updated_at: mod.updated_at || new Date().toISOString(),
              } as Modifier);
            }
          }
        }
      }

      return {
        id: p.id,
        name: p.name || '',
        description: p.description || '',
        price: p.price || 0,
        category_id: p.category_id,
        image: p.image || '',
        stock: p.stock || 0,
        min_stock: p.min_stock || 0,
        track_inventory: p.track_inventory ?? true,
        is_active: p.is_active ?? true,
        has_variable_price: p.has_variable_price ?? false,
        has_modifiers: resolvedModifiers.length > 0,
        modifiers: resolvedModifiers,
        tax_type_id: p.tax_type_id || 1,
        unit_measure_id: p.unit_measure_id || 796,
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
      } as Product;
    });
  }

  async getProductById(id: number): Promise<Product> {
    const products = await this.getProducts();
    const product = products.find(p => p.id === id);
    if (!product) throw new Error('Error al obtener producto');
    return product;
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    const created = create<any>('products', { ...product, is_active: true, modifiers: product.modifiers || [] });
    return this.getProductById(created.id);
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<void> {
    update<any>('products', id, product);
  }

  async deleteProduct(id: number): Promise<void> {
    remove('products', id);
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return getAll<any>('categories')
      .filter((c: any) => c.is_active !== false)
      .map((c: any) => ({
        id: c.id,
        name: c.name || '',
        description: c.description || '',
        icon: c.icon || '',
        color: c.color || '',
        display_order: c.display_order || 0,
        is_active: c.is_active ?? true,
        created_at: c.created_at || new Date().toISOString(),
        updated_at: c.updated_at || new Date().toISOString(),
      } as Category));
  }

  async createCategory(category: Partial<Category>): Promise<Category> {
    const created = create<any>('categories', { ...category, is_active: true });
    return created as Category;
  }

  async updateCategory(id: number, category: Partial<Category>): Promise<Category> {
    const updated = update<any>('categories', id, category);
    return updated as Category;
  }

  async deleteCategory(id: number): Promise<void> {
    remove('categories', id);
  }

  // Modifier Groups
  async getModifierGroups(): Promise<ModifierGroup[]> {
    return getAll<any>('modifier_groups').map((g: any) => ({
      id: g.id,
      name: g.name || '',
      required: g.required || false,
      multiple: g.multiple || false,
      min_select: g.min_select || 0,
      max_select: g.max_select || 0,
      created_at: g.created_at || new Date().toISOString(),
      updated_at: g.updated_at || new Date().toISOString(),
    } as ModifierGroup));
  }

  async createModifierGroup(group: Partial<ModifierGroup>): Promise<ModifierGroup> {
    const created = create<any>('modifier_groups', { ...group, modifiers: [] });
    return created as ModifierGroup;
  }

  async updateModifierGroup(id: number, group: Partial<ModifierGroup>): Promise<ModifierGroup> {
    const updated = update<any>('modifier_groups', id, group);
    return updated as ModifierGroup;
  }

  async deleteModifierGroup(id: number): Promise<void> {
    remove('modifier_groups', id);
  }

  // Modifiers
  async getModifiers(): Promise<Modifier[]> {
    const groups = getAll<any>('modifier_groups');
    const allModifiers: Modifier[] = [];
    for (const group of groups) {
      if (group.modifiers && Array.isArray(group.modifiers)) {
        for (const mod of group.modifiers) {
          allModifiers.push({
            id: mod.id,
            name: mod.name || '',
            type: mod.type || 'addition',
            price_change: mod.price_change || 0,
            group_id: group.id,
            group: {
              id: group.id,
              name: group.name,
              required: group.required || false,
              multiple: group.multiple || false,
              min_select: group.min_select || 0,
              max_select: group.max_select || 0,
            } as ModifierGroup,
            created_at: mod.created_at || new Date().toISOString(),
            updated_at: mod.updated_at || new Date().toISOString(),
          } as Modifier);
        }
      }
    }
    return allModifiers;
  }

  async createModifier(modifier: Partial<Modifier>): Promise<Modifier> {
    const groups = getAll<any>('modifier_groups');
    const groupIdx = groups.findIndex((g: any) => g.id === modifier.group_id);
    if (groupIdx === -1) throw new Error('Error al crear modificador');
    const newMod = { ...modifier, id: Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (!groups[groupIdx].modifiers) groups[groupIdx].modifiers = [];
    groups[groupIdx].modifiers.push(newMod);
    setStore('modifier_groups', groups);
    return newMod as Modifier;
  }

  async updateModifier(id: number, modifier: Partial<Modifier>): Promise<Modifier> {
    const groups = getAll<any>('modifier_groups');
    for (const group of groups) {
      if (group.modifiers) {
        const modIdx = group.modifiers.findIndex((m: any) => m.id === id);
        if (modIdx !== -1) {
          group.modifiers[modIdx] = { ...group.modifiers[modIdx], ...modifier, updated_at: new Date().toISOString() };
          setStore('modifier_groups', groups);
          return group.modifiers[modIdx] as Modifier;
        }
      }
    }
    throw new Error('Error al actualizar modificador');
  }

  async deleteModifier(id: number): Promise<void> {
    const groups = getAll<any>('modifier_groups');
    for (const group of groups) {
      if (group.modifiers) {
        group.modifiers = group.modifiers.filter((m: any) => m.id !== id);
      }
    }
    setStore('modifier_groups', groups);
  }

  // Additional methods for Redux slices
  async getLowStockProducts(): Promise<Product[]> {
    const products = await this.getProducts();
    return products.filter(p => p.track_inventory !== false && p.stock <= (p.min_stock || 0));
  }

  async adjustStock(productId: number, quantity: number, reason: string, employeeId: number = 0): Promise<Product> {
    const product = getById<any>('products', productId);
    if (!product) throw new Error('Error al ajustar stock');
    const newStock = (product.stock || 0) + quantity;
    update<any>('products', productId, { stock: newStock });
    return this.getProductById(productId);
  }

  async getInventorySummary(): Promise<{
    total_products: number;
    tracked_products: number;
    low_stock: number;
    out_of_stock: number;
    total_value: number;
  }> {
    const products = await this.getProducts();
    return {
      total_products: products.length,
      tracked_products: products.filter(p => p.track_inventory !== false).length,
      low_stock: products.filter(p => p.track_inventory !== false && p.stock > 0 && p.stock <= (p.min_stock || 0)).length,
      out_of_stock: products.filter(p => p.track_inventory !== false && p.stock <= 0).length,
      total_value: products.reduce((sum, p) => sum + (p.stock * ((p as any).cost || p.price)), 0),
    };
  }
}

export const wailsProductService = new WailsProductService();
