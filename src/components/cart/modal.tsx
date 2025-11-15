'use client';

import { Dialog, Transition } from '@headlessui/react';
import { ShoppingCartIcon, XMarkIcon } from '@heroicons/react/24/outline';
import LoadingDots from '@components/loading-dots.tsx';
import Price from '@/components/storefront/Price';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useCart, type Cart } from './cart-context';
import { prefersDesktopCart } from '@/lib/device';
export default function CartModal() {
  const { cart, totalQuantity, subtotal, setItemQuantity, removeCartItem, redirectToCheckout } =
    useCart();
  const [isOpen, setIsOpen] = useState(false);
  const quantityRef = useRef(totalQuantity);
  const prefersDesktopRef = useRef(false);

  useEffect(() => {
    prefersDesktopRef.current = prefersDesktopCart();
  }, []);
  const closeCart = () => setIsOpen(false);

  useEffect(() => {
    if (prefersDesktopRef.current) {
      quantityRef.current = totalQuantity;
      return;
    }
    if (totalQuantity && totalQuantity !== quantityRef.current && totalQuantity > 0) {
      if (!isOpen) setIsOpen(true);
      quantityRef.current = totalQuantity;
    }
  }, [isOpen, totalQuantity]);

  useEffect(() => {
    function handleOpen(event: Event) {
      const customEvent = event as CustomEvent<{ forceMobile?: boolean }>;
      const forceMobile = Boolean(customEvent.detail?.forceMobile);
      if (!forceMobile && prefersDesktopRef.current) {
        try {
          window.dispatchEvent(new Event('open-desktop-cart'));
        } catch (error) {
          void error;
        }
        return;
      }
      setIsOpen(true);
    }
    window.addEventListener('open-cart' as any, handleOpen as EventListener);
    return () => window.removeEventListener('open-cart' as any, handleOpen as EventListener);
  }, []);

  // Notify other components when the cart drawer opens or closes
  useEffect(() => {
    try {
      window.dispatchEvent(new Event(isOpen ? 'cart:open' : 'cart:close'));
    } catch {
      /* ignore cart open/close event propagation errors */
    }
  }, [isOpen]);
  return (
    <>
      <Transition show={isOpen}>
        <Dialog onClose={closeCart} className="relative z-[110000]">
          <Transition.Child
            as={Fragment}
            enter="transition-all ease-in-out duration-300"
            enterFrom="opacity-0 backdrop-blur-none"
            enterTo="opacity-100 backdrop-blur-[.5px]"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="opacity-100 backdrop-blur-[.5px]"
            leaveTo="opacity-0 backdrop-blur-none"
          >
            <div className="fixed inset-0 bg-black/30" inert />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-500 sm:duration-700"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-500 sm:duration-700"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <div className="fixed inset-0 overflow-hidden">
              <div className="absolute inset-0 overflow-hidden">
                <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10">
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-md transform bg-black/90 text-white shadow-2xl transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700">
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between px-4 py-6 sm:px-6">
                        <Dialog.Title className="text-lg font-semibold">Shopping Cart</Dialog.Title>
                        <button
                          type="button"
                          onClick={closeCart}
                          className="relative -m-2 rounded-md p-2 text-white/60 transition hover:text-white"
                        >
                          <span className="sr-only">Close panel</span>
                          <XMarkIcon aria-hidden="true" className="size-6" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
                        {!cart || !cart.items || cart.items.length === 0 ? (
                          <div className="mt-16 flex flex-col items-center text-center">
                            <ShoppingCartIcon className="h-16 w-16 text-white/70" />
                            <p className="mt-6 text-2xl font-semibold">Your cart is empty.</p>
                            <p className="mt-2 text-sm text-white/60">
                              Add products from the storefront to see them here.
                            </p>
                            <a
                              href="/shop"
                              className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:opacity-90"
                            >
                              Browse Products
                            </a>
                          </div>
                        ) : (
                          <CartItemsList
                            cart={cart}
                            onRemove={removeCartItem}
                            onQuantityChange={setItemQuantity}
                          />
                        )}
                      </div>

                      {cart && cart.items && cart.items.length > 0 ? (
                        <CartSummary
                          subtotal={subtotal}
                          onCheckout={() => redirectToCheckout()}
                          onClose={closeCart}
                        />
                      ) : null}
                    </div>
                  </Dialog.Panel>
                </div>
              </div>
            </div>
          </Transition.Child>
        </Dialog>
      </Transition>
    </>
  );
}

const QUANTITY_CHOICES = Array.from({ length: 10 }, (_, i) => i + 1);

function normalizeOptionLabel(rawKey: string) {
  return rawKey
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) =>
      segment.length > 1
        ? segment[0].toUpperCase() + segment.slice(1).toLowerCase()
        : segment.toUpperCase()
    )
    .join(' ');
}

function normalizeOptionValue(rawValue: unknown) {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue === 'boolean') return rawValue ? 'Selected' : 'None';
  const stringy = String(rawValue).trim();
  if (!stringy) return null;
  const lower = stringy.toLowerCase();
  if (lower === 'true' || lower === 'on') return 'Selected';
  if (lower === 'false' || lower === 'off') return 'None';
  return stringy;
}

