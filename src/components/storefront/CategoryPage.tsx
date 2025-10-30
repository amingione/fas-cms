'use client';

import { Fragment, useMemo, useState } from 'react';
import type { Product } from '@/lib/sanity-utils';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels
} from '@headlessui/react';
import { ArrowDownLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CategoryPreview {
  id: string;
  title: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  productCount?: number;
}

type CategoryTile = CategoryPreview & {
  gradientClass: string;
  imageUrl: string | null;
  productCount: number;
};

interface CategoryPageProps {
  products: Product[];
  categories?: CategoryPreview[];
  title?: string;
  description?: string;
  emptyStateMessage?: string;
}

const navigation = {
  categories: [
    {
      id: 'Packages',
      name: 'Packages',
      featured: [
        {
          name: 'Power Packages',
          href: '/shop/categories/power-packages',
          imageSrc: '/images/superchargers/Supercharger-custom-coated.webp',
          imageAlt: 'Custom coated supercharger by F.A.S. Motorsports.'
        },
        {
          name: 'Truck Packages',
          href: '/shop/categories/truck-packages',
          imageSrc: '/images/packages/850-ram.webp',
          imageAlt: 'F.A.S. Motorsports 850 Truck Package.'
        }
      ],
      sections: [
        {
          id: 'billet-parts',
          name: 'Billet Parts',
          items: [
            { name: 'Predator Pulley', href: '/shop/fas-predator-lower-pulley' },
            { name: 'Billet Lid', href: '/shop/fas-motorsports-billet-hellcat-supercharger-lid' },
            { name: '2.4L Billet Bearing Plate', href: '/shop/2-4l-hellcat-billet-bearing-plate' },
            { name: 'Billet Snout', href: '/shop/2-4l-hellcat-billet-supercharger-snout' }
          ]
        },
        {
          id: 'rebuild-services',
          name: 'Rebuild Services',
          items: [
            { name: 'Snout', href: '/shop/2-4l-2-7l-snout-rebuild' },
            {
              name: 'Supercharger',
              href: '/shop/categories/supercharger-rebuild'
            }
          ]
        },
        {
          id: 'superchargers',
          name: 'Superchargers',
          items: [
            {
              name: '2.7L',
              href: '/shop?filters=27l&filter=27l&priceMin=0&priceMax=100000&page=1'
            },
            {
              name: '2.4L',
              href: '/shop?filters=2.4l&filter=2.4l&priceMin=0&priceMax=100000&page=1'
            },
            {
              name: 'Rebuild',
              href: '/shop/categories/supercharger-rebuild'
            },
            {
              name: 'Porting',
              href: '/shop?priceMin=0&priceMax=100000&page=1&categorySlug=porting&category=porting&filters=supercharger%2Csupercharger-service%2Crace-ported-supercharger&filter=supercharger&filter=supercharger-service&filter=race-ported-supercharger'
            },
            {
              name: 'Components',
              href: '/shop/categories/supercharger-components'
            }
          ]
        }
      ]
    },
    {
      id: 'porting',
      name: 'Porting',
      featured: [
        {
          name: 'Snout Porting',
          href: '/shop/2-4l-2-7l-snout-porting',
          imageSrc: '/images/snouts/fas-ported-snout.webp',
          imageAlt: 'F.A.S. Motorsports ported supercharger snout.'
        },
        {
          name: 'Supercharger Porting',
          href: '/shop?categorySlug=porting&category=porting&priceMin=0&priceMax=100000&page=1',
          imageSrc: '/images/superchargers/Dominator-race-package.webp',
          imageAlt: 'F.A.S. Motorsports Supercharger Porting.'
        }
      ],
      sections: [
        {
          id: 'intake-manifolds',
          name: 'Intake Manifolds',
          items: [
            {
              name: 'Mustang GT',
              href: '/shop?categorySlug=porting&category=porting&priceMin=0&priceMax=100000&page=1&filters=intake-manifold&filter=intake-manifold'
            },
            {
              name: 'Race Ported Supercharger',
              href: '/shop?categorySlug=porting&category=porting&priceMin=0&priceMax=100000&page=1&filters=race-ported-supercharger&filter=race-ported-supercharger'
            },
            {
              name: 'Superchargers',
              href: '/shop?categorySlug=porting&category=porting&priceMin=0&priceMax=100000&page=1&filters=supercharger&filter=supercharger'
            },
            {
              name: 'Services',
              href: '/shop?categorySlug=porting&category=porting&priceMin=0&priceMax=100000&page=1&filters=services&filter=services'
            }
          ]
        }
      ]
    }
  ],
  pages: [{ name: 'All Products', href: '/shop' }]
};

const categoryImageOverrides: Record<string, string> = {
  'custom-coating': '/images/superchargers/2-7-dominator-package.webp',
  porting: '/images/snouts/fas-ported-snout.webp',
  'supercharger-rebuild': '/images/superchargers/Suupercharger-New.webp'
};

const categoryGradientPalette = [
  'from-white/20 via-white/50 to-gray-900',
  'from-white/20 via-white/50 to-gray-900',
  'from-white/20 via-white/50 to-gray-900',
  'from-white/20 via-white/50 to-gray-900',
  'from-white/20 via-white/50 to-gray-900',
  'from-white/20 via-white/50 to-gray-900'
];

type FeaturedProduct = {
  id: string;
  name: string;
  price: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
};

const fallbackFeaturedProducts: FeaturedProduct[] = [
  {
    id: 'predator-pulley',
    name: 'Predator Pulley',
    price: '$899.99',
    href: '/shop/fas-predator-lower-pulley',
    imageSrc: '/images/pulleys/FASpredator-lower-pulley.webp',
    imageAlt: 'F.A.S. Motorsports Predator Lower Pulley.'
  },
  {
    id: 'billet-supercharger-lid',
    name: 'Billet Supercharger Lid',
    price: '$1899.99',
    href: '/shop/fas-motorsports-billet-hellcat-supercharger-lid',
    imageSrc: '/images/billetParts/fas-new-billet-lid-tilt.webp',
    imageAlt: 'F.A.S. Motorsports Billet Supercharger Lid.'
  },
  {
    id: 'billet-snout',
    name: '2.4L Billet Snout',
    price: '$1899',
    href: '/shop/2-4l-hellcat-billet-supercharger-snout',
    imageSrc: '/images/snouts/FAS-Billet-Snout-Front.webp',
    imageAlt: 'F.A.S. Motorsports 2.4L Billet Snout.'
  }
];

export default function CategoryPage({
  products,
  categories = [],
  title,
  description
}: CategoryPageProps) {
  const [open, setOpen] = useState(false);

  const productCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      const productCategories = Array.isArray((product as any)?.categories)
        ? (product as any).categories
        : [];
      productCategories.forEach((cat: any) => {
        const slug = typeof cat === 'string' ? cat : cat?.slug?.current;
        if (typeof slug === 'string' && slug) {
          counts.set(slug, (counts.get(slug) ?? 0) + 1);
        }
      });
    });
    return counts;
  }, [products]);

  const categoryTiles = useMemo<CategoryTile[]>(() => {
    if (!Array.isArray(categories) || categories.length === 0) return [];

    const normalized = categories
      .filter((category): category is CategoryPreview => Boolean(category?.slug))
      .map((category, index) => {
        const slug = category.slug;
        const gradientClass = categoryGradientPalette[index % categoryGradientPalette.length];
        const imageUrl = category.imageUrl ?? categoryImageOverrides[slug] ?? null;
        const productCount = category.productCount ?? productCategoryCounts.get(slug) ?? 0;

        return {
          ...category,
          slug,
          gradientClass,
          imageUrl,
          productCount
        };
      });

    return normalized.slice(0, 6);
  }, [categories, productCategoryCounts]);

  const featuredProducts = useMemo<FeaturedProduct[]>(() => {
    if (!Array.isArray(products) || products.length === 0) {
      return fallbackFeaturedProducts;
    }

    return products.slice(0, 3).map((product, index) => {
      const fallback = fallbackFeaturedProducts[index % fallbackFeaturedProducts.length];
      const price =
        typeof product.price === 'number' && Number.isFinite(product.price)
          ? product.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
          : fallback.price;

      return {
        id: product._id ?? fallback.id,
        name: product.title ?? fallback.name,
        price,
        href: product.slug?.current ? `/shop/${product.slug.current}` : fallback.href,
        imageSrc: product.images?.[0]?.asset?.url ?? fallback.imageSrc,
        imageAlt: product.images?.[0]?.alt ?? product.title ?? fallback.imageAlt
      };
    });
  }, [products]);

  const heroTitle = title ?? 'Performance Categories';
  const heroDescription =
    description ??
    "Explore our range of high-performance parts designed to elevate your vehicle's capabilities.";

  return (
    <div className="bg-transparent font-ethno">
      {/* Mobile menu */}
      <Dialog open={open} onClose={setOpen} className="relative z-40 lg:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/25 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />
        <div className="fixed inset-0 z-40 flex">
          <DialogPanel
            transition
            className="relative flex w-full max-w-xs transform flex-col overflow-y-auto bg-black/80 backdrop-blur-sm pb-12 shadow-xl transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <div className="flex px-4 pt-5 pb-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="relative -m-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400"
              >
                <span className="absolute -inset-0.5" />
                <span className="sr-only">Close menu</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>

            {/* Links */}
            <TabGroup className="mt-2">
              <div className="border-b border-gray-200">
                <TabList className="-mb-px flex space-x-8 px-4">
                  {navigation.categories.map((category) => (
                    <Tab
                      key={category.name}
                      className="flex-1 border-b-2 border-transparent px-1 py-4 text-base font-medium whitespace-nowrap text-white data-selected:border-primary data-selected:text-primary"
                    >
                      {category.name}
                    </Tab>
                  ))}
                </TabList>
              </div>
              <TabPanels as={Fragment}>
                {navigation.categories.map((category) => (
                  <TabPanel key={category.name} className="space-y-10 px-4 pt-10 pb-8">
                    <div className="grid grid-cols-2 gap-x-4">
                      {category.featured.map((item) => (
                        <div key={item.name} className="group relative text-sm">
                          <img
                            alt={item.imageAlt}
                            src={item.imageSrc}
                            className="aspect-square w-full rounded-lg bg-transparent object-cover group-hover:opacity-75"
                          />
                          <a href={item.href} className="mt-6 block font-medium text-white">
                            <span aria-hidden="true" className="absolute inset-0 z-10" />
                            {item.name}
                          </a>
                          <p aria-hidden="true" className="mt-1">
                            Shop now
                          </p>
                        </div>
                      ))}
                    </div>
                    {category.sections.map((section) => (
                      <div key={section.name}>
                        <p
                          id={`${category.id}-${section.id}-heading-mobile`}
                          className="font-medium text-white"
                        >
                          {section.name}
                        </p>
                        <ul
                          role="list"
                          aria-labelledby={`${category.id}-${section.id}-heading-mobile`}
                          className="mt-6 flex flex-col space-y-6"
                        >
                          {section.items.map((item) => (
                            <li key={item.name} className="flow-root">
                              <a href={item.href} className="-m-2 block p-2 text-gray-200">
                                {item.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </TabPanel>
                ))}
              </TabPanels>
            </TabGroup>

            <div className="space-y-6 border-t border-gray-200 px-4 py-6">
              {navigation.pages.map((page) => (
                <div key={page.name} className="flow-root">
                  <a href={page.href} className="-m-2 block p-2 font-medium text-white">
                    {page.name}
                  </a>
                </div>
              ))}
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <header className="relative overflow-hidden pt-5 mt-5">
        {/* Top navigation */}
        <nav aria-label="Top" className="relative z-20 bg-transparent">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="relative rounded-md bg-transparent p-2 text-gray-400 lg:hidden"
              >
                <span className="absolute -inset-0.5" />
                <span className="sr-only">Open menu</span>
                <ArrowDownLeftIcon aria-hidden="true" className="size-4" />
              </button>

              {/* Logo */}
              <div className="ml-4 flex lg:ml-0">
                <a href="/">
                  <span className="sr-only">F.A.S. Motorsports</span>
                  <img alt="" src="/logo/faslogochroma.webp" className="h-8 w-auto" />
                </a>
              </div>

              {/* Flyout menus */}
              <PopoverGroup className="hidden lg:ml-8 lg:block lg:self-stretch">
                <div className="flex h-full space-x-8">
                  {navigation.categories.map((category) => (
                    <Popover key={category.name} className="flex">
                      <div className="relative flex">
                        <PopoverButton className="group relative flex items-center justify-center text-sm font-medium text-gray-700 transition-colors duration-200 ease-out hover:text-gray-800 data-open:text-primary">
                          {category.name}
                          <span
                            aria-hidden="true"
                            className="absolute inset-x-0 -bottom-px z-30 h-0.5 transition duration-200 ease-out group-data-open:bg-primaryB"
                          />
                        </PopoverButton>
                      </div>
                      <PopoverPanel
                        transition
                        className="group/popover-panel absolute inset-x-0 top-full z-20 w-full bg-black/70 backdrop-blur-sm text-sm text-gray-200 transition data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in border border-white-20 drop-shadow shadow-white/30"
                      >
                        {/* Presentational element used to render the bottom shadow, if we put the shadow on the actual panel it pokes out the top, so we use this shorter element to hide the top of the shadow */}
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 top-1/2 bg-black/80 backdrop-blur-sm shadow-sm"
                        />
                        <div className="relative bg-black/70 backdrop-blur-sm">
                          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-16">
                              <div className="col-start-2 grid grid-cols-2 gap-x-8">
                                {category.featured.map((item) => (
                                  <div
                                    key={item.name}
                                    className="group relative text-base sm:text-sm"
                                  >
                                    <img
                                      alt={item.imageAlt}
                                      src={item.imageSrc}
                                      className="fit w-full rounded-lg bg-black/40 object-cover group-hover:opacity-75"
                                    />
                                    <a
                                      href={item.href}
                                      className="mt-6 block font-medium text-white"
                                    >
                                      <span aria-hidden="true" className="absolute inset-0 z-10" />
                                      {item.name}
                                    </a>
                                    <p aria-hidden="true" className="mt-1">
                                      Shop now
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <div className="row-start-1 grid grid-cols-3 gap-x-8 gap-y-10 text-sm">
                                {category.sections.map((section) => (
                                  <div key={section.name}>
                                    <p
                                      id={`${section.name}-heading`}
                                      className="font-medium text-white"
                                    >
                                      {section.name}
                                    </p>
                                    <ul
                                      role="list"
                                      aria-labelledby={`${section.name}-heading`}
                                      className="mt-6 space-y-6 sm:mt-4 sm:space-y-4"
                                    >
                                      {section.items.map((item) => (
                                        <li key={item.name} className="flex">
                                          <a href={item.href} className=" hover:text-primary">
                                            {item.name}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Presentational element to emulate a border that sits on top of the popover */}
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 top-0 z-10 mx-auto h-px max-w-7xl px-8"
                        >
                          <div className="h-px w-full bg-transparent transition-colors duration-200 ease-out group-data-open/popover-panel:bg-black/10" />
                        </div>
                      </PopoverPanel>
                    </Popover>
                  ))}
                  {navigation.pages.map((page) => (
                    <a
                      key={page.name}
                      href={page.href}
                      className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-800"
                    >
                      {page.name}
                    </a>
                  ))}
                </div>
              </PopoverGroup>
            </div>
          </div>
        </nav>

        {/* Hero section */}
        <div className="relative pt-30 mt-10 pb-80 mb-12 sm:pt-24 sm:pb-40 lg:pt-40 lg:pb-48">
          <div className="relative mx-auto max-w-7xl px-4 sm:static sm:px-6 lg:px-8">
            <div className="sm:max-w-lg">
              <h1 className="z-20 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {heroTitle}
              </h1>
              <p className="mt-4 text-xl text-gray-200 font-mono">{heroDescription}</p>
            </div>
            <div>
              <div className="mt-10">
                {/* Decorative image grid */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none lg:absolute lg:inset-y-0 lg:mx-auto lg:w-full lg:max-w-7xl"
                >
                  <div className="absolute transform sm:top-0 sm:left-1/2 sm:translate-x-8 lg:top-1/2 lg:left-1/2 lg:translate-x-8 lg:-translate-y-1/2">
                    <div className="flex items-center space-x-6 lg:space-x-8">
                      <div className="grid shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
                        <div className="rounded-lg drop-shadow-md shadow-md shadow-white/20 h-64 w-44 overflow-hidden sm:opacity-0 lg:opacity-100">
                          <img
                            alt="F.A.S. Motorsports Drop in Filters"
                            src="/images/products/filters.webp"
                            className="size-full object-cover"
                          />
                        </div>
                        <div className="shadow-white/20 drop-shadow shadow-md h-64 w-44 overflow-hidden rounded-lg">
                          <img
                            alt="FAS Motorsports Blue TRX Supercharger"
                            src="/images/products/blue-trx.webp"
                            className="size-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="grid shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
                        <div className="shadow-white/20 drop-shadow shadow-md h-64 w-44 overflow-hidden rounded-lg">
                          <img
                            alt="FAS Motorsports Supercharger Installed"
                            src="/images/products/supercharger-installed.webp"
                            className="size-full object-cover"
                          />
                        </div>
                        <div className="h-64 w-44 overflow-hidden rounded-lg">
                          <img
                            alt="FAS Motorsports red coated supercharger"
                            src="/images/products/billetParts.webp"
                            className="size-full object-cover"
                          />
                        </div>
                        <div className="h-64 w-44 overflow-hidden rounded-lg">
                          <img
                            alt="FAS Motorsports black coated supercharger"
                            src="/images/products/supercharger-white.webp"
                            className="size-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="grid shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
                        <div className="h-64 w-44 overflow-hidden rounded-lg">
                          <img
                            alt="FAS Motorsports red coated supercharger"
                            src="/images/products/supercharger-red.webp"
                            className="size-full object-cover"
                          />
                        </div>
                        <div className="h-64 w-44 overflow-hidden rounded-lg">
                          <img
                            alt="FAS Motorsports white coated supercharger"
                            src="/images/products/customWeldedParts.webp"
                            className="size-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <a
                  href="/shop"
                  className="luxury-btn btn-glass inline-block rounded-md border border-transparent bg-primary px-8 py-3 text-center font-medium text-white hover:gray-900"
                >
                  Shop All Products ➤
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Category section */}
        <section
          aria-labelledby="category-heading"
          className="pt-5 mt-5 bg-transparent relative isolate overflow-hidden border border-rounded rounded-lg border-black/20 drop-shadow-lg shadow-white/10 shadow-inner backdrop-blur-sm px-2 py-10 after:pointer-events-none after:absolute after:inset-0 after:inset-ring after:inset-ring-white/10 sm:rounded-3xl sm:px-10 sm:py-24 after:sm:rounded-3xl lg:py-24 xl:px-24"
        >
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="sm:flex sm:items-baseline sm:justify-between">
              <h2 id="category-heading" className="text-2xl font-bold tracking-tight text-white">
                Shop by Category
              </h2>
              <a
                href="/shop/categories"
                className="hidden text-sm font-semibold text-white hover:text-primary sm:block"
              >
                Browse all categories
                <span aria-hidden="true"> &rarr;</span>
              </a>
            </div>

            {categoryTiles.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {categoryTiles.map((category) => (
                  <a
                    key={category.id || category.slug}
                    href={`/shop/categories/${category.slug}`}
                    aria-label={`Browse ${category.title}`}
                    className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-6 transition duration-300 hover:border-primary hover:shadow-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red/5"
                  >
                    {category.imageUrl ? (
                      <img
                        alt={category.title}
                        src={category.imageUrl}
                        style={{ filter: 'grayscale(80%) brightness(80%)' }}
                        className="absolute inset-0 size-full object-cover opacity-35 transition duration-500 group-hover:opacity-45"
                      />
                    ) : null}
                    <div
                      aria-hidden="true"
                      className={`absolute inset-0 bg-gradient-to-br ${category.gradientClass} opacity-85`}
                    />
                    <div className="relative flex h-full flex-col justify-end">
                      <h3 className="text-lg font-semibold text-white">
                        <span className="absolute inset-0" aria-hidden="true" />
                        {category.title}
                      </h3>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.32em] text-primary">
                        {category.productCount > 0
                          ? `${category.productCount} ${category.productCount === 1 ? 'Product' : 'Products'}`
                          : 'View builds'}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-xl border border-white/15 bg-black/40 p-10 text-center text-sm text-white/60">
                No categories loaded yet. Confirm your Sanity credentials and publish categories to
                populate this section.
              </div>
            )}

            <div className="mt-6 sm:hidden">
              <a
                href="/shop/categories"
                className="block text-sm font-semibold text-white hover:text-primary"
              >
                Browse all categories
                <span aria-hidden="true"> &rarr;</span>
              </a>
            </div>
          </div>
        </section>

        {/* Featured section */}
        <section aria-labelledby="cause-heading">
          <div className="relative bg-gray-800 px-6 py-32 sm:px-12 sm:py-40 lg:px-16">
            <div className="absolute inset-0 overflow-hidden">
              <img
                alt="hellcat charger FAS Motorsports"
                src="/images/backgrounds/charger-category.webp"
                style={{ filter: 'grayscale(60%) brightness(80%)' }}
                className="size-full object-cover"
              />
            </div>
            <div aria-hidden="true" className="absolute inset-0 bg-gray-900/50" />
            <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
              <h2
                id="cause-heading"
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
              >
                <span className="text-white/60">Precision. </span> Power.
                <span className="text-white/60"> Performance</span>
              </h2>
              <p className="mt-3 text-xl font-mono text-white">
                <span className="font-borg italic text-white">F.A.S.</span>
                <span className="font-ethno italic text-primaryB"> Motorsports</span> delivers
                high-performance billet parts, superchargers, and custom packages engineered for
                power, precision, and reliability. Explore our innovative solutions to elevate your
                build and dominate the road or track.
              </p>
              <a
                href="/shop"
                className="mt-8 block w-full rounded-md border border-transparent bg-transparent px-8 py-3 text-base font-medium text-primary hover:bg-primaryB sm:w-auto"
              >
                Shop All Products ➤➤➤
              </a>
            </div>
          </div>
        </section>

        {/* Favorites section */}
        <section aria-labelledby="favorites-heading">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="sm:flex sm:items-baseline sm:justify-between">
              <h2
                id="favorites-heading"
                className="text-2xl font-bold tracking-tight text-white/80"
              >
                Featured
              </h2>
              <a
                href="/products?sort=featured&start=0&end=12"
                className="hidden text-sm font-semibold text-white hover:text-primary sm:block"
              >
                Browse all featured
                <span aria-hidden="true"> &rarr;</span>
              </a>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-x-6">
              {featuredProducts.map((featured: FeaturedProduct) => (
                <div key={featured.id} className="group relative">
                  <img
                    alt={featured.imageAlt}
                    src={featured.imageSrc}
                    className="h-96 w-full rounded-lg object-cover group-hover:opacity-75 sm:aspect-2/3 sm:h-auto"
                  />
                  <h3 className="mt-4 text-base font-semibold text-white">
                    <a href={featured.href}>
                      <span className="absolute inset-0" />
                      {featured.name}
                    </a>
                  </h3>
                  <p className="mt-1 text-sm text-gray-300">{featured.price}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 sm:hidden">
              <a
                href="/products?sort=featured&start=0&end=12"
                className="block text-sm font-semibold text-white hover:text-primary"
              >
                Browse all featured
                <span aria-hidden="true"> &rarr;</span>
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
