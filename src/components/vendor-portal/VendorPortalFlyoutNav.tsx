import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import {
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  DocumentTextIcon,
  HomeIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

type NavItem = { name: string; href: string; icon: typeof HomeIcon };

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/vendor-portal', icon: HomeIcon },
  { name: 'Wholesale Catalog', href: '/vendor-portal/catalog', icon: Squares2X2Icon },
  { name: 'Cart', href: '/vendor-portal/cart', icon: ShoppingBagIcon },
  { name: 'Orders', href: '/vendor-portal/orders', icon: DocumentTextIcon },
  { name: 'Messages', href: '/vendor-portal/messages', icon: ChatBubbleLeftRightIcon },
  { name: 'Account', href: '/vendor-portal/account', icon: CogIcon }
];

const ctas = [{ name: 'Return to Website →', href: '/' }];

const CartBadge = ({ className = '' }: { className?: string }) => (
  <span
    data-cart-count
    className={`pointer-events-none absolute -top-2 -right-2 hidden h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white ring-1 ring-black/70 shadow-white/10 shadow-box-outter ${className}`}
  />
);

const MessageBadge = ({ className = '' }: { className?: string }) => (
  <span
    data-message-unread
    className={`pointer-events-none absolute -top-2 -right-2 hidden h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-1 ring-black/70 shadow-white/10 shadow-box-outter ${className}`}
  />
);

const NavLink = ({ item }: { item: NavItem }) => {
  const isCart = item.href === '/vendor-portal/cart';
  const isMessages = item.href === '/vendor-portal/messages';
  return (
    <a
      key={item.name}
      href={item.href}
      className={`relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:text-primary ${
        isCart || isMessages ? 'pr-8' : ''
      }`}
    >
      <item.icon className="h-4 w-4 text-white/70" />
      {item.name}
      {isCart && <CartBadge />}
      {isMessages && <MessageBadge />}
    </a>
  );
};

export default function VendorPortalFlyoutNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky mt-7 top-4 z-40 rounded-full border border-primary/10 bg-[#121212] shadow-box-outter shadow-inner shadow-white/10">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-6">
        <a href="/vendor-portal" className="inline-flex items-center gap-2">
          <img src="/logo/faslogo150.webp" alt="FAS Motorsports" className="h-8 w-auto" />
          <span className="sr-only">FAS Motorsports Vendor Portal</span>
        </a>

        <div className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {ctas.map((cta) => (
            <a
              key={cta.name}
              href={cta.href}
              className="text-sm font-semibold text-white hover:text-primary transition"
            >
              {cta.name}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-md p-2 text-white hover:text-primary transition"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <Dialog open={mobileOpen} onClose={setMobileOpen} className="lg:hidden">
        <DialogBackdrop className="fixed inset-0 z-40 bg-dark/80" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw] bg-[#121212] p-4 border-l border-white/10">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Menu</p>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center p-2 text-white hover:text-primary transition"
              aria-label="Close menu"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2">
            {navItems.map((item) => {
              const isCart = item.href === '/vendor-portal/cart';
              const isMessages = item.href === '/vendor-portal/messages';
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`relative flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm font-semibold text-white hover:border-primary/60 ${
                    isCart || isMessages ? 'pr-8' : ''
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  <item.icon className="h-5 w-5 text-white/70" />
                  {item.name}
                  {isCart && <CartBadge />}
                  {isMessages && <MessageBadge />}
                </a>
              );
            })}
          </div>

          <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
            {ctas.map((cta) => (
              <a
                key={cta.name}
                href={cta.href}
                className="block rounded-lg bg-primary/20 px-3 py-2 text-sm font-semibold text-white hover:bg-primary/30"
                onClick={() => setMobileOpen(false)}
              >
                {cta.name}
              </a>
            ))}
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  );
}
