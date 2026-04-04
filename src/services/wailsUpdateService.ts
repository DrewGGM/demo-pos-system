export interface UpdateInfo {
  current_version: string;
  latest_version: string;
  update_available: boolean;
  download_url: string;
  release_notes: string;
  published_at: string;
  file_size: number;
}

export const wailsUpdateService = {
  async getCurrentVersion(): Promise<string | null> {
    return 'Demo 1.0.0';
  },

  async checkForUpdates(): Promise<UpdateInfo | null> {
    return {
      current_version: 'Demo 1.0.0',
      latest_version: 'Demo 1.0.0',
      update_available: false,
      download_url: '',
      release_notes: '',
      published_at: new Date().toISOString(),
      file_size: 0,
    };
  },

  async downloadUpdate(_url: string): Promise<string | null> {
    return null;
  },

  async extractUpdate(_zipPath: string): Promise<string | null> {
    return null;
  },

  async applyUpdate(_newExePath: string): Promise<void> {
  },

  async performUpdate(): Promise<void> {
  },
};