function listOptions(options?: Record<string, unknown> | null) {
  if (!options) return null;
  const entries = Object.entries(options)
    .map(([key, value]) => {
      const normalized = normalizeOptionValue(value);
      if (!normalized) return null;
      return `${normalizeOptionLabel(key)}: ${normalized}`;
    })
    .filter(Boolean) as string[];
  if (!entries.length) return null;
  return entries.join(' • ');
}

type CartItemsListProps = {
  cart: Cart;
  onQuantityChange: (id: string, quantity: number) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
};

function CartItemsList({ cart, onQuantityChange, onRemove }: CartItemsListProps) {
  const [pendingQuantity, setPendingQuantity] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  const items = [...(cart.items || [])].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''))
  );

  const handleQuantityChange = async (itemId: string | undefined, value: string) => {
    if (!itemId) return;
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity < 1) return;
    try {
      setPendingQuantity(itemId);
      await onQuantityChange(itemId, quantity);
    } finally {
      setPendingQuantity((prev) => (prev === itemId ? null : prev));
    }
  };

  const handleRemove = async (itemId: string | undefined) => {
    if (!itemId) return;
    try {
      setPendingRemove(itemId);
      await onRemove(itemId);
    } finally {
      setPendingRemove((prev) => (prev === itemId ? null : prev));
    }
  };

  return (
    <div className="mt-6">
      <div className="flow-root">
        <ul role="list" className="-my-6 divide-y divide-white/10">
          {items.map((item) => {
            const lineTotal = (item.price || 0) * (item.quantity || 0);
            const optionsSummary = listOptions(item.options as Record<string, unknown>);
            const normalizedClass = (item.shippingClass || '')
              .toString()
              .toLowerCase()
              .replace(/[^a-z]/g, '');
            const isInstallOnly = item.installOnly || normalizedClass.includes('installonly');
            const productHref = (() => {
              const raw = item.productUrl;
              if (!raw) return undefined;
              if (typeof raw !== 'string') return undefined;
              if (raw.startsWith('http')) return raw;
              if (raw.startsWith('/')) return raw;
              return `/shop/${raw}`;
            })();
            const quantities = QUANTITY_CHOICES.includes(item.quantity || 1)
              ? QUANTITY_CHOICES
              : [...QUANTITY_CHOICES, item.quantity || QUANTITY_CHOICES[0]];

            return (
              <li key={item.id || item.name} className="flex py-6">
                <div className="size-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                  {productHref ? (
                    <a href={productHref} className="block size-full">
                      <img
                        src={item.image || '/logo/faslogo150.webp'}
                        alt={item.name || 'Cart item'}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <img
                      src={item.image || '/logo/faslogo150.webp'}
                      alt={item.name || 'Cart item'}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>

                <div className="ml-4 flex flex-1 flex-col">
                  <div>
                    <div className="flex justify-between text-base font-semibold text-white">
                      {productHref ? (
                        <a href={productHref} className="hover:text-primary">
                          {item.name || 'Product'}
                        </a>
                      ) : (
                        <p>{item.name || 'Product'}</p>
                      )}
                      <Price
                        amount={lineTotal}
                        className="ml-4 text-right text-base font-semibold text-white"
                      />
                    </div>
                    {optionsSummary && (
                      <p className="mt-1 text-sm text-white/60">{optionsSummary}</p>
                    )}
                    {isInstallOnly && (
                      <p className="mt-2 text-xs uppercase tracking-wide text-amber-200">
                        Install-only service
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-1 items-end justify-between text-sm text-white/60">
                    <div className="flex items-center gap-2">
                      <label htmlFor={`quantity-${item.id}`} className="sr-only">
                        Quantity
                      </label>
                      <select
                        id={`quantity-${item.id}`}
                        value={item.quantity || 1}
                        onChange={(event) => void handleQuantityChange(item.id, event.target.value)}
                        disabled={pendingRemove === item.id || pendingQuantity === item.id}
                        className="rounded-md border border-white/20 bg-black/60 px-3 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {quantities.map((qty) => (
                          <option key={qty} value={qty}>
                            Qty {qty}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemove(item.id)}
                      disabled={pendingRemove === item.id}
                      className="font-semibold text-primary transition hover:text-primary/80 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type CartSummaryProps = {
  subtotal: number;
  onCheckout: () => Promise<void | string>;
  onClose: () => void;
};

function CartSummary({ subtotal, onCheckout, onClose }: CartSummaryProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onCheckout();
      if (typeof result === 'string' && result) {
        setError(result);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-white/10 px-4 py-6 text-sm text-white/70 sm:px-6">
      <div className="flex justify-between text-base font-semibold text-white">
        <p>Subtotal</p>
        <Price amount={subtotal} />
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className="flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold uppercase tracking-wide text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <LoadingDots className="bg-black" /> : 'Checkout with Stripe'}
        </button>
      </div>
      {error && <p className="mt-3 text-center text-xs text-red-300">{error}</p>}
      <div className="mt-6 flex justify-center text-center text-xs text-white/60">
        <p>
          or{' '}
          <button
            type="button"
            onClick={onClose}
            className="font-semibold text-primary transition hover:text-primary/80"
          >
            Continue shopping<span aria-hidden="true"> &rarr;</span>
          </button>
        </p>
      </div>
    </div>
  );
}
