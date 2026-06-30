// Mock MCP service. Persistimos config en localStorage para que el toggle
// Habilitado / API key / puerto sobrevivan refresh.
import { getStore, setStore } from './mockBackend';

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

const CONFIG_KEY = 'mcp_config';
const RUNNING_KEY = 'mcp_running';

const DEFAULTS: MCPConfig = {
  id: 1,
  enabled: false,
  port: 8090,
  api_key: '',
  allowed_ips: '',
  read_only_mode: true,
  disabled_tools: '',
};

const SAMPLE_TOOLS: MCPTool[] = [
  { name: 'list_products', category: 'catalog', description: 'Lista productos del catálogo', enabled: true },
  { name: 'get_sale', category: 'sales', description: 'Obtiene detalle de una venta', enabled: true },
  { name: 'today_sales_summary', category: 'reports', description: 'Resumen de ventas del día', enabled: true },
  { name: 'create_product', category: 'catalog', description: 'Crea un nuevo producto', enabled: false },
  { name: 'refund_sale', category: 'sales', description: 'Reembolsa una venta (sensible)', enabled: false },
];

export const wailsMcpService = {
  async getConfig(): Promise<MCPConfig> {
    return getStore<MCPConfig>(CONFIG_KEY, DEFAULTS);
  },

  async updateConfig(config: MCPConfig): Promise<void> {
    setStore(CONFIG_KEY, { ...DEFAULTS, ...config });
  },

  async start(): Promise<void> {
    setStore(RUNNING_KEY, true);
  },

  async stop(): Promise<void> {
    setStore(RUNNING_KEY, false);
  },

  async getStatus(): Promise<MCPStatus> {
    const cfg = await this.getConfig();
    return {
      configured: !!cfg.api_key,
      running: getStore<boolean>(RUNNING_KEY, false) === true,
      port: cfg.port,
      api_key_set: !!cfg.api_key,
      read_only_mode: cfg.read_only_mode,
    };
  },

  async getAvailableTools(): Promise<MCPTool[]> {
    const cfg = await this.getConfig();
    const disabled = (cfg.disabled_tools || '').split(',').map((s) => s.trim()).filter(Boolean);
    return SAMPLE_TOOLS.map((t) => ({ ...t, enabled: t.enabled && !disabled.includes(t.name) }));
  },
};
