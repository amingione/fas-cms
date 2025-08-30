import { useEffect, useMemo, useState } from 'react';
import type { Category } from '@lib/sanity-utils';
import { SearchBar } from '@components/SearchBar';
import { SortControls } from '@components/SortControls';
import { FilterPanel } from '@components/FilterPanel';
import { Button } from '@components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@components/ui/sheet';

type SortValue = 'featured' | 'name' | 'price-low' | 'price-high';
type ViewMode = 'grid' | 'list';

export interface ShopTopControlsProps {
  categories: Category[];
  availableFilters: string[];
  currentCategory?: string; // slug or ''
  selectedFilters?: string[];
}

export default function ShopTopControls({
  categories,
  availableFilters,
  currentCategory = '',
  selectedFilters = []
}: ShopTopControlsProps) {
  // Local UI state
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortValue>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [category, setCategory] = useState<string>(currentCategory || 'all');
  const [filters, setFilters] = useState<string[]>(selectedFilters);

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
      } catch {}
    };
    syncFromURL();
    window.addEventListener('popstate', syncFromURL);
    return () => window.removeEventListener('popstate', syncFromURL);
  }, []);

  const applyURL = (opts?: { withFilters?: boolean; withCategory?: boolean; withSearch?: boolean; withSort?: boolean }) => {
    const { withFilters = true, withCategory = true, withSearch = true, withSort = true } = opts || {};
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
    params.set('page', '1');
    window.location.href = `/shop?${params.toString()}`;
  };

  // Mobile-only Filters sheet trigger + Search
  return (
    <div className="w-full">
      {/* Mobile: search + filters button */}
      <div className="block md:hidden space-y-3">
        <SearchBar value={search} onChange={setSearch} onClear={() => setSearch('')} onSubmit={() => applyURL({})} />
        <div className="flex items-center justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <Button className="btn-glass btn-primary btn-md">Filters</Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-black/90 border-gray-700/50 overflow-hidden">
              <SheetHeader>
                <SheetTitle className="text-white">Filters</SheetTitle>
              </SheetHeader>
              <div className="p-2 flex-1 overflow-y-auto">
                <FilterPanel
                  categories={categories}
                  selectedCategory={category || 'all'}
                  onCategoryChange={setCategory}
                  availableFilters={availableFilters}
                  selectedFilters={filters}
                  onFiltersChange={setFilters}
                  onClear={() => { setCategory('all'); setFilters([]); }}
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
                      applyURL({ withFilters: true, withCategory: true, withSearch: false, withSort: false });
                    }}
                  >
                    Clear
                  </Button>
                  <Button className="w-1/2" onClick={() => applyURL({})}>Apply</Button>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <SortControls
            sortBy={sortBy}
            onSortChange={(v) => {
              setSortBy(v);
              // Apply immediately for a snappy feel on mobile
              applyURL({ withFilters: false, withCategory: false, withSearch: false, withSort: true });
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
          <SearchBar value={search} onChange={setSearch} onClear={() => setSearch('')} onSubmit={() => applyURL({})} />
        </div>
        <SortControls
          sortBy={sortBy}
          onSortChange={(v) => {
            setSortBy(v);
            applyURL({ withFilters: false, withCategory: false, withSearch: false, withSort: true });
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onClear={clearAll}
        />
      </div>
    </div>
  );
}
