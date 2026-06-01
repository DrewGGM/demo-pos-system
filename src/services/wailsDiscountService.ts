// Wrapper around the Go DiscountService. The catalog maps 1:1 to apidian's
// `discounts` table — each row carries a DianDiscountID that ends up as
// allowance_charges[].discount_id on the electronic invoice.
import { DiscountReason } from '../types/models';

// Wails generates these bindings at build time. Reference via the global wails
// runtime so we don't crash at dev time when the generated file isn't there yet.
const W = (window as any).go?.services?.DiscountService;

function mapReason(r: any): DiscountReason {
  return {
    id: r.id as number,
    name: r.name || '',
    dian_discount_id: r.dian_discount_id || 0,
    dian_code: r.dian_code || '',
    is_active: r.is_active !== false,
    is_default: r.is_default === true,
    allow_custom_text: r.allow_custom_text === true,
    display_order: r.display_order || 0,
  };
}

class WailsDiscountService {
  async listActiveReasons(): Promise<DiscountReason[]> {
    if (!W) return [];
    try {
      const rows = await W.ListActiveReasons();
      return (rows || []).map(mapReason);
    } catch (err: any) {
      throw new Error(err?.message || 'Error al cargar motivos de descuento');
    }
  }

  async listAllReasons(): Promise<DiscountReason[]> {
    if (!W) return [];
    try {
      const rows = await W.ListAllReasons();
      return (rows || []).map(mapReason);
    } catch (err: any) {
      throw new Error(err?.message || 'Error al cargar motivos de descuento');
    }
  }

  async getDefaultReason(): Promise<DiscountReason | null> {
    if (!W) return null;
    try {
      const r = await W.GetDefaultReason();
      return r ? mapReason(r) : null;
    } catch {
      return null;
    }
  }

  async updateReason(
    id: number,
    name: string,
    isActive: boolean,
    allowCustomText: boolean,
    isDefault: boolean,
    displayOrder: number,
  ): Promise<DiscountReason> {
    if (!W) throw new Error('DiscountService no disponible');
    const r = await W.UpdateReason(id, name, isActive, allowCustomText, isDefault, displayOrder);
    return mapReason(r);
  }
}

export const wailsDiscountService = new WailsDiscountService();
