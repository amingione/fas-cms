import React, { useCallback, useState } from 'react';

export interface FilterPanelMobileProps {
  categories: Array<{ title: string; slug: { current?: string } | string }>;
  filters: string[];
  selectedCategory?: string;
  selectedFilters?: string[];
}

function normSlug(s?: string | { current?: string }): string {
  if (!s) return '';
  return typeof s === 'string' ? s : s.current || '';
}

function afterNextPaint(fn: () => void) {
  // Two rAFs gives Safari/iOS time to commit the visual state before navigation
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

function nudgePaint(el?: HTMLElement | null) {
  try {
    if (!el) return;
    void el.offsetHeight; // force reflow
  } catch {}
}

export default function FilterPanelMobile({
  categories,
  filters,
  selectedCategory = '',
  selectedFilters = []
}: FilterPanelMobileProps) {
  const selected = normSlug(selectedCategory);
  const [pendingCategory, setPendingCategory] = useState<string>(selected);

  function setCategory(slug: string) {
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set('categorySlug', slug);
    else url.searchParams.delete('categorySlug');
    url.searchParams.set('page', '1');
    // Defer navigation until after the next paint so the radio fill is visible immediately
    afterNextPaint(() => {
      window.location.href = url.toString();
    });
  }

  function toggleFilter(tag: string) {
    const url = new URL(window.location.href);
    const list = new Set((url.searchParams.get('filters') || '').split(',').filter(Boolean));
    if (list.has(tag)) list.delete(tag);
    else list.add(tag);
    if (list.size) url.searchParams.set('filters', Array.from(list).join(','));
    else url.searchParams.delete('filters');
    url.searchParams.set('page', '1');
    window.location.href = url.toString();
  }

  return (
    <div className="md:hidden space-y-3">
      {/* Categories */}
      <details className="rounded-fx-xl bg-fx-surface-2 shadow-fx-subtle">
        <summary className="px-3 py-2 cursor-pointer fas-label text-muted-foreground rounded-fx-sm hover:bg-white/5 transition">
          Categories
        </summary>
        <div className="px-3 py-2 space-y-2">
          <label className="block text-white/90 cursor-pointer select-none px-2 py-1 rounded-fx-sm hover:bg-white/5 transition">
            <input
              type="checked"
              name="category"
              value=""
              className="mr-2 checked:bg-fx-primary"
              style={{
                WebkitAppearance: 'radio',
                appearance: 'auto',
                accentColor: 'var(--fx-primary, #fb3636)'
              }}
              checked={pendingCategory === ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPendingCategory('');
                nudgePaint(e.currentTarget);
                setCategory('');
              }}
            />
            All Categories
          </label>
          {categories.map((c) => {
            const slug = normSlug(c.slug);
            return (
              <label
                key={slug}
                className="block fas-body-sm text-white/90 cursor-pointer select-none px-2 py-1 rounded-fx-sm hover:bg-white/5 transition"
              >
                <input
                  type="checked"
                  name="category"
                  value={slug}
                  className="mr-2 checked:bg-fx-primary"
                  style={{
                    WebkitAppearance: 'radio',
                    appearance: 'auto',
                    accentColor: 'var(--fx-primary, #fb3636)'
                  }}
                  checked={pendingCategory === slug}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setPendingCategory(slug);
                    nudgePaint(e.currentTarget);
                    setCategory(slug);
                  }}
                />
                {c.title}
              </label>
            );
          })}
        </div>
      </details>

      {/* Filters */}
      <details className="rounded-fx-xl bg-fx-surface-2 shadow-fx-subtle">
        <summary className="px-3 py-2 cursor-pointer fas-label text-muted-foreground rounded-fx-sm hover:bg-white/5 transition">
          Filters
        </summary>
        <div className="px-3 py-2 space-y-2">
          {filters.map((f) => (
            <label
              key={f}
              className="flex items-center gap-2 fas-body-sm text-white/90 cursor-pointer select-none px-2 py-1 rounded-fx-sm hover:bg-white/5 transition"
            >
              <input
                type="checkbox"
                value={f}
                className="accent-primary"
                style={{ accentColor: 'var(--fx-primary, #fb3636)' }}
                defaultChecked={selectedFilters.includes(f)}
                onChange={() => toggleFilter(f)}
              />
              <span className="capitalize">{f}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
