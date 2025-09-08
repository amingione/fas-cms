'use client';

import { Dialog, Transition } from '@headlessui/react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';

import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { getAuth0Client } from '@/lib/auth';
import type { Auth0Client } from '@auth0/auth0-spa-js';
import { SearchBar } from '@components/SearchBar.tsx';

export default function MobileMenu({ mode = 'standalone' }: { mode?: 'standalone' | 'inline' }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [auth0, setAuth0] = useState<Auth0Client | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const client = await getAuth0Client();
        if (!mounted) return;
        setAuth0(client);
        const ok = await client.isAuthenticated();
        if (!mounted) return;
        setAuthed(ok);
        if (ok) {
          const u: any = await client.getUser();
          const name = u?.given_name || u?.name || u?.email || '';
          setDisplayName(name);
        }
      } catch {
        if (mounted) setAuthed(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const openMobileMenu = () => setIsOpen(true);
  const closeMobileMenu = () => setIsOpen(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname, searchParams]);

  const MenuContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="flex">
        <img src="/images/faslogochroma.png" alt="FAS Logo" className="h-8" />
      </div>
      <div className="mb-4 w-full">
        <SearchBar
          value={search}
          onChange={setSearch}
          action="/search"
          variant="storefront"
          size="compact"
          enableSuggestions={true}
          portal={true}
          placeholder="Search"
        />
        <ul className="flex w-full flex-col">
          {/* Top Level: Home */}
          <li className="py-2 text-xl text-black transition-colors hover:text-neutral-500 dark:text-white">
            <Link href="/" prefetch={true} onClick={onNavigate}>
              Home
            </Link>
          </li>
          {/* Top Level: Shop with subcategories */}
          <li className="py-2">
            <div className="text-xl text-black dark:text-white">Shop</div>
            <ul className="mt-2 ml-4 space-y-2 text-lg">
              <li>
                <Link
                  href="/shop"
                  prefetch={true}
                  onClick={onNavigate}
                  className="text-black hover:text-neutral-500 dark:text-white"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/PredatorPulleySpecsSheet"
                  prefetch={true}
                  onClick={onNavigate}
                  className="text-black hover:text-neutral-500 dark:text-white"
                >
                  FAS Predator Pulley
                </Link>
              </li>
              <li>
                <Link
                  href="/HellcatPulleyHubSpecSheet"
                  prefetch={true}
                  onClick={onNavigate}
                  className="text-black hover:text-neutral-500 dark:text-white"
                >
                  FAS Hub &amp; Pulley
                </Link>
              </li>
              <li>
                <Link
                  href="/BilletBearingPlateSpecs"
                  prefetch={true}
                  onClick={onNavigate}
                  className="text-black hover:text-neutral-500 dark:text-white"
                >
                  FAS Billet Bearing Plate
                </Link>
              </li>
              <li>
                <Link
                  href="/specs/billet-snouts"
                  prefetch={true}
                  onClick={onNavigate}
                  className="text-black hover:text-neutral-500 dark:text-white"
                >
                  FAS Billet Snouts
                </Link>
              </li>
            </ul>
          </li>
          <li className="my-3">
            <hr className="border-neutral-200 dark:border-neutral-700" />
          </li>
          {/* Packages */}
          <li className="py-2">
            <div className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Packages
            </div>
            <ul className="mt-2 ml-4 space-y-2 text-lg">
              <li>
                <Link
                  href="/packages/truckPackages"
                  prefetch={true}
                  onClick={onNavigate}
                  className="text-black hover:text-neutral-500 dark:text-white"
                >
                  Truck Packages
                </Link>
              </li>
              <li>
                <Link
                  href="/packages/power-packages"
                  prefetch={true}
                  onClick={onNavigate}
                  className="text-black hover:text-neutral-500 dark:text-white"
                >
                  Power Packages
                </Link>
              </li>
            </ul>
          </li>
          {/* Services */}
          <li className="py-2">
            <div className="flex items-center justify-between">
              <Link
                href="/services/AllServices"
                prefetch={true}
                onClick={onNavigate}
                className="text-xl text-black hover:text-neutral-500 dark:text-white"
              >
                All Services
              </Link>
            </div>
            <ul className="mt-2 ml-4 space-y-2 text-lg">
              <li>
                <Link
                  href="/services/igla"
                  prefetch={true}
                  onClick={onNavigate}
                  className="text-black hover:text-neutral-500 dark:text-white"
                >
                  IGLA Security
                </Link>
              </li>
              <li>
                <Link
                  href="/services/porting"
                  prefetch={true}
                  onClick={onNavigate}
                  className="text-black hover:text-neutral-500 dark:text-white"
                >
                  Porting
                </Link>
              </li>
              <li>
                <Link
                  href="/services/customFab"
                  prefetch={true}
                  onClick={onNavigate}
                  className="text-black hover:text-neutral-500 dark:text-white"
                >
                  Custom Fabrication
                </Link>
              </li>
              <li>
                <Link
                  href="/services/coreExchange"
                  prefetch={true}
                  onClick={onNavigate}
                  className="text-black hover:text-neutral-500 dark:text-white"
                >
                  Core Exchange
                </Link>
              </li>
              <li>
                <Link
                  href="/schedule"
                  prefetch={true}
                  onClick={onNavigate}
                  className="text-black hover:text-neutral-500 dark:text-white"
                >
                  Schedule Service
                </Link>
              </li>
            </ul>
          </li>
          <li className="my-3">
            <hr className="border-neutral-200 dark:border-neutral-700" />
          </li>
          {/* Build Your Package */}
          <li className="py-2">
            <Link
              href="/customBuild"
              prefetch={true}
              onClick={onNavigate}
              className="text-xl text-primary hover:text-primary/90"
            >
              Build Your Package →
            </Link>
          </li>
          {/* Basic pages */}
          <li className="py-2 text-xl text-black transition-colors hover:text-neutral-500 dark:text-white">
            <Link href="/about" prefetch={true} onClick={onNavigate}>
              About
            </Link>
          </li>
          <li className="py-2 text-xl text-black transition-colors hover:text-neutral-500 dark:text-white">
            <Link href="/faq" prefetch={true} onClick={onNavigate}>
              FAQ
            </Link>
          </li>
          <li className="py-2 text-xl text-black transition-colors hover:text-neutral-500 dark:text-white">
            <Link href="/contact" prefetch={true} onClick={onNavigate}>
              Contact
            </Link>
          </li>
          {/* Account / Auth */}
          <li className="py-2">
            {authed === null ? (
              <Link
                href="/account"
                prefetch={true}
                onClick={onNavigate}
                className="flex items-center gap-2 text-xl text-black hover:text-neutral-500 dark:text-white"
              >
                <UserCircleIcon className="h-6 w-6" />
                <span>Account</span>
              </Link>
            ) : authed ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-lg text-black dark:text-white">
                  <UserCircleIcon className="h-6 w-6" />
                  <span>{displayName || 'My Account'}</span>
                </div>
                <div className="ml-8 flex items-center gap-4">
                  <Link
                    href="/dashboard"
                    prefetch={true}
                    onClick={onNavigate}
                    className="text-black hover:text-neutral-500 dark:text-white"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      auth0?.logout?.({ logoutParams: { returnTo: window.location.origin } });
                      onNavigate && onNavigate();
                    }}
                    className="text-black hover:text-neutral-500 dark:text-white"
                  >
                    Log out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  auth0?.loginWithRedirect?.();
                  onNavigate && onNavigate();
                }}
                className="flex items-center gap-2 text-xl text-primary hover:text-primary/90"
              >
                <UserCircleIcon className="h-6 w-6" />
                <span>Sign in</span>
              </button>
            )}
          </li>
        </ul>
      </div>
    </>
  );

  if (mode === 'inline') {
    return <MenuContent onNavigate={undefined} />;
  }

  return (
    <>
      <button
        onClick={openMobileMenu}
        aria-label="Open mobile menu"
        className="flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 text-black transition-colors md:hidden dark:border-neutral-700 dark:text-white"
      >
        <Bars3Icon className="h-4" />
      </button>
      <Transition show={isOpen}>
        <Dialog onClose={closeMobileMenu} className="relative z-50">
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
            enterFrom="translate-x-[-100%]"
            enterTo="translate-x-0"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-[-100%]"
          >
            <Dialog.Panel className="fixed bottom-0 left-0 right-0 top-0 flex h-full w-full flex-col bg-white pb-6 dark:bg-black">
              <div className="p-4">
                <button
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 text-black transition-colors dark:border-neutral-700 dark:text-white"
                  onClick={closeMobileMenu}
                  aria-label="Close mobile menu"
                >
                  <XMarkIcon className="h-6" />
                </button>
                <MenuContent onNavigate={closeMobileMenu} />
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </Dialog>
      </Transition>
    </>
  );
}
