import type { Category } from '@lib/sanity-utils';
import { cn } from '@components/ui/utils';
import { Button } from '@components/ui/button';

interface FilterPanelProps {
  categories: Category[];
  selectedCategory: string; // 'all' or slug/id
  onCategoryChange: (value: string) => void;

  availableFilters: string[]; // tags/filters in lowercase
  selectedFilters: string[];
  onFiltersChange: (values: string[]) => void;

  onApply?: () => void;
  onClear?: () => void;
  className?: string;
  showApplyButton?: boolean;
}

export function FilterPanel({
  categories,
  selectedCategory,
  onCategoryChange,
  availableFilters,
  selectedFilters,
  onFiltersChange,
  onApply,
  onClear,
  className,
  showApplyButton = true
}: FilterPanelProps) {
  const toggleFilter = (tag: string) => {
    const next = selectedFilters.includes(tag)
      ? selectedFilters.filter((t) => t !== tag)
      : [...selectedFilters, tag];
    onFiltersChange(next);
  };

  return (
    <aside
      className={cn(
        'w-full md:w-64 bg-black/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 space-y-5',
        className
      )}
    >
      <section>
        <h3 className="fas-label text-muted-foreground px-1 mb-2">Categories</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 fas-body-sm text-white/90 cursor-pointer select-none hover:bg-white/5 rounded-md px-2 py-1">
            <input
              type="radio"
              name="category-filter"
              value="all"
              checked={selectedCategory === 'all' || !selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="sr-only"
            />
            <span
              className={cn(
                'h-4 w-4 rounded-full border flex items-center justify-center',
                selectedCategory === 'all' || !selectedCategory
                  ? 'border-primary'
                  : 'border-gray-500'
              )}
            >
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  selectedCategory === 'all' || !selectedCategory
                    ? 'bg-primary opacity-100'
                    : 'opacity-0'
                )}
              />
            </span>
            <span>All</span>
          </label>
          {Array.isArray(categories) && categories.length > 0 ? (
            categories.map((cat) => {
              const value = (cat as any).slug?.current || (cat as any).id || (cat as any)._id || '';
              const label = (cat as any).title || (cat as any).name || value;
              const checked = selectedCategory === value;
              return (
                <label
                  key={value}
                  className="flex items-center gap-2 fas-body-sm text-white/90 cursor-pointer select-none hover:bg-white/5 rounded-md px-2 py-1"
                >
                  <input
                    type="radio"
                    name="category-filter"
                    value={value}
                    checked={checked}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'h-4 w-4 rounded-full border flex items-center justify-center',
                      checked ? 'border-primary' : 'border-gray-500'
                    )}
                  >
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        checked ? 'bg-primary opacity-100' : 'opacity-0'
                      )}
                    />
                  </span>
                  <span>{label}</span>
                </label>
              );
            })
          ) : (
            <p className="text-sm opacity-70 px-1">No categories available.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="fas-label text-muted-foreground">Filters</h3>
          {onClear && (selectedFilters.length > 0 || selectedCategory !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-white px-2 py-1 h-7"
              onClick={(e) => {
                e.preventDefault();
                onCategoryChange('all');
                onClear?.();
              }}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="space-y-2" id="filters-md">
          {Array.isArray(availableFilters) && availableFilters.length > 0 ? (
            availableFilters.map((tag) => (
              <div
                key={tag}
                className="flex items-center gap-2 fas-body-sm text-white/90 cursor-pointer select-none hover:bg-white/5 rounded-md px-2 py-1"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedFilters.includes(tag)}
                  onChange={() => toggleFilter(tag)}
                />
                <span
                  className={cn(
                    'h-4 w-4 rounded-full border flex items-center justify-center',
                    selectedFilters.includes(tag) ? 'border-primary' : 'border-gray-500'
                  )}
                >
                  <span
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      selectedFilters.includes(tag) ? 'bg-primary opacity-100' : 'opacity-0'
                    )}
                  />
                </span>
                <span className="capitalize">{tag}</span>
              </div>
            ))
          ) : (
            <p className="text-sm opacity-70 px-1">No filters available.</p>
          )}
        </div>
      </section>

      {showApplyButton && (
        <div className="flex gap-2 mt-2">
          {onClear && (
            <Button variant="outline" onClick={onClear} className="w-1/2">
              Clear
            </Button>
          )}
          <Button
            onClick={onApply}
            className={cn('btn-glass btn-primary btn-md', onClear ? 'w-1/2' : 'w-full')}
          >
            Apply
          </Button>
        </div>
      )}
    </aside>
  );
}
