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
      is_active: ingredient.is_active ?? true,
    } as any);
  }

  async updateIngredient(id: number, ingredient: Partial<Ingredient>): Promise<void> {
    update('ingredients', id, ingredient as any);
  }

  async deleteIngredient(id: number): Promise<void> {
    remove('ingredients', id);
  }

  async adjustStock(ingredientId: number, quantity: number, _reason: string, _employeeId: number = 0): Promise<Ingredient> {
    const ingredient = getById<any>('ingredients', ingredientId);
    if (!ingredient) throw new Error('Ingrediente no encontrado');
    const newStock = (ingredient.stock || 0) + quantity;
    return update('ingredients', ingredientId, { stock: newStock } as any) as unknown as Ingredient;
  }

  async getIngredientMovements(_ingredientId: number): Promise<IngredientMovement[]> {
    return [];
  }

  async getProductIngredients(_productId: number): Promise<ProductIngredient[]> {
    return [];
  }

  async addProductIngredient(_productIngredient: Partial<ProductIngredient>): Promise<void> {
  }

  async updateProductIngredient(_id: number, _productIngredient: Partial<ProductIngredient>): Promise<void> {
  }

  async deleteProductIngredient(_id: number): Promise<void> {
  }

  async setProductIngredients(_productId: number, _ingredients: Partial<ProductIngredient>[]): Promise<void> {
  }

  async getLowStockIngredients(): Promise<Ingredient[]> {
    return getAll<any>('ingredients').filter(
      (i: any) => i.stock <= i.min_stock
    ) as Ingredient[];
  }
}

export const wailsIngredientService = new WailsIngredientService();
