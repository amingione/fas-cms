import { useEffect } from 'react';

export default function VendorApplyScriptLoader() {
  useEffect(() => {
    let cancelled = false;
    import('../scripts/vendor-apply.ts').catch((err) => {
      if (!cancelled) console.error('[VendorApplyScriptLoader] failed to load script', err);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
