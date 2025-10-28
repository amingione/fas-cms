import { useEffect } from 'react';

export default function DashboardScriptLoader() {
  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const loadModule = () =>
      import('../scripts/dashboard-page.ts').catch((err) => {
        if (!cancelled) console.error('[DashboardScriptLoader] failed to load script', err);
      });

    const schedule = () => {
      const win = window as Window & {
        requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

      if (typeof win.requestIdleCallback === 'function') {
        idleHandle = win.requestIdleCallback(
          () => {
            idleHandle = null;
            if (!cancelled) {
              loadModule();
            }
          },
          { timeout: 1500 }
        );
        return;
      }

      timeoutHandle = setTimeout(() => {
        timeoutHandle = null;
        if (!cancelled) {
          loadModule();
        }
      }, 250);
    };

    schedule();

    return () => {
      cancelled = true;
      const win = window as Window & {
        cancelIdleCallback?: (handle: number) => void;
      };
      if (idleHandle !== null && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
    };
  }, []);
  return null;
}
