import * as React from 'react';

export type Category = {
  _id?: string;
  title?: string;
  slug?: { current?: string };
};

type Props = {
  categories: Category[];
  selectedCategory: string; // slug or 'all'
  onCategoryChange: (slug: string) => void;

  availableFilters: string[]; // lowercased filter slugs/labels
  selectedFilters: string[]; // lowercased
  onFiltersChange: (next: string[]) => void;
  filterTitleMap?: Record<string, string>; // map slug -> human title

  // New optional groups
  availableVehicles?: string[]; // lowercased vehicle names
  selectedVehicles?: string[]; // lowercased
  onVehiclesChange?: (next: string[]) => void;

  priceMin?: number; // inclusive
  priceMax?: number; // inclusive
  onPriceChange?: (min: number, max: number) => void;

  // Control rendering of extra groups elsewhere
  hideSpecsAndAttributes?: boolean; // if true, do not render specs/attributes here

  onClear?: () => void;
  showApplyButton?: boolean;
};

const DEFAULT_VEHICLES = [
  'charger',
  'challenger',
  'trx',
  'trackhawk',
  'demon',
  'redeye',
  'durango',
  'mustang',
  'raptor',
  'shelby truck',
  'f150',
  'f250',
  'f350',
  'f450'
];

export default function FilterPanel({
  categories,
  selectedCategory,
  onCategoryChange,
  availableFilters,
  selectedFilters,
  onFiltersChange,
  filterTitleMap,
  availableVehicles,
  selectedVehicles,
  onVehiclesChange,
  priceMin,
  priceMax,
  onPriceChange,
  hideSpecsAndAttributes = true, // default hide here per shop page request
  onClear,
  showApplyButton = false
}: Props) {
  const norm = (s?: string) => (s || '').toLowerCase().trim();

  // Local mirrors so sliders/inputs are responsive
  const [minP, setMinP] = React.useState<number>(typeof priceMin === 'number' ? priceMin : 0);
  const [maxP, setMaxP] = React.useState<number>(typeof priceMax === 'number' ? priceMax : 10000);

  React.useEffect(() => {
    if (typeof priceMin === 'number') setMinP(priceMin);
    if (typeof priceMax === 'number') setMaxP(priceMax);
  }, [priceMin, priceMax]);

  const vehicles = (
    availableVehicles && availableVehicles.length > 0 ? availableVehicles : DEFAULT_VEHICLES
  ).map(norm);
  const selVehicles = (selectedVehicles || []).map(norm);

  const handleCategoryChange: React.ChangeEventHandler<HTMLInputElement> = (ev) => {
    const val = norm(ev.target.value) || 'all';
    onCategoryChange(val);
  };

  const handleFilterChange: React.ChangeEventHandler<HTMLInputElement> = (ev) => {
    const val = norm(ev.target.value);
    const checked = ev.target.checked;
    const set = new Set(selectedFilters.map(norm));
    if (checked) set.add(val);
    else set.delete(val);
    onFiltersChange(Array.from(set));
  };

  const handleVehicleChange: React.ChangeEventHandler<HTMLInputElement> = (ev) => {
    const val = norm(ev.target.value);
    const checked = ev.target.checked;
    if (!onVehiclesChange) return;
    const set = new Set(selVehicles);
    if (checked) set.add(val);
    else set.delete(val);
    onVehiclesChange(Array.from(set));
  };

  const clampPrice = (n: number) => Math.max(0, Math.min(10000, Math.round(n)));

  const commitPrice = (min: number, max: number) => {
    const a = clampPrice(min);
    const b = clampPrice(max);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    setMinP(lo);
    setMaxP(hi);
    if (onPriceChange) onPriceChange(lo, hi);
  };

  const clearAll = () => {
    onCategoryChange('all');
    onFiltersChange([]);
    if (onVehiclesChange) onVehiclesChange([]);
    commitPrice(0, 10000);
    if (onClear) onClear();
  };

  return (
    <div id="category-sidebar" className="text-white select-none radio-checkbox" aria-live="polite">
      {/* Categories */}
      <details open className="mb-3 rounded-lg border border-zinc-700/60">
        <summary className="flex items-center justify-between cursor-pointer px-3 py-2 text-sm uppercase tracking-wide text-white-300">
          <span>Categories</span>
          <span className="i-tabler-chevron-down" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="px-3 pb-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                id="cat-all"
                type="radio"
                name="category"
                value="all"
                checked={norm(selectedCategory) === 'all' || !selectedCategory}
                onChange={handleCategoryChange}
                className="mr-2 fas-radio focus:outline-none"
                style={{ accentColor: 'var(--fx-primary, #fb3636)' }}
              />
              <label htmlFor="cat-all" className="cursor-pointer">
                All
              </label>
            </div>
            {categories?.map((c) => {
              const slug = norm(c?.slug?.current || c?.title || '');
              const id = `cat-${slug || 'untitled'}`;
              return (
                <div key={c?._id || id} className="flex items-center gap-2">
                  <input
                    id={id}
                    type="radio"
                    name="category"
                    value={slug}
                    checked={norm(selectedCategory) === slug}
                    onChange={handleCategoryChange}
                    className="mr-2 fas-radio focus:outline-none"
                    style={{ accentColor: 'var(--fx-primary, #fb3636)' }}
                  />
                  <label htmlFor={id} className="cursor-pointer">
                    {c?.title || slug || 'Untitled'}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      </details>

      {/* Price */}
      <details className="mb-3 rounded-lg border border-zinc-700/60">
        <summary className="flex items-center justify-between cursor-pointer px-3 py-2 text-sm uppercase tracking-wide text-white-300">
          <span>Price</span>
          <span className="i-tabler-chevron-down" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="px-3 pb-3 space-y-3">
          <div className="flex flex-safe-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white-400">Min</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={10000}
                value={minP}
                onChange={(e) => setMinP(clampPrice(Number(e.target.value)))}
                onBlur={() => commitPrice(minP, maxP)}
                className="w-24 rounded-md bg-zinc-900 border border-zinc-700/60 px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white-400">Max</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={10000}
                value={maxP}
                onChange={(e) => setMaxP(clampPrice(Number(e.target.value)))}
                onBlur={() => commitPrice(minP, maxP)}
                className="w-24 rounded-md bg-zinc-900 border border-zinc-700/60 px-2 py-1 text-sm"
              />
            </div>
          </div>
          {/* Simple dual slider using two range inputs */}
          <div className="px-1 w-full">
            <input
              type="range"
              min={0}
              max={10000}
              step={50}
              value={minP}
              onChange={(e) => setMinP(clampPrice(Number(e.target.value)))}
              onMouseUp={() => commitPrice(minP, maxP)}
              onTouchEnd={() => commitPrice(minP, maxP)}
              className="w-full"
            />
            <input
              type="range"
              min={0}
              max={10000}
              step={50}
              value={maxP}
              onChange={(e) => setMaxP(clampPrice(Number(e.target.value)))}
              onMouseUp={() => commitPrice(minP, maxP)}
              onTouchEnd={() => commitPrice(minP, maxP)}
              className="w-full -mt-1"
            />
            <div className="mt-1 text-xs text-white-400">
              ${minP} – ${maxP}
            </div>
          </div>
        </div>
      </details>

      {/* Vehicle Compatibility */}
      {vehicles.length > 0 && (
        <details className="mb-3 rounded-lg border border-zinc-700/60">
          <summary className="flex items-center justify-between cursor-pointer px-3 py-2 text-sm uppercase tracking-wide text-white-300">
            <span>Vehicle Compatibility</span>
            <span className="i-tabler-chevron-down" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 grid grid-cols-1 gap-2">
            {vehicles.map((v) => {
              const id = `veh-${v.replace(/\s+/g, '-')}`;
              const checked = selVehicles.includes(v);
              const label = v
                .replace(/[-_]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <div className="flex items-center gap-2" key={id}>
                  <input
                    id={id}
                    type="checkbox"
                    value={v}
                    checked={checked}
                    onChange={handleVehicleChange}
                    className="h-4 w-4 cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <label htmlFor={id} className="cursor-pointer">
                    {label}
                  </label>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Filters (non-specs/attributes) */}
      <details className="mb-3 rounded-lg border border-zinc-700/60">
        <summary className="flex items-center justify-between cursor-pointer px-3 py-2 text-sm uppercase tracking-wide text-white-300">
          <span>Filters</span>
          <span className="i-tabler-chevron-down" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="px-3 pb-3 grid grid-cols-1 gap-2">
          {availableFilters?.map((f) => {
            const slug = norm(f);
            const id = `flt-${slug || 'x'}`;
            const checked = selectedFilters.map(norm).includes(slug);
            const label =
              (filterTitleMap && filterTitleMap[slug]) ||
              slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <div key={id} className="flex items-center gap-2">
                <input
                  id={id}
                  type="checkbox"
                  value={slug}
                  checked={checked}
                  onChange={handleFilterChange}
                  className="h-4 w-4 cursor-pointer filter-checkbox accent-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <label htmlFor={id} className="cursor-pointer capitalize">
                  {label}
                </label>
              </div>
            );
          })}
        </div>
      </details>

      {/* Specs/Attributes group intentionally omitted when hideSpecsAndAttributes is true */}
      {!hideSpecsAndAttributes && (
        <details className="mb-3 rounded-lg border border-zinc-700/60">
          <summary className="flex items-center justify-between cursor-pointer px-3 py-2 text-sm uppercase tracking-wide text-white-300">
            <span>Specifications & Attributes</span>
            <span className="i-tabler-chevron-down" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 text-sm text-white-400">
            {/* Render your specs/attributes controls here when used on other pages */}
            Coming soon…
          </div>
        </details>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={clearAll}
          className="px-3 py-2 text-xs rounded-md border border-zinc-600 hover:bg-zinc-800"
        >
          Clear
        </button>
        {showApplyButton && (
          <button
            type="button"
            onClick={(e) => e.currentTarget.dispatchEvent(new Event('apply', { bubbles: true }))}
            className="ml-auto px-3 py-2 text-xs rounded-md bg-primary/70 hover:bg-primary"
          >
            Apply
          </button>
        )}
      </div>
    </div>
  );
}
