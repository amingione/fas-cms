import { cn } from '@components/ui/utils';
import { Input } from '@components/ui/input';
import { X, Search } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  // When provided, submits to this path with `?q=` like header forms
  action?: string; // e.g., '/search'
  placeholder?: string;
  className?: string;
  size?: 'default' | 'compact';
  enableSuggestions?: boolean;
  variant?: 'default' | 'storefront';
  portal?: boolean; // render suggestions into body to avoid clipping
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
  enableSuggestions = true,
  variant = 'default',
  portal = true
}: SearchBarProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number>(-1);
  const [items, setItems] = useState<any[]>([]);
  const [innerValue, setInnerValue] = useState('');
  const minChars = 2;

  const isControlled = typeof value === 'string';
  const currentValue = isControlled ? (value as string) : innerValue;

  // Portal position state
  const [panelPos, setPanelPos] = useState<{ left: number; top: number; width: number }>({
    left: 0,
    top: 0,
    width: 0
  });
  const [panelNode, setPanelNode] = useState<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = currentValue.trim();
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
    [onSubmit, currentValue, action, enableSuggestions, open, active, items]
  );

  const baseDefault =
    'pl-12 bg-gray-800/50 border-gray-600/50 text-white placeholder-graylight focus:border-primary focus:ring-primary/20 font-kwajong';
  const sizeCls = size === 'compact' ? 'h-10 text-sm' : 'h-12 text-base';
  const baseStorefront =
    'pl-12 bg-black/60 border-white/20 text-white placeholder-white/70 focus:border-primary focus:ring-primary/20 font-kwajong rounded-fx-md';
  const inputClasses = cn(variant === 'storefront' ? baseStorefront : baseDefault, sizeCls);

  // If suggestions are disabled (e.g., header on /shop), immediately close/clear
  useEffect(() => {
    if (!enableSuggestions) {
      setOpen(false);
      setActive(-1);
      setItems([]);
      return;
    }
    const q = currentValue.trim();
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
  }, [currentValue, enableSuggestions]);

  // Close suggestions on outside click (accounts for portal)
  useEffect(() => {
    if (!enableSuggestions) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      const inRoot = !!rootRef.current && rootRef.current.contains(target);
      const inPortal = !!panelNode && panelNode.contains(target as Node);
      if (!inRoot && !inPortal) {
        setOpen(false);
        setActive(-1);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [enableSuggestions, panelNode]);

  const submitHandler = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = currentValue.trim();
      if (!q) return;
      if (action) {
        window.location.href = `${action}?q=${encodeURIComponent(q)}`;
      } else {
        onSubmit?.();
      }
    },
    [currentValue, action, onSubmit]
  );

  // Compute and set panel position relative to the input field
  const positionPanel = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const r = input.getBoundingClientRect();
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const margin = 8;
    const maxWidth = Math.min(380, vw - margin * 2);
    const width = Math.min(Math.max(r.width, 240), maxWidth);
    let left = r.left;
    if (left + width + margin > vw) left = Math.max(margin, r.right - width);
    left = Math.max(margin, Math.min(left, vw - width - margin));
    setPanelPos({
      left: Math.round(left),
      top: Math.round(r.bottom + 8),
      width: Math.round(width)
    });
  }, []);

  // Keep panel positioned on scroll/resize when open
  useEffect(() => {
    if (!enableSuggestions || !portal || !open) return;
    positionPanel();
    const onScroll = () => positionPanel();
    const onResize = () => positionPanel();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [enableSuggestions, portal, open, positionPanel]);

  // Create a portal container once on mount if portal is enabled
  useEffect(() => {
    if (!portal) return;
    const node = document.createElement('div');
    node.setAttribute('data-sb-portal', '1');
    document.body.appendChild(node);
    setPanelNode(node);
    return () => {
      try {
        document.body.removeChild(node);
      } catch {}
    };
  }, [portal]);

  return (
    <div className={cn('relative w-full', className)} ref={rootRef}>
      <form action={action} method="GET" onSubmit={submitHandler} className="relative">
        <Search
          className={cn(
            'absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5',
            variant === 'storefront' ? 'text-white/70' : 'text-white/60'
          )}
        />
        <Input
          name="q"
          value={currentValue}
          onChange={(e) => {
            const v = e.target.value;
            onChange ? onChange(v) : setInnerValue(v);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClasses}
          type="text"
          autoComplete="off"
          aria-label="Search"
          ref={inputRef as any}
          onFocus={() => {
            if (items.length) setOpen(true);
            if (portal) positionPanel();
          }}
        />
        {currentValue && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={
              onClear ??
              (() => {
                if (onChange) onChange('');
                if (!isControlled) setInnerValue('');
              })
            }
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              variant === 'storefront'
                ? 'text-white/70 hover:text-white'
                : 'text-white/60 hover:text-white'
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {enableSuggestions &&
        open &&
        items.length > 0 &&
        (!portal ? (
          <div
            className={cn(
              'absolute left-0 mt-2 w-full max-w-[380px] rounded-lg shadow-xl z-[70] max-h-[60vh] overflow-auto backdrop-blur-md',
              variant === 'storefront'
                ? 'bg-black/90 border-white/20'
                : 'bg-black/85 border border-gray-700/50'
            )}
          >
            {items.slice(0, 8).map((it, idx) => {
              const q = currentValue.trim();
              const href =
                resolveLink(it, q) || `${action || '/search'}?q=${encodeURIComponent(q)}`;
              const title = it?.title || it?.name || it?._type || 'Untitled';
              const img = getThumb(it);
              const price = formatPrice(it?.price);
              const isActive = idx === active;
              return (
                <a
                  key={String(it?._id || it?.slug?.current || idx)}
                  href={href}
                  className={cn('block px-3 py-2 hover:bg-white/80', isActive && 'bg-white/80')}
                  onMouseEnter={() => setActive(idx)}
                >
                  <div
                    className="flex items-center gap-3"
                    style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, lineHeight: 1.2 }}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="w-10 h-10 object-cover rounded border border-white/20"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div
                        className="truncate font-semibold"
                        style={{ fontFamily: 'Arial, sans-serif', fontSize: 12 }}
                      >
                        {title}
                      </div>
                      <div
                        className="flex items-center gap-2 text-white/70"
                        style={{ fontFamily: 'Arial, sans-serif', fontSize: 11 }}
                      >
                        <span className="uppercase">{String(it?._type || '')}</span>
                        {price ? <span className="text-accent">{price}</span> : null}
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
            <div className="border-t border-white/20" />
            <a
              href={`${action || '/search'}?q=${encodeURIComponent(currentValue.trim())}`}
              className="block px-3 py-2 text-center text-xs text-white/70 hover:bg-white/80"
              style={{ fontFamily: 'Arial, sans-serif', fontSize: 12 }}
            >
              See all results for “{currentValue.trim()}”
            </a>
          </div>
        ) : panelNode ? (
          createPortal(
            <div
              className={cn(
                'rounded-lg shadow-xl z-[2147483647] max-h-[60vh] overflow-auto backdrop-blur-md fixed',
                variant === 'storefront'
                  ? 'bg-black/90 border-white/20'
                  : 'bg-black/85 border border-gray-700/50'
              )}
              style={{ left: panelPos.left, top: panelPos.top, width: panelPos.width }}
              onMouseDown={(e) => {
                // Prevent root click handler from closing immediately
                e.stopPropagation();
              }}
            >
              {items.slice(0, 8).map((it, idx) => {
                const q = currentValue.trim();
                const href =
                  resolveLink(it, q) || `${action || '/search'}?q=${encodeURIComponent(q)}`;
                const title = it?.title || it?.name || it?._type || 'Untitled';
                const img = getThumb(it);
                const price = formatPrice(it?.price);
                const isActive = idx === active;
                return (
                  <a
                    key={String(it?._id || it?.slug?.current || idx)}
                    href={href}
                    className={cn('block px-3 py-2 hover:bg-white/80', isActive && 'bg-white/80')}
                    onMouseEnter={() => setActive(idx)}
                  >
                    <div
                      className="flex items-center gap-3"
                      style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, lineHeight: 1.2 }}
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt=""
                          className="w-10 h-10 object-cover rounded border border-white/20"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div
                          className="truncate font-semibold"
                          style={{ fontFamily: 'Arial, sans-serif', fontSize: 12 }}
                        >
                          {title}
                        </div>
                        <div
                          className="flex items-center gap-2 text-white/70"
                          style={{ fontFamily: 'Arial, sans-serif', fontSize: 11 }}
                        >
                          <span className="uppercase">{String(it?._type || '')}</span>
                          {price ? <span className="text-accent">{price}</span> : null}
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
              <div className="border-t border-white/20" />
              <a
                href={`${action || '/search'}?q=${encodeURIComponent(currentValue.trim())}`}
                className="block px-3 py-2 text-center text-xs text-white/70 hover:bg-white/80"
                style={{ fontFamily: 'Arial, sans-serif', fontSize: 12 }}
              >
                See all results for “{currentValue.trim()}”
              </a>
            </div>,
            panelNode
          )
        ) : null)}
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
      return slug ? `/services/${slug}` : `${'/search'}?q=${encodeURIComponent(q)}`;
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
