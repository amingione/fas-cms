const initCarousel = (root) => {
  const viewport = root.querySelector('[data-carousel-viewport]');
  if (!viewport) return;

  const prev = root.querySelector('[data-carousel-prev]');
  const next = root.querySelector('[data-carousel-next]');
  const thumbs = Array.from(root.querySelectorAll('[data-carousel-thumb]'));
  const slides = Array.from(root.querySelectorAll('[data-slide]'));
  if (slides.length <= 1) {
    prev?.setAttribute('hidden', '');
    next?.setAttribute('hidden', '');
    thumbs.forEach((thumb, idx) => thumb.setAttribute('aria-current', idx === 0 ? 'true' : 'false'));
    return;
  }

  const clamp = (value) => Math.max(0, Math.min(value, slides.length - 1));

  const scrollToIndex = (index) => {
    const target = clamp(index);
    const width = viewport.clientWidth || 1;
    viewport.scrollTo({ left: target * width, behavior: 'smooth' });
  };

  const updateActiveThumb = () => {
    const width = viewport.clientWidth || 1;
    const idx = clamp(Math.round((viewport.scrollLeft || 0) / width));
    thumbs.forEach((thumb, thumbIndex) => {
      const isActive = thumbIndex === idx;
      thumb.setAttribute('aria-current', isActive ? 'true' : 'false');
      thumb.classList.toggle('ring-2', isActive);
      thumb.classList.toggle('ring-primary', isActive);
      thumb.classList.toggle('opacity-100', isActive);
      if (!isActive) {
        thumb.classList.remove('ring-2', 'ring-primary');
        thumb.classList.add('opacity-80');
      } else {
        thumb.classList.remove('opacity-80');
      }
    });
  };

  let raf = 0;
  const handleScroll = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(updateActiveThumb);
  };

  prev?.addEventListener('click', (event) => {
    event.preventDefault();
    scrollToIndex(Math.round((viewport.scrollLeft || 0) / (viewport.clientWidth || 1)) - 1);
  });

  next?.addEventListener('click', (event) => {
    event.preventDefault();
    scrollToIndex(Math.round((viewport.scrollLeft || 0) / (viewport.clientWidth || 1)) + 1);
  });

  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', (event) => {
      event.preventDefault();
      const index = parseInt(String(thumb.dataset.index ?? '0'), 10) || 0;
      scrollToIndex(index);
    });
  });

  viewport.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });

  updateActiveThumb();
};

const ready = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const carousels = Array.from(document.querySelectorAll('[data-slug-carousel]'));
  carousels.forEach((root) => initCarousel(root));
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ready, { once: true });
} else {
  ready();
}
