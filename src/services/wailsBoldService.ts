// Mock Bold Service — usa localStorage para persistir config y terminales
// (antes todo era no-op y los toggles "guardar" mentían). El polling de
// pagos simula la confirmación automática a los 4 segundos para que el
// PaymentDialog no quede bloqueado.
import { getAll, getById, create, update, remove, getStore, setStore } from './mockBackend';

const CONFIG_KEY = 'bold_config';
const PENDING_KEY = 'bold_pending_payments';

const DEFAULT_CONFIG = {
  id: 1,
  enabled: false,
  api_key: '',
  webhook_url: '',
  environment: 'test' as 'test' | 'production',
};

class WailsBoldService {
  async getBoldConfig(): Promise<any> {
    return getStore<any>(CONFIG_KEY, DEFAULT_CONFIG);
  }

  async updateBoldConfig(config: any): Promise<void> {
    setStore(CONFIG_KEY, { ...DEFAULT_CONFIG, ...config });
  }

  async getPaymentMethods(): Promise<any[]> {
    return [];
  }

  async getTerminalsFromAPI(): Promise<any[]> {
    return [];
  }

  async createPayment(request: any): Promise<any> {
    const integrationId = `demo-${Date.now()}`;
    // Encolamos un pago "pendiente" con timestamp para resolverlo a los 4s.
    const pending = getStore<any[]>(PENDING_KEY, []);
    pending.push({
      integration_id: integrationId,
      amount: request?.amount || 0,
      payment_method_id: request?.payment_method_id,
      status: 'pending',
      created_at: Date.now(),
    });
    setStore(PENDING_KEY, pending);
    return {
      status: 'success',
      integration_id: integrationId,
      message: 'Pago iniciado en terminal Bold (demo)',
    };
  }

  async getAllTerminals(): Promise<any[]> {
    return getAll<any>('bold_terminals');
  }

  async createTerminal(terminal: any): Promise<void> {
    const { id, ...rest } = terminal || {};
    create('bold_terminals', { ...rest, is_active: rest.is_active ?? true } as any);
  }

  async updateTerminal(terminal: any): Promise<void> {
    if (!terminal?.id) throw new Error('id requerido');
    // is_default es exclusivo: si se marca uno, los demás se desmarcan.
    if (terminal.is_default) {
      const all = getAll<any>('bold_terminals');
      for (const t of all) {
        if (t.id !== terminal.id && t.is_default) {
          update('bold_terminals', t.id, { is_default: false } as any);
        }
      }
    }
    update('bold_terminals', terminal.id, terminal);
  }

  async deleteTerminal(id: number): Promise<void> {
    remove('bold_terminals', id);
  }

  async syncTerminals(): Promise<void> {
    // No-op (no hay API real en demo).
  }

  async testConnection(): Promise<boolean> {
    const cfg = await this.getBoldConfig();
    // Devolvemos true si hay api_key configurada — coherente con la idea
    // de "test" sin red real.
    return !!(cfg?.enabled && cfg?.api_key);
  }

  async createPendingPayment(pendingPayment: any): Promise<void> {
    const pending = getStore<any[]>(PENDING_KEY, []);
    pending.push({ ...pendingPayment, status: 'pending', created_at: Date.now() });
    setStore(PENDING_KEY, pending);
  }

  // Resolver simulado: después de 4s desde la creación marcamos approved.
  // Antes siempre devolvía pending → PaymentDialog se colgaba para siempre.
  private resolvePendingStatus(p: any): string {
    if (p.status && p.status !== 'pending') return p.status;
    const elapsed = Date.now() - (p.created_at || 0);
    return elapsed >= 4000 ? 'approved' : 'pending';
  }

  async getPendingPayment(integrationId: string): Promise<any> {
    const pending = getStore<any[]>(PENDING_KEY, []);
    const p = pending.find((x: any) => x.integration_id === integrationId);
    if (!p) return { status: 'not_found', integration_id: integrationId };
    const status = this.resolvePendingStatus(p);
    if (status !== p.status) {
      p.status = status;
      setStore(PENDING_KEY, pending);
    }
    return { ...p, status };
  }

  async getPendingPaymentStatus(integrationId: string): Promise<{ status: string; payment: any }> {
    const payment = await this.getPendingPayment(integrationId);
    return { status: payment.status, payment };
  }

  async cancelPendingPayment(integrationId: string): Promise<void> {
    const pending = getStore<any[]>(PENDING_KEY, []);
    const p = pending.find((x: any) => x.integration_id === integrationId);
    if (p) {
      p.status = 'cancelled';
      setStore(PENDING_KEY, pending);
    }
  }

  async getRecentWebhooks(_limit: number = 50): Promise<any[]> {
    return [];
  }

  async getWebhookLogs(_limit: number = 50): Promise<any[]> {
    return [];
  }
}

export const wailsBoldService = new WailsBoldService();
