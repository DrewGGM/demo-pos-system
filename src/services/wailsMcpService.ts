export interface MCPConfig {
  id?: number;
  enabled: boolean;
  port: number;
  api_key: string;
  allowed_ips: string;
  read_only_mode: boolean;
  disabled_tools: string;
}

export interface MCPStatus {
  configured: boolean;
  running: boolean;
  port: number;
  api_key_set: boolean;
  read_only_mode: boolean;
}

export interface MCPTool {
  name: string;
  category: string;
  description: string;
  enabled: boolean;
}

export const wailsMcpService = {
  async getConfig(): Promise<MCPConfig> {
    return {
      id: 1,
      enabled: false,
      port: 8090,
      api_key: '',
      allowed_ips: '',
      read_only_mode: true,
      disabled_tools: '',
    };
  },

  async updateConfig(_config: MCPConfig): Promise<void> {
  },

  async start(): Promise<void> {
  },

  async stop(): Promise<void> {
  },

  async getStatus(): Promise<MCPStatus> {
    return {
      configured: false,
      running: false,
      port: 8090,
      api_key_set: false,
      read_only_mode: true,
    };
  },

  async getAvailableTools(): Promise<MCPTool[]> {
    return [];
  },
};
