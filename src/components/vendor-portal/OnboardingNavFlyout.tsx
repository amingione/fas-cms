import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel
} from '@headlessui/react';
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

type NavItem = {
  id: string;
  label: string;
  description: string;
  href: string;
};

type Props = {
  currentSection?: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    href: '/vendor-portal/onboarding',
    description: 'Overview and quick links'
  },
  {
    id: 'getting-started',
    label: 'Getting Started',
    href: '/vendor-portal/onboarding/getting-started',
    description: 'Invites, login, and profile setup'
  },
  {
    id: 'orders',
    label: 'Orders',
    href: '/vendor-portal/onboarding/orders',
    description: 'Statuses, submissions, reorders'
  },
  {
    id: 'inventory',
    label: 'Inventory',
    href: '/vendor-portal/onboarding/inventory',
    description: 'Quantities, lead times, alerts'
  },
  {
    id: 'invoicing',
    label: 'Invoicing',
    href: '/vendor-portal/onboarding/invoicing',
    description: 'Uploads, formats, payments'
  },
  {
    id: 'communication',
    label: 'Communication',
    href: '/vendor-portal/onboarding/communication',
    description: 'Messages and priorities'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/vendor-portal/onboarding/analytics',
    description: 'KPI views and exports'
  },
  {
    id: 'downloads',
    label: 'Downloads',
    href: '/vendor-portal/onboarding/downloads',
    description: 'Guides, templates, forms'
  },
  {
    id: 'faq',
    label: 'FAQ',
    href: '/vendor-portal/onboarding/faq',
    description: 'Common questions'
  },
  {
    id: 'support',
    label: 'Support',
    href: '/vendor-portal/onboarding/support',
    description: 'Contact the team'
  }
];

export default function OnboardingNavFlyout({ currentSection }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = useMemo(
    () => NAV_ITEMS.find((item) => item.id === currentSection) || NAV_ITEMS[0],
    [currentSection]
  );

  return (
    <header className="relative isolate rounded-xl border border-white/10 bg-dark/60 px-4 py-3 shadow-lg">
      <nav className="flex items-center justify-between gap-3" aria-label="Onboarding navigation">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.14em] text-white/60 font-semibold">
            Onboarding
          </span>
          <span className="text-sm text-white/80">{current?.label}</span>
        </div>

        <div className="flex items-center gap-3">
          <PopoverGroup className="hidden sm:flex sm:items-center sm:gap-2">
            <Popover className="relative">
              <PopoverButton className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:border-primary transition">
                Sections
                <ChevronDownIcon className="h-4 w-4 text-white/60" aria-hidden="true" />
              </PopoverButton>
              <PopoverPanel className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-white/10 bg-dark/90 p-3 shadow-2xl ring-1 ring-white/10">
                <div className="space-y-2">
                  {NAV_ITEMS.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      className={`block rounded-md px-3 py-2 transition ${
                        item.id === currentSection
                          ? 'bg-primary/20 text-white border border-primary/40'
                          : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-white/60">{item.description}</p>
                    </a>
                  ))}
                </div>
              </PopoverPanel>
            </Popover>
          </PopoverGroup>

          <button
            type="button"
            className="sm:hidden inline-flex items-center justify-center rounded-md border border-white/10 p-2 text-white hover:border-primary transition"
            onClick={() => setMobileOpen(true)}
            aria-label="Open onboarding menu"
          >
            <Bars3Icon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </nav>

      <Dialog open={mobileOpen} onClose={setMobileOpen} className="sm:hidden">
        <DialogBackdrop className="fixed inset-0 z-40 bg-dark/70" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw] bg-[#0c0c0c] border-l border-white/10 p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Onboarding</p>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-white/10 p-2 text-white hover:border-primary transition"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={`block rounded-md px-3 py-2 transition ${
                  item.id === currentSection
                    ? 'bg-primary/20 text-white border border-primary/40'
                    : 'text-white/80 hover:bg-white/5'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-white/60">{item.description}</p>
              </a>
            ))}
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  );
}
