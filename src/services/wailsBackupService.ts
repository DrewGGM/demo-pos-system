// Wrapper around the Go BackupService. Used by the R2/S3 backup settings
// page and any "Run backup now" buttons elsewhere.

const W = (window as any).go?.services?.BackupService;

export interface BackupConfig {
  id: number;
  enabled: boolean;
  provider: string;
  endpoint: string;
  region: string;
  bucket: string;
  bucket_prefix: string;
  access_key_id: string;
  secret_access_key: string;
  use_ssl: boolean;
  schedule_cron: string;
  interval_hours: number;
  daily_at: string;
  retention_count: number;
  retention_days: number;
  encryption_enabled: boolean;
  encryption_key: string;
  last_backup_at?: string;
  last_backup_size: number;
  last_backup_key: string;
  last_error: string;
}

export interface BackupResult {
  key: string;
  size: number;
  started_at: string;
  finished_at: string;
  checksum: string;
  error?: string;
}

export interface BackupInfo {
  key: string;
  size: number;
  last_modified: string;
}

function defaultConfig(): BackupConfig {
  return {
    id: 0,
    enabled: false,
    provider: 'r2',
    endpoint: '',
    region: 'auto',
    bucket: '',
    bucket_prefix: '',
    access_key_id: '',
    secret_access_key: '',
    use_ssl: true,
    schedule_cron: '',
    interval_hours: 24,
    daily_at: '03:00',
    retention_count: 14,
    retention_days: 30,
    encryption_enabled: false,
    encryption_key: '',
    last_backup_size: 0,
    last_backup_key: '',
    last_error: '',
  };
}

class WailsBackupService {
  async getConfig(): Promise<BackupConfig> {
    if (!W) return defaultConfig();
    const cfg = await W.GetConfig();
    return cfg as BackupConfig;
  }

  async saveConfig(cfg: BackupConfig): Promise<BackupConfig> {
    if (!W) throw new Error('BackupService no disponible en modo demo');
    return (await W.SaveConfig(cfg)) as BackupConfig;
  }

  async testConnection(): Promise<void> {
    if (!W) throw new Error('BackupService no disponible en modo demo');
    await W.TestConnection();
  }

  async runBackup(): Promise<BackupResult> {
    if (!W) throw new Error('BackupService no disponible en modo demo');
    return (await W.RunBackup()) as BackupResult;
  }

  async listBackups(): Promise<BackupInfo[]> {
    if (!W) return [];
    const list = await W.ListBackups();
    return (list || []) as BackupInfo[];
  }
}

export const wailsBackupService = new WailsBackupService();
