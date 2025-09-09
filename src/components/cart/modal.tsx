'use client';

import clsx from 'clsx';
import { Dialog, Transition } from '@headlessui/react';
import { ShoppingCartIcon, XMarkIcon } from '@heroicons/react/24/outline';
import LoadingDots from '@components/loading-dots.tsx';
import Price from '@/components/storefront/Price';
import { Fragment, useEffect, useRef, useState } from 'react';
import { redirectToCheckout } from './actions';
import { useCart } from './cart-context';
import { DeleteItemButton } from './delete-item-button';
import { EditItemQuantityButton } from './edit-item-quantity-button';

export default function CartModal() {
  const { cart, totalQuantity, subtotal } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const quantityRef = useRef(totalQuantity);
  const closeCart = () => setIsOpen(false);

  useEffect(() => {
    if (totalQuantity && totalQuantity !== quantityRef.current && totalQuantity > 0) {
      if (!isOpen) setIsOpen(true);
      quantityRef.current = totalQuantity;
    }
  }, [isOpen, totalQuantity]);

  useEffect(() => {
    function handleOpen() {
      setIsOpen(true);
    }
    window.addEventListener('open-cart' as any, handleOpen);
    return () => window.removeEventListener('open-cart' as any, handleOpen);
  }, []);

  // Notify other components when the cart drawer opens or closes
  useEffect(() => {
    try {
      window.dispatchEvent(new Event(isOpen ? 'cart:open' : 'cart:close'));
    } catch {}
  }, [isOpen]);

  return (
    <>
      <Transition show={isOpen}>
        <Dialog onClose={closeCart} className="relative z-50">
          <Transition.Child
            as={Fragment}
            enter="transition-all ease-in-out duration-300"
            enterFrom="opacity-0 backdrop-blur-none"
            enterTo="opacity-100 backdrop-blur-[.5px]"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="opacity-100 backdrop-blur-[.5px]"
            leaveTo="opacity-0 backdrop-blur-none"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="transition-all ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="fixed bottom-0 right-0 top-0 flex h-full w-full flex-col overflow-y-auto border-l border-neutral-200 bg-white/80 p-6 text-black backdrop-blur-xl md:w-[390px] dark:border-neutral-700 dark:bg-black/80 dark:text-white">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">My Cart</p>
                <button aria-label="Close cart" onClick={closeCart}>
                  <CloseCart />
                </button>
              </div>

              {!cart || !cart.items || cart.items.length === 0 ? (
                <div className="mt-20 flex w-full flex-col items-center justify-center overflow-hidden">
                  <ShoppingCartIcon className="h-16 bg-transparent" />
                  <p className="mt-6 text-center text-2xl font-bold">Your cart is empty.</p>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-between overflow-hidden p-1">
                  <ul className="grow overflow-auto py-4">
                    {cart.items
                      .slice()
                      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
                      .map((item, i) => (
                        <li
                          key={item.id || i}
                          className="flex w-full flex-col border-b border-neutral-300 dark:border-neutral-700"
                        >
                          <div className="relative flex w-full flex-row justify-between px-1 py-4">
                            <div className="hover:bg-white/20 absolute z-40 rounded-full bg-black/40 border border-white/10 -ml-1 -mt-5">
                              <DeleteItemButton id={item.id} />
                            </div>
                            <div className="relative flex-row">
                              <div className="ml-3 relative object-contain w-12 h-12 flex aspect-square overflow-hidden border border-neutral-300 bg-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name || 'Product image'}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-neutral-800" />
                                )}
                              </div>
                              <div className="z-30 ml-2 flex flex-row space-x-4">
                                <div className="flex flex-1 flex-col text-base">
                                  <span className="leading-tight">{item.name || 'Product'}</span>
                                  {item.options && Object.keys(item.options).length > 0 && (
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                      {Object.entries(item.options)
                                        .map(([k, v]) => `${k}: ${v}`)
                                        .join(' • ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex h-16 flex-col justify-between">
                              <Price
                                className="flex justify-end space-y-2 text-right text-sm"
                                amount={(item.price || 0) * (item.quantity || 0)}
                              />
                              <div className="ml-auto flex h-9 flex-row items-center gap-1 rounded-full border border-neutral-200 dark:border-neutral-700 px-1">
                                <EditItemQuantityButton item={item} type="minus" />
                                <p className="w-5 h-4 flex items-center justify-center">
                                  <span className="text-sm leading-none">{item.quantity}</span>
                                </p>
                                <EditItemQuantityButton item={item} type="plus" />
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                  <div className="py-4 text-sm text-neutral-500 dark:text-neutral-400">
                    <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-1 dark:border-neutral-700">
                      <p>Subtotal</p>
                      <Price
                        className="text-right text-base text-black dark:text-white"
                        amount={subtotal}
                      />
                    </div>
                    <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-1 pt-1 dark:border-neutral-700">
                      <p>Shipping</p>
                      <p className="text-right">Calculated at checkout</p>
                    </div>
                  </div>
                  <CheckoutButton />
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </Dialog>
      </Transition>
    </>
  );
}

function CloseCart({ className }: { className?: string }) {
  return (
    <div className="relative hover:text-primary flex h-10 w-10 items-center justify-center rounded-lg text-black transition-colors dark:text-white">
      <XMarkIcon className={clsx('h-5 transition-all ease-in-out hover:scale-110', className)} />
    </div>
  );
}

function CheckoutButton() {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      await redirectToCheckout();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="w-full btn-glass rounded-full bg-primary p-3 text-center text-sm font-medium text-black opacity-90 hover:opacity-100 disabled:opacity-60"
      type="button"
      disabled={loading}
      onClick={onClick}
    >
      {loading ? <LoadingDots className="bg-white" /> : 'Proceed to Checkout'}
    </button>
  );
}
