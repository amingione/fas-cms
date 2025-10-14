'use client';

import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';

const products = [
  {
    id: 1,
    name: 'Throwback Hip Bag',
    href: '#',
    color: 'Salmon',
    imageSrc:
      'https://tailwindcss.com/plus-assets/img/ecommerce-images/shopping-cart-page-04-product-01.jpg',
    imageAlt:
      'Salmon orange fabric pouch with match zipper, gray zipper pull, and adjustable hip belt.'
  },
  {
    id: 2,
    name: 'Medium Stuff Satchel',
    href: '#',
    color: 'Blue',
    imageSrc:
      'https://tailwindcss.com/plus-assets/img/ecommerce-images/shopping-cart-page-04-product-02.jpg',
    imageAlt:
      'Front of satchel with blue canvas body, black straps and handle, drawstring top, and front zipper pouch.'
  },
  {
    id: 3,
    name: 'Zip Tote Basket',
    href: '#',
    color: 'White and black',
    imageSrc:
      'https://tailwindcss.com/plus-assets/img/ecommerce-images/shopping-cart-page-04-product-03.jpg',
    imageAlt:
      'Front of zip tote bag with white canvas, black canvas straps and handle, and black zipper pulls.'
  }
];

export default function DesktopCart() {
  return (
    <section className="relative bg-transparent">
      <div className="relative border-b px-4 pb-14 sm:static sm:px-0 sm:pb-0">
        <div className="flex h-16 items-center justify-between">
          {/* Cart */}
          <Popover className="ml-4 flow-root text-sm lg:relative lg:ml-8">
            <PopoverButton className="group -m-2 flex items-center p-2">
              <ShoppingBagIcon
                aria-hidden="true"
                className="size-6 shrink-0 text-white group-hover:text-white/80"
              />
              <span className="ml-2 text-sm font-medium text-white group-hover:text-white/80">
                0
              </span>
              <span className="sr-only">items in cart, view bag</span>
            </PopoverButton>
            <PopoverPanel
              transition
              className="absolute top-16 right-0 z-1001 mt-px w-full bg-white/10 bg-blur-md pb-6 shadow-lg transition data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in sm:px-2 lg:top-full lg:mt-3 lg:-mr-1.5 lg:w-80 lg:rounded-lg lg:ring-1 lg:ring-black"
            >
              <h2 className="sr-only">Shopping Cart</h2>

              <form className="mx-auto max-w-2xl px-4 border-white/40">
                <ul role="list" className="divide-y divide-gray-200">
                  {products.map((product) => (
                    <li key={product.id} className="flex items-center py-6">
                      <img
                        alt={product.imageAlt}
                        src={product.imageSrc}
                        className="size-16 flex-none rounded-md border border-gray-200"
                      />
                      <div className="ml-4 flex-auto">
                        <h3 className="font-medium text-white">
                          <a href={product.href}>{product.name}</a>
                        </h3>
                        <p className="text-white/80">{product.color}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <button
                  type="submit"
                  className="w-full rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-red focus:ring-2 focus:ring-red focus:ring-offset-2 focus:ring-offset-gray-50 focus:outline-hidden"
                >
                  Checkout
                </button>

                <p className="mt-6 text-center">
                  <a href="#" className="text-sm font-medium text-accent hover:text-white/80">
                    View Shopping Bag
                  </a>
                </p>
              </form>
            </PopoverPanel>
          </Popover>
        </div>
      </div>
    </section>
  );
}
