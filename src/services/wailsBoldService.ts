/**
 * Mock Bold Service - All methods return mock data or no-op
 */
class WailsBoldService {
  async getBoldConfig(): Promise<any> {
    return {
      id: 1,
      enabled: false,
      api_key: '',
      webhook_url: '',
      environment: 'test',
    };
  }

  async updateBoldConfig(_config: any): Promise<void> {
  }

  async getPaymentMethods(): Promise<any[]> {
    return [];
  }

  async getTerminalsFromAPI(): Promise<any[]> {
    return [];
  }

  async createPayment(_request: any): Promise<any> {
    return {
      status: 'success',
      integration_id: `demo-${Date.now()}`,
      message: 'Demo payment created',
    };
  }

  async getAllTerminals(): Promise<any[]> {
    return [];
  }

  async createTerminal(_terminal: any): Promise<void> {
  }

  async updateTerminal(_terminal: any): Promise<void> {
  }

  async deleteTerminal(_id: number): Promise<void> {
  }

  async syncTerminals(): Promise<void> {
  }

  async testConnection(): Promise<boolean> {
    return false;
  }

  async createPendingPayment(_pendingPayment: any): Promise<void> {
  }

  async getPendingPayment(_integrationId: string): Promise<any> {
    return { status: 'pending', integration_id: _integrationId };
  }

  async getPendingPaymentStatus(_integrationId: string): Promise<{ status: string; payment: any }> {
    return { status: 'pending', payment: { status: 'pending', integration_id: _integrationId } };
  }

  async cancelPendingPayment(_integrationId: string): Promise<void> {
  }

  async getRecentWebhooks(_limit: number = 50): Promise<any[]> {
    return [];
  }

  async getWebhookLogs(_limit: number = 50): Promise<any[]> {
    return [];
  }
}

export const wailsBoldService = new WailsBoldService();
