import { getAll, getById, create, update, remove } from './mockBackend';
import { Combo } from '../types/models';

class WailsComboService {
  async getAllCombos(): Promise<Combo[]> {
    return getAll<any>('combos').filter((c: any) => c.is_active) as Combo[];
  }

  async getAllCombosAdmin(): Promise<Combo[]> {
    return getAll<any>('combos') as Combo[];
  }

  async getCombo(id: number): Promise<Combo | null> {
    return getById<any>('combos', id) as Combo | null;
  }

  async createCombo(combo: Partial<Combo>): Promise<Combo> {
    return create('combos', {
      name: combo.name || '',
      description: combo.description || '',
      price: combo.price || 0,
      image: combo.image || '',
      category_id: combo.category_id || null,
      is_active: combo.is_active ?? true,
      tax_type_id: combo.tax_type_id || 1,
      display_order: combo.display_order || 0,
      items: (combo.items || []).map((item: any, index: number) => ({
        id: Date.now() + index,
        product_id: item.product_id,
        quantity: item.quantity || 1,
        position: index,
      })),
    } as any) as Combo;
  }

  async updateCombo(combo: Partial<Combo>): Promise<Combo> {
    if (!combo.id) throw new Error('Combo ID required');
    return update('combos', combo.id, {
      name: combo.name,
      description: combo.description || '',
      price: combo.price,
      image: combo.image || '',
      category_id: combo.category_id || null,
      is_active: combo.is_active ?? true,
      tax_type_id: combo.tax_type_id || 1,
      display_order: combo.display_order || 0,
      items: (combo.items || []).map((item: any, index: number) => ({
        id: item.id || Date.now() + index,
        product_id: item.product_id,
        quantity: item.quantity || 1,
        position: index,
      })),
    } as any) as Combo;
  }

  async deleteCombo(id: number): Promise<void> {
    remove('combos', id);
  }

  async toggleComboActive(id: number): Promise<Combo> {
    const combo = getById<any>('combos', id);
    if (!combo) throw new Error('Combo not found');
    return update('combos', id, { is_active: !combo.is_active } as any) as Combo;
  }

  async getCombosByCategory(categoryId: number): Promise<Combo[]> {
    return getAll<any>('combos').filter(
      (c: any) => c.category_id === categoryId && c.is_active
    ) as Combo[];
  }

  async expandComboToOrderItems(comboId: number, quantity: number): Promise<{ items: any[]; totalPrice: number }> {
    const combo = getById<any>('combos', comboId);
    if (!combo) throw new Error('Combo not found');
    // Distribuir el precio del combo proporcionalmente al precio normal de
    // cada producto, para que cada line item entre al carrito con un precio
    // razonable. Antes todos los items entraban con price:0 → el cálculo
    // del subtotal del POS se rompía al editar línea.
    const products = getAll<any>('products');
    const productById = new Map<number, any>(products.map((p: any) => [p.id, p]));
    const lines = (combo.items || []).map((item: any) => {
      const product = productById.get(item.product_id);
      const productPrice = (product?.price || 0) * (item.quantity || 1);
      return { item, product, productPrice };
    });
    const subtotal = lines.reduce((s: number, l: any) => s + l.productPrice, 0);
    const comboPrice = combo.price || 0;
    const ratio = subtotal > 0 ? comboPrice / subtotal : 1;
    const items = lines.map(({ item, product, productPrice }: any) => {
      const lineQty = (item.quantity || 1) * quantity;
      const unitPrice = product
        ? Math.round((productPrice * ratio) / Math.max(1, item.quantity || 1))
        : 0;
      return {
        product_id: item.product_id,
        product,
        quantity: lineQty,
        unit_price: unitPrice,
        price: unitPrice,
        subtotal: unitPrice * lineQty,
        notes: '',
        modifiers: [],
        combo_id: comboId,
      };
    });
    return { items, totalPrice: comboPrice * quantity };
  }

  async addItemToCombo(comboId: number, productId: number, quantity: number): Promise<Combo> {
    const combo = getById<any>('combos', comboId);
    if (!combo) throw new Error('Combo not found');
    const items = combo.items || [];
    items.push({ id: Date.now(), combo_id: comboId, product_id: productId, quantity, position: items.length });
    return update('combos', comboId, { items } as any) as Combo;
  }

  async removeItemFromCombo(comboId: number, itemId: number): Promise<Combo> {
    const combo = getById<any>('combos', comboId);
    if (!combo) throw new Error('Combo not found');
    const items = (combo.items || []).filter((i: any) => i.id !== itemId);
    return update('combos', comboId, { items } as any) as Combo;
  }

  async updateComboItemQuantity(itemId: number, quantity: number): Promise<void> {
    const combos = getAll<any>('combos');
    for (const combo of combos) {
      const items = combo.items || [];
      const idx = items.findIndex((i: any) => i.id === itemId);
      if (idx !== -1) {
        items[idx].quantity = quantity;
        update('combos', combo.id, { items } as any);
        return;
      }
    }
  }
}

export const wailsComboService = new WailsComboService();
