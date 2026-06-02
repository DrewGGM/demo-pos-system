import { useEffect, useRef, useState, useCallback } from 'react';
import { wailsSyncService, SyncStatus } from '../services/wailsSyncService';
import { useNotifications } from '../contexts/NotificationContext';

// useSyncMonitor polls the backend every POLL_INTERVAL_MS and fires
// notifications when the sync state changes meaningfully:
//   - Internet went OFFLINE → warning notification.
//   - Internet came back ONLINE after being offline → info notification
//     ("intentando reenviar X facturas pendientes").
//   - failed_count went UP since the last tick → error notification with the
//     latest invoice's error.
//   - failed_count went DOWN (auto-retry succeeded) → success notification
//     with the count recovered.
//
// The hook is idempotent for the lifetime of the app: any component can mount
// it but to avoid duplicate notifications we only run a single instance
// globally (guarded with a module-level flag).

const POLL_INTERVAL_MS = 30_000;
let alreadyMounted = false;

export function useSyncMonitor() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const previousRef = useRef<SyncStatus | null>(null);
  const { addNotification } = useNotifications();
  const stoppedRef = useRef(false);

  const tick = useCallback(async () => {
    if (stoppedRef.current) return;
    try {
      const next = await wailsSyncService.getSyncStatus();
      const prev = previousRef.current;
      previousRef.current = next;
      setStatus(next);

      if (!prev) return; // first tick — nothing to compare yet

      // Connectivity transitions.
      if (prev.connectivity.online && !next.connectivity.online) {
        addNotification({
          type: 'warning',
          title: 'Sin conexión',
          message:
            'Se perdió la conexión con DIAN. Las facturas electrónicas se reenviarán automáticamente cuando vuelva.',
        });
      } else if (!prev.connectivity.online && next.connectivity.online) {
        if (next.failed_count > 0) {
          addNotification({
            type: 'info',
            title: 'Conexión restablecida',
            message: `Reintentando ${next.failed_count} factura${next.failed_count === 1 ? '' : 's'} pendiente${next.failed_count === 1 ? '' : 's'}.`,
            action: { label: 'Ver ventas', path: '/sales' },
          });
        } else {
          addNotification({
            type: 'success',
            title: 'Conexión restablecida',
            message: 'La conexión con DIAN está activa.',
          });
        }
      }

      // Failure count went up: new invoice failure.
      if (next.failed_count > prev.failed_count) {
        const delta = next.failed_count - prev.failed_count;
        const sample = next.failed[0];
        addNotification({
          type: 'error',
          title: `${delta} factura${delta === 1 ? '' : 's'} con error`,
          message:
            sample?.last_error
              ? `${sample.sale_number || 'Venta'}: ${sample.last_error}`
              : 'Hay facturas electrónicas pendientes de reenvío.',
          action: { label: 'Ver ventas', path: '/sales' },
        });
      }

      // Failure count went down: auto-retry recovered some invoices.
      if (next.failed_count < prev.failed_count) {
        const recovered = prev.failed_count - next.failed_count;
        addNotification({
          type: 'success',
          title: `${recovered} factura${recovered === 1 ? '' : 's'} recuperada${recovered === 1 ? '' : 's'}`,
          message: 'El reenvío automático completó con éxito.',
          action: { label: 'Ver ventas', path: '/sales' },
        });
      }

      // Surfaced last_scan.first_error → info notification for visibility.
      if (
        next.last_scan?.first_error &&
        next.last_scan.first_error !== prev.last_scan?.first_error &&
        next.last_scan.failed > 0
      ) {
        addNotification({
          type: 'warning',
          title: 'Reintento parcial',
          message: next.last_scan.first_error,
        });
      }
    } catch {
      // Polling errors are silent — we'll try again next tick.
    }
  }, [addNotification]);

  useEffect(() => {
    if (alreadyMounted) {
      // Some other instance is driving the global polling loop. Subscribe to
      // updates by polling the cached status only (no notifications fired).
      void wailsSyncService.getSyncStatus().then(setStatus);
      return;
    }
    alreadyMounted = true;
    stoppedRef.current = false;

    void tick();
    const id = window.setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      stoppedRef.current = true;
      window.clearInterval(id);
      alreadyMounted = false;
    };
  }, [tick]);

  return status;
}
