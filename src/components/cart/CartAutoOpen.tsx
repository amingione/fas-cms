'use client';

import { useEffect } from 'react';
import { prefersDesktopCart } from '@/lib/device';

/**
 * Automatically opens the floating cart modal shortly after mount.
 * Used on the dedicated /cart page so the customer lands directly
 * in the cart experience they expect.
 */
export default function CartAutoOpen() {
  useEffect(() => {
    const open = () => {
      try {
        const eventName = prefersDesktopCart() ? 'open-desktop-cart' : 'open-cart';
        window.dispatchEvent(new Event(eventName));
      } catch (error) {
        void error;
      }
    };

    let timer: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      // Allow the CartEntry React tree to hydrate before attempting to open.
      timer = window.setTimeout(open, 120);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (typeof timer === 'number') window.clearTimeout(timer);
    };
  }, []);

  return null;
}
