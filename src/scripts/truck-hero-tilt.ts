// Desktop-only tilt effect for hero sections.
// Clean on iPad/mobile and respects prefers-reduced-motion.

function enabled(): boolean {
  const mqDesktop = window.matchMedia('(min-width: 1024px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mqDesktop.matches && finePointer.matches && !reduceMotion.matches;
}

type TiltHandlers = { onMove: (e: MouseEvent) => void; onLeave: () => void };
const tiltMap = new WeakMap<HTMLElement, TiltHandlers>();

function bindTilt(section: HTMLElement) {
  const bg = section.querySelector<HTMLElement>('.background-layer');
  const mid = section.querySelector<HTMLElement>('.midground-layer');
  const onMove = (e: MouseEvent) => {
    const r = section.getBoundingClientRect();
    const px = (e.clientX - r.left) / Math.max(r.width, 1) - 0.5; // -0.5..0.5
    const py = (e.clientY - r.top) / Math.max(r.height, 1) - 0.5;
    const midTx = Math.round(-px * 16);
    const midTy = Math.round(-py * 10);
    const bgTx = Math.round(px * 8);
    const bgTy = Math.round(py * 6);
    if (mid) mid.style.transform = `translate3d(${midTx}px, ${midTy}px, 0) rotateX(${py * 2}deg) rotateY(${px * 2}deg)`;
    if (bg) bg.style.transform = `translate3d(${bgTx}px, ${bgTy}px, 0)`;
  };
  const onLeave = () => {
    if (mid) mid.style.transform = '';
    if (bg) bg.style.transform = '';
  };
  tiltMap.set(section, { onMove, onLeave });
  section.addEventListener('mousemove', onMove);
  section.addEventListener('mouseleave', onLeave);
}

function unbindTilt(section: HTMLElement) {
  const handlers = tiltMap.get(section);
  if (!handlers) return;
  section.removeEventListener('mousemove', handlers.onMove);
  section.removeEventListener('mouseleave', handlers.onLeave);
  const mid = section.querySelector<HTMLElement>('.midground-layer');
  const bg = section.querySelector<HTMLElement>('.background-layer');
  if (mid) mid.style.transform = '';
  if (bg) bg.style.transform = '';
  tiltMap.delete(section);
}

function refresh() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.parallax-section'));
  sections.forEach((s) => {
    if (enabled()) {
      if (!tiltMap.has(s)) bindTilt(s);
    } else {
      unbindTilt(s);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const mqDesktop = window.matchMedia('(min-width: 1024px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', refresh);
  else (mqDesktop as any).addListener(refresh);
  if (finePointer.addEventListener) finePointer.addEventListener('change', refresh);
  else (finePointer as any).addListener(refresh);
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', refresh);
  else (reduceMotion as any).addListener(refresh);

  window.addEventListener('orientationchange', refresh);
  window.addEventListener('resize', refresh, { passive: true });
  refresh();
});

