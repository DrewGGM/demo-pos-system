// Wrapper around the Go InvoiceAutoRetryService + ConnectivityMonitor.
//
// Frontend polling design:
//   - useSyncMonitor (hooks/useSyncMonitor) polls getSyncStatus every 30s.
//   - When failed_count goes UP we fire a warning notification.
//   - When the connection transitions offline → online we fire a success
//     notification and surface "retrying X invoices".
//   - When a retry succeeds (failed_count goes DOWN) we fire a success.
//
// Demo fallback: when Wails is missing (npm run dev) we return an empty
// "everything is fine" snapshot so the rest of the UI stays usable.

const Sync = (window as any).go?.services?.InvoiceAutoRetryService;
const Conn = (window as any).go?.services?.ConnectivityMonitor;

export interface ConnectivityStatus {
  online: boolean;
  last_checked_at: string;
  last_error?: string;
  consecutive_failures: number;
  consecutive_successes: number;
}

export interface RetryScanResult {
  started_at: string;
  finished_at: string;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped_no_retry: number;
  skipped_backoff: number;
  offline_skipped: boolean;
  first_error?: string;
}

export interface FailedInvoiceSummary {
  sale_id: number;
  sale_number: string;
  invoice_number?: string;
  status: string;
  last_error?: string;
  retry_count: number;
  created_at: string;
  total: number;
}

export interface SyncStatus {
  connectivity: ConnectivityStatus;
  last_scan: RetryScanResult;
  failed_count: number;
  failed: FailedInvoiceSummary[];
}

function emptyStatus(): SyncStatus {
  return {
    connectivity: {
      online: true,
      last_checked_at: new Date().toISOString(),
      consecutive_failures: 0,
      consecutive_successes: 1,
    },
    last_scan: {
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped_no_retry: 0,
      skipped_backoff: 0,
      offline_skipped: false,
    },
    failed_count: 0,
    failed: [],
  };
}

class WailsSyncService {
  async getSyncStatus(): Promise<SyncStatus> {
    if (!Sync) return emptyStatus();
    try {
      const s = await Sync.GetSyncStatus();
      return s as SyncStatus;
    } catch {
      return emptyStatus();
    }
  }

  async retryOne(saleId: number): Promise<void> {
    if (!Sync) throw new Error('Sync no disponible en modo demo');
    await Sync.RetryOne(saleId);
  }

  async runScan(): Promise<RetryScanResult> {
    if (!Sync) return emptyStatus().last_scan;
    return (await Sync.RunScan()) as RetryScanResult;
  }

  async checkConnectivity(): Promise<ConnectivityStatus> {
    if (!Conn) return emptyStatus().connectivity;
    return (await Conn.CheckNow()) as ConnectivityStatus;
  }
}

export const wailsSyncService = new WailsSyncService();
