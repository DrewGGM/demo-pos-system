import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Product, Category, ModifierGroup } from '../../types/models';
import { wailsProductService } from '../../services/wailsProductService';

interface ProductsState {
  products: Product[];
  categories: Category[];
  modifierGroups: ModifierGroup[];
  selectedCategory: number | null;
  searchQuery: string;
  loading: boolean;
  error: string | null;
  lowStockProducts: Product[];
}

const initialState: ProductsState = {
  products: [],
  categories: [],
  modifierGroups: [],
  selectedCategory: null,
  searchQuery: '',
  loading: false,
  error: null,
  lowStockProducts: [],
};

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async () => {
    return await wailsProductService.getProducts();
  }
);

export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async () => {
    return await wailsProductService.getCategories();
  }
);

export const fetchModifierGroups = createAsyncThunk(
  'products/fetchModifierGroups',
  async () => {
    return await wailsProductService.getModifierGroups();
  }
);

export const fetchLowStockProducts = createAsyncThunk(
  'products/fetchLowStock',
  async () => {
    return await wailsProductService.getLowStockProducts();
  }
);

export const createProduct = createAsyncThunk(
  'products/create',
  async (product: Partial<Product>) => {
    const createdProduct = await wailsProductService.createProduct(product);
    return createdProduct; // Return the created product with ID
  }
);

export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ id, product }: { id: number; product: Partial<Product> }) => {
    await wailsProductService.updateProduct(id, product);
    return { id, product }; // Return for state update
  }
);

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async (id: number) => {
    await wailsProductService.deleteProduct(id);
    return id;
  }
);

export const adjustStock = createAsyncThunk(
  'products/adjustStock',
  async ({ productId, quantity, reason, employeeId }: { productId: number; quantity: number; reason: string; employeeId?: number }) => {
    // Llamar al servicio que ahora SÍ actualiza la BD
    const updatedProduct = await wailsProductService.adjustStock(productId, quantity, reason, employeeId || 0);
    return { productId, quantity, updatedProduct };
  }
);

export const createCategory = createAsyncThunk(
  'products/createCategory',
  async (category: Partial<Category>) => {
    const created = await wailsProductService.createCategory(category);
    return created;
  }
);

export const updateCategory = createAsyncThunk(
  'products/updateCategory',
  async ({ id, category }: { id: number; category: Partial<Category> }) => {
    const updated = await wailsProductService.updateCategory(id, category);
    return updated;
  }
);

export const deleteCategory = createAsyncThunk(
  'products/deleteCategory',
  async (id: number) => {
    await wailsProductService.deleteCategory(id);
    return id;
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setSelectedCategory: (state, action: PayloadAction<number | null>) => {
      state.selectedCategory = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchProducts.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload;
    });
    builder.addCase(fetchProducts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Error loading products';
    });

    builder.addCase(fetchCategories.fulfilled, (state, action) => {
      state.categories = action.payload;
      // Mantener selectedCategory en null para mostrar "Todos" por defecto
    });

    builder.addCase(fetchModifierGroups.fulfilled, (state, action) => {
      state.modifierGroups = action.payload;
    });

    builder.addCase(fetchLowStockProducts.fulfilled, (state, action) => {
      state.lowStockProducts = action.payload;
    });

    builder.addCase(createProduct.fulfilled, (state, action) => {
      state.products.push(action.payload as any);
    });

    builder.addCase(updateProduct.fulfilled, (state, action) => {
      const index = state.products.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.products[index] = { ...state.products[index], ...action.payload.product } as any;
      }
    });

    builder.addCase(deleteProduct.fulfilled, (state, action) => {
      state.products = state.products.filter(p => p.id !== action.payload);
    });

    builder.addCase(adjustStock.fulfilled, (state, action) => {
      const index = state.products.findIndex(p => p.id === action.payload.productId);
      if (index !== -1) {
        // Actualizar con el producto completo de la BD (no solo el stock)
        state.products[index] = {
          ...state.products[index],
          ...action.payload.updatedProduct,
        };
      }
    });

    builder.addCase(createCategory.fulfilled, (state, action) => {
      state.categories.push(action.payload);
    });

    builder.addCase(updateCategory.fulfilled, (state, action) => {
      const index = state.categories.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = action.payload;
      }
    });

    builder.addCase(deleteCategory.fulfilled, (state, action) => {
      state.categories = state.categories.filter(c => c.id !== action.payload);
    });
  },
});

export const {
  setSelectedCategory,
  setSearchQuery,
  clearError,
} = productsSlice.actions;

export default productsSlice.reducer;
