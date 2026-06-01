import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { wailsPermissionService } from '../services/wailsPermissionService';

// usePermissions resolves the permission snapshot for the currently logged-in
// employee and exposes can()/value()/numberValue() helpers.
//
// The snapshot is fetched once when the user changes (login/logout). Updates
// to permissions from the admin UI invalidate via the explicit `reload()`
// method — there's no live subscription, since permission edits are rare.
//
// Components should prefer can('pos.discount.apply') over hard-coded role
// checks ('user.role === "admin"') so the matrix stays the single source of
// truth.
export function usePermissions() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setSnapshot({});
      return;
    }
    setLoading(true);
    try {
      const m = await wailsPermissionService.getForEmployee(user.id);
      setSnapshot(m);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const can = useCallback(
    (code: string): boolean => {
      const v = snapshot[code];
      return v === 'true' || v === '1';
    },
    [snapshot],
  );

  const value = useCallback(
    (code: string): string => snapshot[code] ?? '',
    [snapshot],
  );

  const numberValue = useCallback(
    (code: string): number => {
      const n = Number(snapshot[code] || 0);
      return Number.isFinite(n) ? n : 0;
    },
    [snapshot],
  );

  return { can, value, numberValue, snapshot, loading, reload };
}
