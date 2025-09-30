'use client';

/**
 * CategoryChips — FAS theme version
 *
 * - Pill-style chips matching your UI (rounded, tight, high-contrast)
 * - Works with your URL params (categorySlug) by default
 * - Optional onChange callback to intercept navigation
 */

export type Category = { title: string; slug: { current?: string } | string };

export interface CategoryChipsProps {
  categories: Category[];
  current?: string; // current category slug ("" for All)
  onChange?: (slug: string) => void; // optional override handler
  className?: string; // optional extra classes for the wrapper
}

function normSlug(s?: string | { current?: string }): string {
  if (!s) return '';
  return typeof s === 'string' ? s : s.current || '';
}

export default function CategoryChips({
  categories,
  current = '',
  onChange,
  className = ''
}: CategoryChipsProps) {
  const selected = (current || '').toLowerCase();

  function go(slug: string) {
    if (onChange) return onChange(slug);
    const url = new URL(window.location.href);
    if (slug) {
      url.searchParams.set('categorySlug', slug);
    } else {
      url.searchParams.delete('categorySlug');
    }
    url.searchParams.set('page', '1');
    window.location.href = url.toString();
  }

  const base =
    'px-3 py-1 rounded-full text-sm border transition focus:outline-none focus:ring-2 focus:ring-primary/40';
  const active = 'bg-primary text-accent border-transparent';
  const idle = 'border-white/30 text-white/90 hover:bg-white/80';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => go('')}
        aria-pressed={selected === ''}
        className={`${base} ${selected === '' ? active : idle}`}
      >
        All
      </button>
      {categories.map((c) => {
        const slug = normSlug(c.slug).toLowerCase();
        const isActive = selected === slug;
        return (
          <button
            key={slug || c.title}
            type="button"
            onClick={() => go(slug)}
            aria-pressed={isActive}
            className={`${base} ${isActive ? active : idle}`}
          >
            {c.title}
          </button>
        );
      })}
    </div>
  );
}
