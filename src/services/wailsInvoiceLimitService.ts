export interface TimeInterval {
  start_time: string;
  end_time: string;
}

export interface InvoiceLimitConfig {
  enabled: boolean;
  sync_interval: number;
  day_limits: Record<string, number>;
  time_intervals_enabled: boolean;
  time_intervals: Record<string, TimeInterval[]>;
  alternating_enabled: boolean;
  alternating_ratio: number;
  alternating_counter: number;
  alternating_reset_daily: boolean;
  last_alternating_reset: string;
  last_sync: string;
}

export interface InvoiceLimitStatus {
  available: boolean;
  enabled: boolean;
  today_limit: number;
  today_sales: number;
  remaining_amount: number;
  day_name: string;
  time_intervals_enabled: boolean;
  in_blocked_time_interval: boolean;
  next_available_time: string;
  blocked_until: string;
  alternating_enabled: boolean;
  alternating_ratio: number;
  alternating_counter: number;
  next_electronic_in: number;
  is_alternating_turn: boolean;
  message: string;
}

export const wailsInvoiceLimitService = {
  async getConfig(): Promise<InvoiceLimitConfig | null> {
    return {
      enabled: false,
      sync_interval: 60,
      day_limits: {},
      time_intervals_enabled: false,
      time_intervals: {},
      alternating_enabled: false,
      alternating_ratio: 1,
      alternating_counter: 0,
      alternating_reset_daily: false,
      last_alternating_reset: '',
      last_sync: '',
    };
  },

  async getStatus(): Promise<InvoiceLimitStatus | null> {
    return {
      available: true,
      enabled: false,
      today_limit: 0,
      today_sales: 0,
      remaining_amount: 0,
      day_name: '',
      time_intervals_enabled: false,
      in_blocked_time_interval: false,
      next_available_time: '',
      blocked_until: '',
      alternating_enabled: false,
      alternating_ratio: 1,
      alternating_counter: 0,
      next_electronic_in: 0,
      is_alternating_turn: false,
      message: '',
    };
  },

  async syncConfig(): Promise<void> {
  },

  async saveConfig(_config: InvoiceLimitConfig): Promise<void> {
  },

  isAvailable(): boolean {
    return true;
  },
};
