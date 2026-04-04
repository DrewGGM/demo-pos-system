export interface WebSocketStatus {
  running: boolean;
  port?: number;
  total_clients?: number;
  kitchen_clients?: number;
  waiter_clients?: number;
  pos_clients?: number;
  local_ips?: string[];
  error?: string;
}

export interface WebSocketClient {
  id: string;
  type: string;
  connected_at: string;
  remote_addr: string;
}

export const wailsWebSocketService = {
  async getStatus(): Promise<WebSocketStatus> {
    return { running: false, total_clients: 0 };
  },

  async getConnectedClients(): Promise<WebSocketClient[]> {
    return [];
  },

  async disconnectClient(_clientID: string): Promise<void> {
  },

  async sendTestNotification(): Promise<void> {
  },
};
