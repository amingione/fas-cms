import { useEffect } from 'react';

export default function DashboardScriptLoader() {
  useEffect(() => {
    let cancelled = false;
    import('../scripts/dashboard-page.ts').catch((err) => {
      if (!cancelled) console.error('[DashboardScriptLoader] failed to load script', err);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
