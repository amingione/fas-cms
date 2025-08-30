import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { cn } from '@components/ui/utils';

export interface SearchTabItem {
  id: string;
  label: string;
}

interface SearchTabsProps {
  items?: SearchTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  fullWidth?: boolean;
}

export function SearchTabs({ items, value, onValueChange, className, fullWidth = false }: SearchTabsProps) {
  const defaultItems: SearchTabItem[] = [
    { id: 'all', label: 'All' },
    { id: 'products', label: 'Products' },
    { id: 'collections', label: 'Collections' }
  ];

  const tabs = items && items.length ? items : defaultItems;

  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn('w-full', className)}>
      <TabsList className={cn('bg-black/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-1', fullWidth ? 'w-full' : 'w-fit')}>
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="font-ethno text-sm">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {/* Consumers provide their own <TabsContent /> if needed; keeping component focused on triggers */}
      <TabsContent value={value} />
    </Tabs>
  );
}
