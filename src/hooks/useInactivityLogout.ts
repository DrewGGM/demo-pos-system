import { useEffect, useRef } from 'react';

// Hook que cierra la sesión tras N minutos sin actividad del usuario.
// El umbral se guarda en localStorage ("pos_demo_inactivity_minutes")
// para que el operador pueda ajustarlo desde Configuración → Seguridad.
// Si el valor es 0 o no está definido, el auto-logout queda desactivado.
const STORAGE_KEY = 'pos_demo_inactivity_minutes';
const DEFAULT_MINUTES = 30;

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'wheel',
  'scroll',
];

export function getInactivityMinutes(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return DEFAULT_MINUTES;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MINUTES;
}

export function setInactivityMinutes(minutes: number) {
  localStorage.setItem(STORAGE_KEY, String(minutes));
  window.dispatchEvent(new CustomEvent('pos_demo_inactivity_changed'));
}

export function useInactivityLogout(onTimeout: () => void, enabled: boolean) {
  const timerRef = useRef<number | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!enabled) return;

    let minutes = getInactivityMinutes();

    const arm = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (minutes <= 0) return;
      timerRef.current = window.setTimeout(() => {
        onTimeoutRef.current();
      }, minutes * 60 * 1000);
    };

    const handleActivity = () => arm();
    const handleConfigChange = () => {
      minutes = getInactivityMinutes();
      arm();
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );
    window.addEventListener('pos_demo_inactivity_changed', handleConfigChange);

    arm();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      window.removeEventListener('pos_demo_inactivity_changed', handleConfigChange);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled]);
}
