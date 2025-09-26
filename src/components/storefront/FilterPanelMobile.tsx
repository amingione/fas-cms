import React, { useCallback, useState } from 'react';

export interface FilterPanelMobileProps {
  categories: Array<{ title: string; slug: { current?: string } | string }>;
  filters: string[];
  selectedCategory?: string;
  selectedFilters?: string[];
  filterTitleMap?: Record<string, string>;
}

function normSlug(s?: string | { current?: string }): string {
  if (!s) return '';
  return typeof s === 'string' ? s : s.current || '';
}

function afterNextPaint(fn: () => void) {
  // Two rAFs gives Safari/iOS time to commit the visual state before navigation
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

export default function FilterPanelMobile({
  categories,
  filters,
  selectedCategory = '',
  selectedFilters = [],
  filterTitleMap
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

  function normalizeSlug(slug: string) {
    return slug.trim().toLowerCase();
  }

  function toggleFilter(tag: string) {
    const normalized = normalizeSlug(tag);
    const url = new URL(window.location.href);
    const list = new Set(
      (url.searchParams.get('filters') || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
    if (list.has(normalized)) list.delete(normalized);
    else list.add(normalized);
    if (list.size) url.searchParams.set('filters', Array.from(list).join(','));
    else url.searchParams.delete('filters');
    url.searchParams.set('page', '1');
    window.location.href = url.toString();
  }

  const formatLabel = useCallback(
    (slug: string) =>
      (filterTitleMap && filterTitleMap[slug.toLowerCase()]) ||
      slug
        .split(/[-_]/g)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
    [filterTitleMap]
  );

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
              type="checkbox"
              name="category"
              value=""
              className="mr-2"
              style={{
                WebkitAppearance: 'checkbox',
                appearance: 'auto',
                accentColor: 'var(--fx-primary, #fb3636)'
              }}
              checked={pendingCategory === ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPendingCategory('');
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
                  type="checkbox"
                  name="category"
                  value={slug}
                  className="mr-2"
                  style={{
                    WebkitAppearance: 'checkbox',
                    appearance: 'auto',
                    accentColor: 'var(--fx-primary, #fb3636)'
                  }}
                  checked={pendingCategory === slug}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setPendingCategory(slug);
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
              <span className="capitalize">{formatLabel(f)}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
