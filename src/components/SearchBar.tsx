import { cn } from '@components/ui/utils';
import { Input } from '@components/ui/input';
import { X, Search } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  // When provided, submits to this path with `?q=` like header forms
  action?: string; // e.g., '/search'
  placeholder?: string;
  className?: string;
  size?: 'default' | 'compact';
  enableSuggestions?: boolean;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  action,
  placeholder = 'Search products... ',
  className,
  size = 'default',
  enableSuggestions = true
}: SearchBarProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number>(-1);
  const [items, setItems] = useState<any[]>([]);
  const minChars = 2;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = value.trim();
        if (!q) return; // prevent empty submit
        if (enableSuggestions && open && active >= 0 && items[active]) {
          // If a suggestion is highlighted, follow it
          const href = resolveLink(items[active], q);
          if (href) window.location.href = href;
          return;
        }
        if (action) {
          const url = `${action}?q=${encodeURIComponent(q)}`;
          window.location.href = url;
        } else {
          onSubmit?.();
        }
      } else if (enableSuggestions && open && (e.key === 'ArrowDown' || e.key === 'Tab')) {
        e.preventDefault();
        setActive((a) => (items.length ? (a + 1) % items.length : -1));
      } else if (enableSuggestions && open && e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => (items.length ? (a - 1 + items.length) % items.length : -1));
      } else if (enableSuggestions && e.key === 'Escape') {
        setOpen(false);
        setActive(-1);
      }
    },
    [onSubmit, value, action, enableSuggestions, open, active, items]
  );

  const inputClasses = cn(
    'pl-12 bg-gray-800/50 border-gray-600/50 text-white placeholder-graylight focus:border-primary focus:ring-primary/20 font-kwajong',
    size === 'compact' ? 'h-10 text-sm' : 'h-12 text-base'
  );

  // Debounced suggestions
  useEffect(() => {
    if (!enableSuggestions) return;
    const q = value.trim();
    if (q.length < minChars) {
      setItems([]);
      setOpen(false);
      setActive(-1);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error('search failed');
        const data = await res.json();
        const arr = Array.isArray(data?.results) ? data.results : [];
        setItems(arr);
        setOpen(arr.length > 0);
        setActive(-1);
      } catch {
        setItems([]);
        setOpen(false);
        setActive(-1);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [value, enableSuggestions]);

  // Close suggestions on outside click
  useEffect(() => {
    if (!enableSuggestions) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [enableSuggestions]);

  const submitHandler = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = value.trim();
      if (!q) return;
      if (action) {
        window.location.href = `${action}?q=${encodeURIComponent(q)}`;
      } else {
        onSubmit?.();
      }
    },
    [value, action, onSubmit]
  );

  return (
    <div className={cn('relative w-full', className)} ref={rootRef}>
      <form action={action} method="GET" onSubmit={submitHandler} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-graylight" />
        <Input
          name="q"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClasses}
          type="text"
          autoComplete="off"
          aria-label="Search"
          onFocus={() => {
            if (items.length) setOpen(true);
          }}
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={onClear ?? (() => onChange(''))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-graylight hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {enableSuggestions && open && items.length > 0 && (
        <div className="absolute left-0 mt-2 w-full max-w-[380px] bg-black/90 backdrop-blur-md border border-white/10 rounded-lg shadow-xl z-[70] max-h-[60vh] overflow-auto">
          {items.slice(0, 8).map((it, idx) => {
            const q = value.trim();
            const href = resolveLink(it, q) || `${action || '/search'}?q=${encodeURIComponent(q)}`;
            const title = it?.title || it?.name || it?._type || 'Untitled';
            const img = getThumb(it);
            const price = formatPrice(it?.price);
            const isActive = idx === active;
            return (
              <a
                key={String(it?._id || it?.slug?.current || idx)}
                href={href}
                className={cn('block px-3 py-2 hover:bg-white/10', isActive && 'bg-white/10')}
                onMouseEnter={() => setActive(idx)}
              >
                <div className="flex items-center gap-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, lineHeight: 1.2 }}>
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="w-10 h-10 object-cover rounded border border-white/10" />
                  ) : null}
                  <div className="min-w-0">
                    <div className="truncate font-semibold" style={{ fontFamily: 'Arial, sans-serif', fontSize: 12 }}>{title}</div>
                    <div className="flex items-center gap-2 text-white/70" style={{ fontFamily: 'Arial, sans-serif', fontSize: 11 }}>
                      <span className="uppercase">{String(it?._type || '')}</span>
                      {price ? <span className="text-accent">{price}</span> : null}
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
          <div className="border-t border-white/10" />
          <a
            href={`${action || '/search'}?q=${encodeURIComponent(value.trim())}`}
            className="block px-3 py-2 text-center text-xs text-white/70 hover:bg-white/10"
            style={{ fontFamily: 'Arial, sans-serif', fontSize: 12 }}
          >
            See all results for “{value.trim()}”
          </a>
        </div>
      )}
    </div>
  );
}

// Helpers copied to match Header.astro behavior
function getThumb(it: any) {
  const byPath =
    it?.image?.asset?.url ||
    it?.mainImage?.asset?.url ||
    (Array.isArray(it?.images) && it.images[0]?.asset?.url) ||
    it?.thumbnail?.asset?.url ||
    it?.thumb?.asset?.url ||
    it?.imageUrl ||
    '';
  return typeof byPath === 'string' ? byPath : '';
}

function formatPrice(v: any) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return '';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function resolveLink(it: any, q: string) {
  if (it && typeof it.url === 'string' && it.url) return it.url;
  const slug = (it && it.slug && (it.slug.current || it.slug)) || '';
  switch (it && it._type) {
    case 'product':
      return slug ? `/shop/${slug}` : `${'/search'}?q=${encodeURIComponent(q)}`;
    case 'service':
      return slug ? `/service/${slug}` : `${'/search'}?q=${encodeURIComponent(q)}`;
    case 'quote':
      return `/dashboard/quotes/${it._id || ''}`;
    case 'invoice':
      return `/dashboard/invoices/${it._id || ''}`;
    case 'appointment':
      return `/dashboard/appointments/${it._id || ''}`;
    case 'page':
      return slug ? `/${slug}` : `${'/search'}?q=${encodeURIComponent(q)}`;
    default:
      return `${'/search'}?q=${encodeURIComponent(q)}`;
  }
}
