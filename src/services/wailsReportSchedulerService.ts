export interface SchedulerStatus {
  running: boolean;
  enabled: boolean;
  sync_mode: string;
  sync_interval: number;
  sync_time: string;
  last_sync_at: string | null;
  last_sync_status: string;
  last_sync_error: string;
  total_syncs: number;
  next_sync_at: string | null;
  seconds_until_next_sync: number;
}

export const wailsReportSchedulerService = {
  async getStatus(): Promise<SchedulerStatus> {
    return {
      running: false,
      enabled: false,
      sync_mode: 'interval',
      sync_interval: 30,
      sync_time: '23:00',
      last_sync_at: null,
      last_sync_status: '',
      last_sync_error: '',
      total_syncs: 0,
      next_sync_at: null,
      seconds_until_next_sync: 0,
    };
  },

  async restart(): Promise<void> {
  },
};
