import type { Category } from '@lib/sanity-utils';
import { FilterPanel } from '@components/FilterPanel';
import { Button } from '@components/ui/button';
import { useState } from 'react';

export interface ShopSidebarFiltersProps {
  categories: Category[];
  availableFilters: string[];
  currentCategory?: string;
  selectedFilters?: string[];
}

export default function ShopSidebarFilters({
  categories,
  availableFilters,
  currentCategory = '',
  selectedFilters = []
}: ShopSidebarFiltersProps) {
  const [category, setCategory] = useState<string>(currentCategory || 'all');
  const [filters, setFilters] = useState<string[]>(selectedFilters);

  const applyURL = () => {
    const params = new URLSearchParams(window.location.search);
    if (category && category !== 'all') {
      params.set('categorySlug', category);
      params.set('category', category);
    } else {
      params.delete('categorySlug');
      params.delete('category');
    }

    params.delete('filters');
    const toDelete: string[] = [];
    for (const [k] of params.entries()) if (k === 'filter') toDelete.push(k);
    toDelete.forEach((k) => params.delete(k));
    if (filters.length) {
      params.set('filters', filters.join(','));
      filters.forEach((f) => params.append('filter', f));
    }

    params.set('page', '1');
    window.location.href = `/shop?${params.toString()}`;
  };

  return (
    <div>
      <FilterPanel
        categories={categories}
        selectedCategory={category}
        onCategoryChange={setCategory}
        availableFilters={availableFilters}
        selectedFilters={filters}
        onFiltersChange={setFilters}
        onClear={() => { setCategory('all'); setFilters([]); }}
        showApplyButton={false}
      />
      <Button onClick={applyURL} className="w-full mt-3">Apply</Button>
    </div>
  );
}
