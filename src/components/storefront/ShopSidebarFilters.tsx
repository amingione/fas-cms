import type { Category } from '@lib/sanity-utils';
import FilterPanel from '@components/FilterPanel.tsx';
import { Button } from '@components/ui/button';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface ShopSidebarFiltersProps {
  categories: Category[];
  availableFilters: string[];
  filterTitleMap?: Record<string, string>;
  currentCategory?: string;
  selectedFilters?: string[];
  priceMin?: number;
  priceMax?: number;
  selectedVehicles?: string[];
  availableVehicles?: string[];
}

export default function ShopSidebarFilters({
  categories,
  availableFilters,
  filterTitleMap,
  currentCategory = '',
  selectedFilters = [],
  priceMin = 0,
  priceMax = 100000,
  selectedVehicles = [],
  availableVehicles = []
}: ShopSidebarFiltersProps) {
  const [category, setCategory] = useState<string>(currentCategory || 'all');
  const [filters, setFilters] = useState<string[]>(selectedFilters);
  const [vehicles, setVehicles] = useState<string[]>(selectedVehicles || []);
  const [price, setPrice] = useState<{ min: number; max: number }>({
    min: typeof priceMin === 'number' ? Math.max(0, Math.min(100000, Math.floor(priceMin))) : 0,
    max: typeof priceMax === 'number' ? Math.max(0, Math.min(100000, Math.floor(priceMax))) : 100000
  });

  const handleSidebarClick: React.MouseEventHandler<HTMLDivElement> = (ev) => {
    const target = ev.target as HTMLElement;
    if (target instanceof HTMLInputElement) return;
    const label = target.closest('label');
    if (!label) return;
    let input = label.querySelector('input[type="checked"]') as HTMLInputElement | null;
    if (!input) {
      const prev = label.previousElementSibling as HTMLElement | null;
      const next = label.nextElementSibling as HTMLElement | null;
      if (prev && prev.matches('input[type="checked"]')) input = prev as HTMLInputElement;
      else if (next && next.matches('input[type="radio"]')) input = next as HTMLInputElement;
    }
    if (!input || input.disabled) return;
    // Only manage category radios here; let checkboxes (filters/vehicles) bubble to their own onChange
    const val = (input.value || '').toLowerCase();
    if (!input.checked) {
      setCategory(val || 'all');
    }
  };

  const applyURL = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    // category
    if (category && category !== 'all') {
      params.set('categorySlug', category);
      params.set('category', category);
    } else {
      params.delete('categorySlug');
      params.delete('category');
    }
    // filters (both plural and repeated singular for backward compatibility)
    params.delete('filters');
    const toDelete: string[] = [];
    for (const [k] of params.entries()) if (k === 'filter') toDelete.push(k);
    toDelete.forEach((k) => params.delete(k));
    if (filters.length) {
      params.set('filters', filters.join(','));
      filters.forEach((f) => params.append('filter', f));
    }
    // vehicles
    if (vehicles.length) {
      params.set('vehicles', vehicles.join(','));
      params.set('vehicleSlug', vehicles[0]);
    } else {
      params.delete('vehicles');
      params.delete('vehicleSlug');
    }
    // price
    params.set('minPrice', String(price.min));
    params.set('maxPrice', String(price.max));
    params.delete('priceMin');
    params.delete('priceMax');
    // reset page
    params.set('page', '1');
    window.location.href = `/shop?${params.toString()}`;
  }, [category, filters, vehicles, price.min, price.max]);

  // Auto-apply category change on desktop so radios take effect immediately
  const initialCategory = useRef<string>(category);
  useEffect(() => {
    if (initialCategory.current !== category) {
      applyURL();
    }
  }, [category, applyURL]);

  return (
    <div onClickCapture={handleSidebarClick} className="space-y-3">
      <FilterPanel
        categories={categories}
        selectedCategory={category}
        onCategoryChange={setCategory}
        availableFilters={availableFilters}
        selectedFilters={filters}
        onFiltersChange={setFilters}
        filterTitleMap={filterTitleMap}
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
      <Button onClick={applyURL} className="w-full mt-3">
        Apply
      </Button>
    </div>
  );
}

/* Move the following CSS to your global stylesheet (e.g., styles/globals.css or styles.css):

#mobile-filters-capture input[type="radio"] {
  -webkit-appearance: radio !important;
  appearance: auto !important;
  accent-color: var(--fx-primary, #fb3636) !important;
}
*/
