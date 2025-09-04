import { useEffect, useMemo, useState } from 'react';
import type { Category, Product } from '@lib/sanity-utils';
import { SearchBar } from '@components/SearchBar';
import { SortControls } from '@/components/storefront/SortControls';
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
import FilterIcon from '@components/icons/FilterIcon';

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
  priceMax = 100000,
  selectedVehicles = [],
  availableVehicles = []
}: ShopTopControlsProps) {
  // Local UI state
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortValue>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [category, setCategory] = useState<string>(currentCategory || 'all');
  const [filters, setFilters] = useState<string[]>(selectedFilters);
  const [vehicles, setVehicles] = useState<string[]>(selectedVehicles || []);
  const [price, setPrice] = useState<{ min: number; max: number }>({
    min: typeof priceMin === 'number' ? Math.max(0, Math.min(100000, Math.floor(priceMin))) : 0,
    max: typeof priceMax === 'number' ? Math.max(0, Math.min(100000, Math.floor(priceMax))) : 100000
  });

  // Keep states in sync if URL changes (e.g., back/forward)
  useEffect(() => {
    const syncFromURL = () => {
      try {
        const url = new URL(window.location.href);
        setSearch(url.searchParams.get('q') || '');
        setSortBy((url.searchParams.get('sort') as SortValue) || 'featured');
        const cat =
          url.searchParams.get('categorySlug') || url.searchParams.get('category') || 'all';
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
        const min = Number.isFinite(pm) ? Math.max(0, Math.min(100000, Math.floor(pm))) : 0;
        const max = Number.isFinite(px) ? Math.max(0, Math.min(100000, Math.floor(px))) : 100000;
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
    withView?: boolean;
    sortValue?: SortValue;
    viewValue?: ViewMode;
  }) => {
    const {
      withFilters = true,
      withCategory = true,
      withSearch = true,
      withSort = true,
      withView = false,
      sortValue,
      viewValue
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
      const sv = (sortValue || sortBy) as SortValue;
      if (sv && sv !== 'featured') params.set('sort', sv);
      else params.delete('sort');
    }

    if (withView) {
      const vv = (viewValue || viewMode) as ViewMode;
      if (vv && vv !== 'grid') params.set('view', vv);
      else params.delete('view');
    }

    params.set('page', '1');
    window.location.href = `/shop?${params.toString()}`;
  };

  const clearAll = () => {
    setSearch('');
    setCategory('all');
    setFilters([]);
    setVehicles([]);
    setPrice({ min: 0, max: 100000 });
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

  // (mobile sheet uses native input/label behavior; no delegated click handler)

  // Mobile-only Filters sheet trigger + Search
  return (
    <div className="w-full">
      {/* Mobile: search + filters button */}
      <div className="block md:hidden w-full space-y-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          onSubmit={() => applyURL({})}
        />
        <div className="flex w-full gap-3 items-center justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                aria-label="Filters"
                className="h-10 w-10 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 text-white flex items-center justify-center"
              >
                <FilterIcon className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-black/90 border-gray-700/50 overflow-hidden w-[92vw] max-w-[440px] sm:max-w-[520px]"
            >
              <SheetHeader>
                <SheetTitle className="text-white font-kwajong">Filters</SheetTitle>
              </SheetHeader>
              <div
                id="mobile-filters-capture"
                className="p-3 flex-1 overflow-y-auto"
                style={{ pointerEvents: 'auto' }}
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
                    setPrice({ min: 0, max: 100000 });
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
                      setPrice({ min: 0, max: 100000 });
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
              // Apply immediately and pass the chosen sort to avoid stale state
              applyURL({
                withFilters: false,
                withCategory: false,
                withSearch: false,
                withSort: true,
                sortValue: v
              });
            }}
            viewMode={viewMode}
            onViewModeChange={(m) => {
              setViewMode(m);
              applyURL({
                withFilters: false,
                withCategory: false,
                withSearch: false,
                withSort: false,
                withView: true,
                viewValue: m
              });
            }}
            onClear={clearAll}
            className="flex-1 min-w-0"
            compactClear
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
            applyURL({
              withFilters: false,
              withCategory: false,
              withSearch: false,
              withSort: true,
              sortValue: v
            });
          }}
          viewMode={viewMode}
          onViewModeChange={(m) => {
            setViewMode(m);
            applyURL({
              withFilters: false,
              withCategory: false,
              withSearch: false,
              withSort: false,
              withView: true,
              viewValue: m
            });
          }}
          onClear={clearAll}
        />
      </div>
    </div>
  );
}
