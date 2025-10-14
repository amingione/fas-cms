export function prefersDesktopCart(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const hoverMedia = window.matchMedia?.('(hover: hover)');
    const coarseMedia = window.matchMedia?.('(pointer: coarse)');
    const hover = hoverMedia ? hoverMedia.matches : false;
    const coarse = coarseMedia ? coarseMedia.matches : false;
    const maxTouch = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;

    if (hover && !coarse) return true;
    if (hover && coarse === undefined) return true;
    if (coarse) return false;
    return maxTouch === 0;
  } catch {
    return false;
  }
}

export function prefersMobileCart(): boolean {
  return !prefersDesktopCart();
}
