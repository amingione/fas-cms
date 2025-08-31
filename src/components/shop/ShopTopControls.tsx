import { useEffect, useMemo, useState } from 'react';
import type { Category } from '@lib/sanity-utils';
import { SearchBar } from '@components/SearchBar';
import { SortControls } from '@components/SortControls';
import FilterPanel from '@components/FilterPanel';
import { Button } from '@components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from '@components/ui/sheet';

type SortValue = 'featured' | 'name' | 'price-low' | 'price-high';
type ViewMode = 'grid' | 'list';

export interface ShopTopControlsProps {
  categories: Category[];
  availableFilters: string[];
  currentCategory?: string; // slug or ''
  selectedFilters?: string[];
  priceMin?: number;
  priceMax?: number;
  selectedVehicles?: string[];
  availableVehicles?: string[];
}

export default function ShopTopControls({
  categories,
  availableFilters,
  currentCategory = '',
  selectedFilters = [],
  priceMin = 0,
  priceMax = 10000,
  selectedVehicles = [],
  availableVehicles = []
}: ShopTopControlsProps) {
  // Delegated click handler so label taps always toggle inputs
  const handleMobileFilterClick: React.MouseEventHandler<HTMLDivElement> = (ev) => {
    // If an input itself was clicked, let normal behavior proceed
    const target = ev.target as HTMLElement;
    if (target instanceof HTMLInputElement) return;

    const label = target.closest('label');
    if (!label) return;

    // Prefer input inside the label
    let input = label.querySelector(
      'input[type="checkbox"], input[type="radio"]'
    ) as HTMLInputElement | null;
    // Or adjacent to the label
    if (!input) {
      const prev = label.previousElementSibling as HTMLElement | null;
      const next = label.nextElementSibling as HTMLElement | null;
      if (prev && prev.matches('input[type="checkbox"], input[type="radio"]'))
        input = prev as HTMLInputElement;
      else if (next && next.matches('input[type="checkbox"], input[type="radio"]'))
        input = next as HTMLInputElement;
    }
    if (!input || input.disabled) return;

    ev.preventDefault();
    ev.stopPropagation();

    const val = (input.value || '').toLowerCase();
    if (input.type === 'radio') {
      if (!input.checked) {
        // Update the radio
        input.checked = true;
        // Treat radios as category selector
        setCategory(val || 'all');
      }
    } else if (input.type === 'checkbox') {
      // Toggle the checkbox
      const nextChecked = !input.checked;
      input.checked = nextChecked;
      setFilters((prev) => {
        const has = prev.includes(val);
        if (nextChecked && !has) return [...prev, val];
        if (!nextChecked && has) return prev.filter((f) => f !== val);
        return prev;
      });
    }
  };

  // Local UI state
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortValue>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [category, setCategory] = useState<string>(currentCategory || 'all');
  const [filters, setFilters] = useState<string[]>(selectedFilters);
  const [vehicles, setVehicles] = useState<string[]>(selectedVehicles || []);
  const [price, setPrice] = useState<{ min: number; max: number }>({
    min: typeof priceMin === 'number' ? Math.max(0, Math.min(10000, Math.floor(priceMin))) : 0,
    max: typeof priceMax === 'number' ? Math.max(0, Math.min(10000, Math.floor(priceMax))) : 10000
  });

  // Keep states in sync if URL changes (e.g., back/forward)
  useEffect(() => {
    const syncFromURL = () => {
      try {
        const url = new URL(window.location.href);
        setSearch(url.searchParams.get('q') || '');
        setSortBy((url.searchParams.get('sort') as SortValue) || 'featured');
        const cat = url.searchParams.get('categorySlug') || url.searchParams.get('category') || '';
        setCategory(cat || 'all');
        const raw = [
          ...url.searchParams.getAll('filter'),
          ...(url.searchParams.get('filters')?.split(',') || [])
        ]
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        setFilters(Array.from(new Set(raw)));

        // vehicles & price
        const v = url.searchParams.get('vehicles');
        setVehicles(
          v
            ? v
                .split(',')
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean)
            : []
        );
        const pm = Number(url.searchParams.get('priceMin'));
        const px = Number(url.searchParams.get('priceMax'));
        const min = Number.isFinite(pm) ? Math.max(0, Math.min(10000, Math.floor(pm))) : 0;
        const max = Number.isFinite(px) ? Math.max(0, Math.min(10000, Math.floor(px))) : 10000;
        setPrice({ min, max });
      } catch {}
    };
    syncFromURL();
    window.addEventListener('popstate', syncFromURL);
    return () => window.removeEventListener('popstate', syncFromURL);
  }, []);

  const applyURL = (opts?: {
    withFilters?: boolean;
    withCategory?: boolean;
    withSearch?: boolean;
    withSort?: boolean;
  }) => {
    const {
      withFilters = true,
      withCategory = true,
      withSearch = true,
      withSort = true
    } = opts || {};
    const params = new URLSearchParams(window.location.search);

    if (withCategory) {
      if (category && category !== 'all') {
        params.set('categorySlug', category);
        params.set('category', category);
      } else {
        params.delete('categorySlug');
        params.delete('category');
      }
    }

    if (withFilters) {
      params.delete('filters');
      // delete all multi-keys "filter"
      const toDelete: string[] = [];
      for (const [k] of params.entries()) if (k === 'filter') toDelete.push(k);
      toDelete.forEach((k) => params.delete(k));
      if (filters.length) {
        params.set('filters', filters.join(','));
        filters.forEach((f) => params.append('filter', f));
      }
    }

    // vehicles
    if (vehicles.length) params.set('vehicles', vehicles.join(','));
    else params.delete('vehicles');

    // price
    params.set('priceMin', String(price.min));
    params.set('priceMax', String(price.max));

    if (withSearch) {
      if (search) params.set('q', search);
      else params.delete('q');
    }

    if (withSort) {
      if (sortBy && sortBy !== 'featured') params.set('sort', sortBy);
      else params.delete('sort');
    }

    params.set('page', '1');
    window.location.href = `/shop?${params.toString()}`;
  };

  const clearAll = () => {
    setSearch('');
    setCategory('all');
    setFilters([]);
    setVehicles([]);
    setPrice({ min: 0, max: 10000 });
    setSortBy('featured');
    const params = new URLSearchParams(window.location.search);
    params.delete('q');
    params.delete('sort');
    params.delete('category');
    params.delete('categorySlug');
    params.delete('filters');
    const toDelete: string[] = [];
    for (const [k] of params.entries()) if (k === 'filter') toDelete.push(k);
    toDelete.forEach((k) => params.delete(k));
    params.delete('vehicles');
    params.delete('priceMin');
    params.delete('priceMax');
    params.set('page', '1');
    window.location.href = `/shop?${params.toString()}`;
  };

  // Mobile-only Filters sheet trigger + Search
  return (
    <div className="w-full">
      {/* Mobile: search + filters button */}
      <div className="block md:hidden space-y-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          onSubmit={() => applyURL({})}
        />
        <div className="flex items-center justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <Button className="btn-glass btn-primary btn-md">Filters</Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-black/90 border-gray-700/50 overflow-hidden">
              <SheetHeader>
                <SheetTitle className="text-white">Filters</SheetTitle>
              </SheetHeader>
              <div
                id="mobile-filters-capture"
                className="p-2 flex-1 overflow-y-auto"
                onClickCapture={handleMobileFilterClick}
              >
                <FilterPanel
                  categories={categories}
                  selectedCategory={category || 'all'}
                  onCategoryChange={setCategory}
                  availableFilters={availableFilters}
                  selectedFilters={filters}
                  onFiltersChange={setFilters}
                  availableVehicles={availableVehicles}
                  selectedVehicles={vehicles}
                  onVehiclesChange={setVehicles}
                  priceMin={price.min}
                  priceMax={price.max}
                  onPriceChange={(min, max) => setPrice({ min, max })}
                  hideSpecsAndAttributes={true}
                  onClear={() => {
                    setCategory('all');
                    setFilters([]);
                    setVehicles([]);
                    setPrice({ min: 0, max: 10000 });
                  }}
                  showApplyButton={false}
                />
              </div>
              <SheetFooter>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    className="w-1/2"
                    onClick={() => {
                      setCategory('all');
                      setFilters([]);
                      setVehicles([]);
                      setPrice({ min: 0, max: 10000 });
                      applyURL({
                        withFilters: true,
                        withCategory: true,
                        withSearch: false,
                        withSort: false
                      });
                    }}
                  >
                    Clear
                  </Button>
                  <Button className="w-1/2" onClick={() => applyURL({})}>
                    Apply
                  </Button>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <SortControls
            sortBy={sortBy}
            onSortChange={(v) => {
              setSortBy(v);
              // Apply immediately for a snappy feel on mobile
              applyURL({
                withFilters: false,
                withCategory: false,
                withSearch: false,
                withSort: true
              });
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onClear={clearAll}
          />
        </div>
      </div>

      {/* Desktop: search + sort */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            onSubmit={() => applyURL({})}
          />
        </div>
        <SortControls
          sortBy={sortBy}
          onSortChange={(v) => {
            setSortBy(v);
            applyURL({
              withFilters: false,
              withCategory: false,
              withSearch: false,
              withSort: true
            });
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onClear={clearAll}
        />
      </div>
    </div>
  );
}
