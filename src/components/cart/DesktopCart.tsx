'use client';

import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { CartProvider, useCart } from '@components/cart/cart-context';
import { prefersDesktopCart } from '@/lib/device';
import { useEffect, useRef, useState } from 'react';
import { formatOptionSummary } from '@/lib/cart/format-option-summary';

const FALLBACK_IMAGE = '/logo/faslogo150.webp';

function CartSummaryPopover({
  onRegisterTrigger,
  onRegisterPanel
}: {
  onRegisterTrigger?: (ref: HTMLButtonElement | null) => void;
  onRegisterPanel?: (ref: HTMLDivElement | null) => void;
}) {
  const { cart, totalQuantity, subtotal } = useCart();
  const [pinned, setPinned] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const items = cart?.items ?? [];
  const hasItems = items.length > 0;
  const [panelOpen, setPanelOpen] = useState(false);

  const openShippingStep = () => {
    if (typeof window === 'undefined') return;
    const eventName = prefersDesktopCart() ? 'open-desktop-cart' : 'open-cart-shipping';
    window.dispatchEvent(new Event(eventName));
  };

  const openCartDrawer = () => {
    if (typeof window === 'undefined') return;
    const eventName = prefersDesktopCart() ? 'open-desktop-cart' : 'open-cart';
    window.dispatchEvent(new Event(eventName));
  };

  useEffect(() => {
    const handleDesktopOpen = () => {
      if (!prefersDesktopCart()) return;
      const isOpen = panelRef.current?.getAttribute('data-headlessui-state') === 'open';
      if (!isOpen) {
        buttonRef.current?.click();
      }
      setPinned(true);
    };
    window.addEventListener('open-desktop-cart', handleDesktopOpen);
    return () => window.removeEventListener('open-desktop-cart', handleDesktopOpen);
  }, []);

  return (
    <Popover className="relative z-40">
      <PopoverButton
        ref={(node) => {
          buttonRef.current = node;
          onRegisterTrigger?.(node);
        }}
        onClick={() => setPanelOpen(true)}
        className="group relative -m-2 flex h-11 w-11 items-center justify-center rounded-full p-2 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ShoppingBagIcon
          aria-hidden="true"
          className="size-6 shrink-0 transition group-hover:scale-105 group-hover:text-accent"
        />
        {totalQuantity > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-black">
            {totalQuantity}
          </span>
        )}
        <span className="sr-only">Open cart</span>
      </PopoverButton>
      <PopoverPanel
        ref={(node) => {
          panelRef.current = node as HTMLDivElement | null;
          onRegisterPanel?.(node as HTMLDivElement | null);
        }}
        transition
        className={`absolute right-0 top-12 z-40 mt-2 w-80 max-w-xs rounded-3xl border border-white/10 bg-[#1a1a1a] p-4 text-white shadow-2xl backdrop-blur-xl transition data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in ${
          pinned ? 'opacity-100 pointer-events-auto' : ''
        }`}
        onMouseEnter={() => setPinned(true)}
        onMouseLeave={() => setPinned(false)}
        data-open={panelOpen ? 'true' : 'false'}
      >
        <button
          type="button"
          onClick={() => {
            setPanelOpen(false);
            setPinned(false);
            buttonRef.current?.click();
          }}
          aria-label="Close cart"
          className="absolute right-2 top-2 text-white/60 transition hover:text-red-400"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>

        <h2 className="sr-only z-[99999]">Cart preview</h2>

        {!hasItems ? (
          <div className="space-y-3 text-sm text-white/70">
            <p>Your cart is empty.</p>
            <button
              type="button"
              onClick={() => (window.location.href = '/shop')}
              className="w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black hover:opacity-90"
            >
              Shop Products
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl px-4 py-4">
            <ul
              role="list"
              className="max-h-72 overflow-auto pr-1 divide-y divide-white/15 [&>li]:py-6 [&>li:first-child]:pt-4 [&>li:last-child]:pb-4"
            >
              {items.map((item) => {
                const optionsSummary = formatOptionSummary({
                  options: item.options as Record<string, unknown>,
                  selections: (item as any).selections,
                  selectedOptions: item.selectedOptions,
                  selectedUpgrades: item.selectedUpgrades,
                  upgrades: (item as any).upgrades
                });
                const displayName = item.name || 'Product';
                const normalizedClass = (item.shippingClass || '')
                  .toString()
                  .toLowerCase()
                  .replace(/[^a-z]/g, '');
                const isInstallOnly = item.installOnly || normalizedClass.includes('installonly');
                return (
                  <li key={item.id} className="flex gap-3 py-3">
                    <img
                      src={item.image || FALLBACK_IMAGE}
                      alt={item.name || 'Cart item'}
                      className="h-16 w-16 rounded-xl object-cover"
                      loading="lazy"
                    />
                    <div className="flex flex-1 flex-col text-xs">
                      <span className="text-sm font-semibold text-white">
                        {displayName}
                      </span>
                      {optionsSummary && (
                        <span className="mt-1 text-white/60">{optionsSummary}</span>
                      )}
                      <div className="mt-2 flex items-center justify-between text-white/70">
                        <span>Qty {item.quantity || 1}</span>
                      </div>
                      {isInstallOnly && (
                        <span className="mt-2 inline-flex w-fit rounded-full bg-amber-500/20 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-200">
                          Install-only
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col gap-2 text-xs uppercase tracking-wide">
              <a
                href="/cart"
                className="btn-glass px-4 py-2 text-center font-semibold text-accent transition hover:bg-accent/10"
              >
                Go To Cart
              </a>
            </div>
          </div>
        )}
      </PopoverPanel>
    </Popover>
  );
}

export default function DesktopCart() {
  const panelRefGlobal = useRef<HTMLDivElement | null>(null);
  const triggerRefGlobal = useRef<HTMLButtonElement | null>(null);

  return (
    <CartProvider>
      <section className="relative bg-transparent">
        <div
          className="relative px-4 sm:px-0"
          onClick={(event) => {
            const panel = panelRefGlobal.current;
            const trigger = triggerRefGlobal.current;
            if (!panel) return;
            const isOpen = panel.getAttribute('data-open') === 'true';
            if (!isOpen) return;
            const target = event.target as Node | null;
            if (target && (panel.contains(target) || (trigger && trigger.contains(target)))) {
              return;
            }
            panel.querySelector<HTMLButtonElement>('button[aria-label="Close cart"]')?.click();
          }}
        >
          <div className="flex h-16 items-center justify-end">
            <CartSummaryPopover
              onRegisterTrigger={(ref) => {
                triggerRefGlobal.current = ref;
              }}
              onRegisterPanel={(ref) => {
                panelRefGlobal.current = ref;
              }}
            />
          </div>
        </div>
      </section>
    </CartProvider>
  );
}
