import { useEffect, useState } from 'react';
import { SearchTabs } from '@components/SearchTabs';

export default function SearchTabsHeader() {
  const [value, setValue] = useState('all');

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      setValue(url.searchParams.get('type') || 'all');
    } catch {}
  }, []);

  const onChange = (val: string) => {
    setValue(val);
    const params = new URLSearchParams(window.location.search);
    if (val === 'all') params.delete('type');
    else params.set('type', val);
    params.set('page', '1');
    window.location.href = `${window.location.pathname}?${params.toString()}`;
  };

  return (
    <SearchTabs
      value={value}
      onValueChange={onChange}
      items={[
        { id: 'all', label: 'All' },
        { id: 'product', label: 'Products' },
        { id: 'page', label: 'Pages' },
        { id: 'service', label: 'Services' }
      ]}
      fullWidth
    />
  );
}

