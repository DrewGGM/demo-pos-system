import { getAll, getById, create, update, remove } from './mockBackend';
import { Ingredient, ProductIngredient, IngredientMovement } from '../types/models';

class WailsIngredientService {
  async getIngredients(): Promise<Ingredient[]> {
    return getAll<any>('ingredients') as Ingredient[];
  }

  async getIngredientById(id: number): Promise<Ingredient> {
    const ingredient = getById<any>('ingredients', id);
    if (!ingredient) throw new Error('Error al obtener ingrediente');
    return ingredient as Ingredient;
  }

  async createIngredient(ingredient: Partial<Ingredient>): Promise<void> {
    create('ingredients', {
      name: ingredient.name || '',
      unit: ingredient.unit || 'unidades',
      stock: ingredient.stock || 0,
      min_stock: ingredient.min_stock || 0,
      cost: (ingredient as any).cost || 0,
      is_active: ingredient.is_active ?? true,
    } as any);
  }

  async updateIngredient(id: number, ingredient: Partial<Ingredient>): Promise<void> {
    update('ingredients', id, ingredient as any);
  }

  async deleteIngredient(id: number): Promise<void> {
    remove('ingredients', id);
  }

  // Ajuste de stock — además del cambio en el ingrediente registramos un
  // movimiento para que la vista de historial muestre algo. mockBackend
  // no tiene tabla `ingredient_movements`, la creamos al vuelo.
  async adjustStock(ingredientId: number, quantity: number, reason: string, employeeId: number = 0): Promise<Ingredient> {
    const ingredient = getById<any>('ingredients', ingredientId);
    if (!ingredient) throw new Error('Ingrediente no encontrado');
    const newStock = (ingredient.stock || 0) + quantity;
    const updated = update('ingredients', ingredientId, { stock: newStock } as any);
    create('ingredient_movements', {
      ingredient_id: ingredientId,
      ingredient_name: ingredient.name,
      quantity,
      previous_stock: ingredient.stock || 0,
      new_stock: newStock,
      type: quantity >= 0 ? 'in' : 'out',
      reason: reason || '',
      employee_id: employeeId,
    } as any);
    return updated as unknown as Ingredient;
  }

  async getIngredientMovements(ingredientId: number): Promise<IngredientMovement[]> {
    const all = getAll<any>('ingredient_movements');
    return (all.filter((m: any) => m.ingredient_id === ingredientId) as IngredientMovement[])
      .sort((a: any, b: any) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
  }

  // Recetas: product_ingredients es la tabla N:M producto↔ingrediente.
  async getProductIngredients(productId: number): Promise<ProductIngredient[]> {
    const all = getAll<any>('product_ingredients');
    return all.filter((pi: any) => pi.product_id === productId) as ProductIngredient[];
  }

  async addProductIngredient(productIngredient: Partial<ProductIngredient>): Promise<void> {
    create('product_ingredients', {
      product_id: productIngredient.product_id,
      ingredient_id: productIngredient.ingredient_id,
      quantity: productIngredient.quantity || 0,
      unit: productIngredient.unit || 'unidades',
    } as any);
  }

  async updateProductIngredient(id: number, productIngredient: Partial<ProductIngredient>): Promise<void> {
    update('product_ingredients', id, productIngredient as any);
  }

  async deleteProductIngredient(id: number): Promise<void> {
    remove('product_ingredients', id);
  }

  // Reemplaza el set de ingredientes de un producto en bloque (lo que hace
  // el editor de recetas al guardar). Borra los existentes para el producto
  // y reinserta los nuevos.
  async setProductIngredients(productId: number, ingredients: Partial<ProductIngredient>[]): Promise<void> {
    const existing = getAll<any>('product_ingredients').filter((pi: any) => pi.product_id === productId);
    for (const pi of existing) remove('product_ingredients', pi.id);
    for (const pi of ingredients) {
      create('product_ingredients', {
        product_id: productId,
        ingredient_id: pi.ingredient_id,
        quantity: pi.quantity || 0,
        unit: pi.unit || 'unidades',
      } as any);
    }
  }

  async getLowStockIngredients(): Promise<Ingredient[]> {
    return getAll<any>('ingredients').filter(
      (i: any) => i.stock <= i.min_stock
    ) as Ingredient[];
  }
}

export const wailsIngredientService = new WailsIngredientService();
