import { cn } from '@components/ui/utils';
import { ChevronDown, Grid3X3, List, X } from 'lucide-react';
import { Button } from '@components/ui/button';

type SortValue = 'featured' | 'name' | 'price-low' | 'price-high';
type ViewMode = 'grid' | 'list';

interface SortControlsProps {
  sortBy: SortValue;
  onSortChange: (value: SortValue) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onClear?: () => void;
  className?: string;
}

export function SortControls({
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onClear,
  className
}: SortControlsProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative">
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortValue)}
          className="appearance-none bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2 pr-8 text-white font-ethno text-sm focus:border-primary focus:ring-primary/20 cursor-pointer"
        >
          <option value="featured">Featured</option>
          <option value="name">Name A-Z</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-graylight pointer-events-none" />
      </div>

      <div className="flex border border-gray-600/50 rounded-lg overflow-hidden">
        <button
          onClick={() => onViewModeChange('grid')}
          className={cn(
            'p-2 transition-colors',
            viewMode === 'grid'
              ? 'bg-primary text-white'
              : 'bg-gray-800/50 text-graylight hover:text-white'
          )}
          aria-label="Grid view"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className={cn(
            'p-2 transition-colors',
            viewMode === 'list'
              ? 'bg-primary text-white'
              : 'bg-gray-800/50 text-graylight hover:text-white'
          )}
          aria-label="List view"
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {onClear && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-graylight hover:text-white font-ethno"
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
