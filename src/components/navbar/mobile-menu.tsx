'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState } from 'react';

import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { SearchBar } from '@components/SearchBar.tsx';

async function waitForFasAuth(timeoutMs = 8000): Promise<any | null> {
  if (typeof window === 'undefined') return null;
  if ((window as any).fasAuth) return (window as any).fasAuth;

  return await new Promise<any | null>((resolve) => {
    const started = Date.now();
    const poll = () => {
      const fas = (window as any).fasAuth;
      if (fas) {
        resolve(fas);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  });
}

export default function MobileMenu({ mode = 'standalone' }: { mode?: 'standalone' | 'inline' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string>('');

  async function resolveAuth(cancelled: () => boolean) {
    try {
      const fas = await waitForFasAuth();
      const ok = fas ? await fas.isAuthenticated() : false;
      if (cancelled()) return;
      setAuthed(ok);
      if (ok) {
        let session: any = null;
        try {
          session = fas && typeof fas.getSession === 'function' ? await fas.getSession() : null;
        } catch {}
        if (cancelled()) return;
        const user = session?.user || {};
        let name = (
          (user?.given_name as string) ||
          (user?.name as string) ||
          (user?.email as string) ||
          ''
        ).trim();
        if (!name) {
          try {
            name = (
              localStorage.getItem('customerName') ||
              localStorage.getItem('customerEmail') ||
              ''
            ).trim();
          } catch {}
        }
        if (cancelled()) return;
        setDisplayName(name);
      } else {
        setDisplayName('');
      }
    } catch {
      if (!cancelled()) {
        setAuthed(false);
        setDisplayName('');
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    resolveAuth(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    resolveAuth(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
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

  const MenuContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="flex">
        <img src="/logo/faslogochroma.png" alt="FAS Logo" className="h-8" />
      </div>
      <div className="w-64">
        <SearchBar
          action="/search"
          enableSuggestions={true}
          size="compact"
          variant="storefront"
          placeholder="Search products..."
        />
      </div>
      <ul className="flex w-full flex-col">
        {/* Top Level: Home */}
        <li className="py-2 text-xl text-white transition-colors hover:text-neutral-500 dark:text-white">
          <a href="/" onClick={onNavigate}>
            Home
          </a>
        </li>
        {/* Top Level: Shop with subcategories */}
        <li className="py-2">
          <div className="text-xl text-white dark:text-white">Shop</div>
          <ul className="mt-2 ml-4 space-y-2 text-lg">
            <li>
              <a
                href="/shop"
                onClick={onNavigate}
                className="text-white hover:text-neutral-500 dark:text-white"
              >
                All Products
              </a>
            </li>
            <li className="py-2">
              <div className="text-xl text-white dark:text-white">Billet Parts</div>
              <ul className="mt-2 ml-4 space-y-2 text-lg">
                <li>
                  <a
                    href="/specs/PredatorPulley"
                    onClick={onNavigate}
                    className="text-white hover:text-neutral-500 dark:text-white"
                  >
                    FAS Predator Pulley
                  </a>
                </li>
                <li>
                  <a
                    href="/specs/PulleyHub"
                    onClick={onNavigate}
                    className="text-white hover:text-neutral-500 dark:text-white"
                  >
                    FAS Hub &amp; Pulley
                  </a>
                </li>
                <li>
                  <a
                    href="/specs/BilletBearingPlate"
                    onClick={onNavigate}
                    className="text-white hover:text-neutral-500 dark:text-white"
                  >
                    FAS Billet Bearing Plate
                  </a>
                </li>
                <li>
                  <a
                    href="/specs/BilletSnout"
                    onClick={onNavigate}
                    className="text-white hover:text-neutral-500 dark:text-white"
                  >
                    FAS Billet Snouts
                  </a>
                </li>
              </ul>
            </li>
            {/* Wheels section */}
            <li className="py-2">
              <div className="text-xl text-white dark:text-white">Wheels</div>
              <ul className="mt-2 ml-4 space-y-2 text-lg">
                <li></li>
                <li className="pt-2 text-sm font-bold text-primary tracking-wide">BELAK</li>
                <li>
                  <a
                    href="/belak/wheels"
                    onClick={onNavigate}
                    className="text-white hover:text-neutral-500 dark:text-white"
                  >
                    Belak Overview
                  </a>
                </li>
                <li></li>
                <li className="pt-2 text-sm font-bold text-primary tracking-wide">JTX FORGED</li>
                <li>
                  <a
                    href="/jtx/wheels"
                    onClick={onNavigate}
                    className="text-white hover:text-neutral-500 dark:text-white"
                  >
                    JTX Overview
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </li>
        <li className="my-3">
          <hr className="border-neutral-200 dark:border-neutral-700" />
        </li>
        {/* Packages */}
        <li className="py-2">
          <a
            href="/packages"
            onClick={onNavigate}
            className="text-white hover:text-neutral-500 dark:text-white"
          >
            Packages
          </a>
          <ul className="mt-2 ml-4 space-y-2 text-lg">
            <li>
              <a
                href="/packages/truckPackages"
                onClick={onNavigate}
                className="text-white hover:text-neutral-500 dark:text-white"
              >
                Truck Packages
              </a>
            </li>
            <li>
              <a
                href="/packages/powerPackages"
                onClick={onNavigate}
                className="text-white hover:text-neutral-500 dark:text-white"
              >
                Power Packages
              </a>
            </li>
          </ul>
        </li>
        {/* Services */}
        <li className="py-2">
          <div className="flex items-center justify-between">
            <a
              href="/services/Services"
              onClick={onNavigate}
              className="text-xl text-white hover:text-neutral-500 dark:text-white"
            >
              All Services
            </a>
          </div>
          <ul className="mt-2 ml-4 space-y-2 text-lg">
            <li>
              <a
                href="/services/igla"
                onClick={onNavigate}
                className="text-white hover:text-neutral-500 dark:text-white"
              >
                IGLA Security
              </a>
            </li>
            <li>
              <a
                href="/services/porting"
                onClick={onNavigate}
                className="text-white hover:text-neutral-500 dark:text-white"
              >
                Porting
              </a>
            </li>
            <li>
              <a
                href="/services/customFab"
                onClick={onNavigate}
                className="text-white hover:text-neutral-500 dark:text-white"
              >
                Custom Fabrication
              </a>
            </li>
            <li>
              <a
                href="/services/coreExchange"
                onClick={onNavigate}
                className="text-white hover:text-neutral-500 dark:text-white"
              >
                Core Exchange
              </a>
            </li>
            <li>
              <a
                href="/services/welding"
                onClick={onNavigate}
                className="text-white hover:text-neutral-500 dark:text-white"
              >
                Welding
              </a>
            </li>
            <li>
              <a
                href="/schedule"
                onClick={onNavigate}
                className="text-white hover:text-neutral-500 dark:text-white"
              >
                Schedule Service
              </a>
            </li>
          </ul>
        </li>
        <li className="my-3">
          <hr className="border-neutral-200 dark:border-neutral-700" />
        </li>
        {/* Basic pages */}
        <li className="py-2 text-xl text-white transition-colors hover:text-neutral-500 dark:text-white">
          <a href="/about" onClick={onNavigate}>
            About
          </a>
        </li>
        <li className="py-2 text-xl text-white transition-colors hover:text-neutral-500 dark:text-white">
          <a href="/faq2" onClick={onNavigate}>
            FAQ
          </a>
        </li>
        <li className="py-2 text-xl text-white transition-colors hover:text-neutral-500 dark:text-white">
          <a href="/contact" onClick={onNavigate}>
            Contact
          </a>
        </li>
        {/* Account / Auth */}
        <li className="py-2">
          {authed === null ? (
            <a
              href="/account"
              onClick={onNavigate}
              className="flex items-center gap-2 text-xl text-white hover:text-neutral-500 dark:text-white"
            >
              <UserCircleIcon className="h-6 w-6" />
              <span>Account</span>
            </a>
          ) : authed === true ? (
            <div className="flex flex-col gap-2">
              <a
                href="/account"
                onClick={onNavigate}
                className="flex items-center gap-2 text-lg text-white dark:text-white hover:text-neutral-500"
              >
                <UserCircleIcon className="h-6 w-6" />
                <span>{displayName || 'My Account'}</span>
              </a>
              <div className="ml-8 flex items-center gap-4">
                <a
                  href="/dashboard"
                  onClick={onNavigate}
                  className="text-white hover:text-neutral-500 dark:text-white"
                >
                  Dashboard
                </a>
                <button
                  onClick={() => {
                    try {
                      const fas = (window as any).fasAuth;
                      if (fas?.logout) fas.logout(window.location.origin);
                      else
                        window.location.href =
                          '/api/auth/logout?returnTo=' + encodeURIComponent(window.location.origin);
                    } finally {
                      onNavigate && onNavigate();
                    }
                  }}
                  className="text-white hover:text-neutral-500 dark:text-white"
                >
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={async () => {
                try {
                  window.location.href = '/account';
                } finally {
                  onNavigate && onNavigate();
                }
              }}
              className="flex items-center gap-2 text-xl text-primary hover:text-primary/90"
            >
              <UserCircleIcon className="h-6 w-6" />
              <span>Sign in</span>
            </button>
          )}
        </li>
      </ul>
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
        className="flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 text-white transition-colors md:hidden dark:border-neutral-700 dark:text-white"
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
            <div className="fixed inset-0 bg-white/80" aria-hidden="true" />
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
            <Dialog.Panel className="fixed bottom-0 left-0 right-0 top-0 flex h-full w-full flex-col bg-white pb-6 bg-white/80">
              <div className="p-4">
                <button
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 text-white transition-colors dark:border-neutral-700 dark:text-white"
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
