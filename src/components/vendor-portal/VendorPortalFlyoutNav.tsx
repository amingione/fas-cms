import { useState } from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel
} from '@headlessui/react';
import {
  AcademicCapIcon,
  Bars3Icon,
  BellIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  CubeIcon,
  DocumentTextIcon,
  FolderIcon,
  HomeIcon,
  ShoppingBagIcon,
  TagIcon,
  NewspaperIcon,
  CreditCardIcon,
  Squares2X2Icon,
  PlayCircleIcon,
  PhoneIcon,
  RectangleGroupIcon,
  XMarkIcon,
  CogIcon
} from '@heroicons/react/24/outline';

type NavLink = {
  name: string;
  href?: string;
  icon?: typeof HomeIcon;
  description?: string;
  subitems?: { name: string; href: string }[];
};

type NavGroup = { name: string; items: NavLink[] };

const navigation: Record<string, NavGroup> = {
  ordersInventory: {
    name: 'Orders & Inventory',
    items: [
      {
        name: 'Dashboard',
        href: '/vendor-portal',
        icon: HomeIcon,
        description: 'Overview and quick stats'
      },
      {
        name: 'Orders',
        icon: ShoppingBagIcon,
        description: 'Manage and submit orders',
        subitems: [
          { name: 'View All Orders', href: '/vendor-portal/orders' },
          { name: 'Submit New Order', href: '/vendor-portal/orders/new' },
          { name: 'Order Templates', href: '/vendor-portal/orders/templates' }
        ]
      },
      {
        name: 'Inventory',
        href: '/vendor-portal/inventory',
        icon: CubeIcon,
        description: 'Manage product availability and lead times'
      },
      {
        name: 'Products',
        href: '/vendor-portal/products',
        icon: TagIcon,
        description: 'Your product catalog'
      }
    ]
  },
  financials: {
    name: 'Financials',
    items: [
      {
        name: 'Invoices',
        icon: DocumentTextIcon,
        description: 'View and upload invoices',
        subitems: [
          { name: 'View Invoices', href: '/vendor-portal/invoices' },
          { name: 'Upload Invoice', href: '/vendor-portal/invoices/upload' }
        ]
      },
      {
        name: 'Payments',
        href: '/vendor-portal/payments',
        icon: CreditCardIcon,
        description: 'Payment history and status'
      }
    ]
  },
  communication: {
    name: 'Communication',
    items: [
      {
        name: 'Messages',
        href: '/vendor-portal/messages',
        icon: ChatBubbleLeftRightIcon,
        description: 'Chat with the FAS team',
        subitems: [
          { name: 'Inbox', href: '/vendor-portal/messages' },
          { name: 'Send New Message', href: '/vendor-portal/messages/new' }
        ]
      },
      {
        name: 'Notifications',
        href: '/vendor-portal/notifications',
        icon: BellIcon,
        description: 'Recent alerts and updates'
      }
    ]
  },
  resources: {
    name: 'Resources',
    items: [
      {
        name: 'Analytics',
        href: '/vendor-portal/analytics',
        icon: ChartBarIcon,
        description: 'Reporting and metrics'
      },
      {
        name: 'Settings',
        href: '/vendor-portal/settings',
        icon: CogIcon,
        description: 'Account preferences and access'
      },
      {
        name: 'Documents',
        href: '/vendor-portal/documents',
        icon: FolderIcon,
        description: 'Shared files and resources'
      },
      {
        name: 'Updates & News',
        icon: NewspaperIcon,
        description: 'Announcements and releases',
        subitems: [
          { name: 'All Updates', href: '/vendor-portal/blog' },
          { name: 'Announcements', href: '/vendor-portal/blog?type=announcement' },
          { name: 'New Releases', href: '/vendor-portal/blog?type=release' },
          { name: 'Policy Updates', href: '/vendor-portal/blog?type=policy' }
        ]
      },
      {
        name: 'Onboarding Guide',
        icon: AcademicCapIcon,
        description: 'Step-by-step vendor setup',
        subitems: [
          { name: 'Getting Started', href: '/vendor-portal/onboarding/getting-started' },
          { name: 'FAQ', href: '/vendor-portal/onboarding/faq' },
          { name: 'Support', href: '/vendor-portal/onboarding/support' }
        ]
      }
    ]
  }
};

const ctas = [
  { name: 'Onboarding', href: '/vendor-portal/onboarding', icon: PlayCircleIcon },
  { name: 'Contact sales', href: '/vendor-portal/messages', icon: PhoneIcon },
  { name: 'View all products', href: '/vendor-portal/products', icon: RectangleGroupIcon }
];

const NavPanelItem = ({ item }: { item: NavLink }) => (
  <div className="rounded-2xl p-4 border border-white/10 bg-white/5 hover:border-primary/40 hover:bg-white/10 transition h-full">
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white/70">
        {item.icon ? <item.icon className="h-6 w-6" /> : <Squares2X2Icon className="h-6 w-6" />}
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-base font-semibold text-white">{item.name}</p>
        {item.description && <p className="text-sm text-white/60">{item.description}</p>}
        {item.subitems && (
          <div className="mt-2 space-y-1">
            {item.subitems.map((sub) => (
              <a
                key={sub.name}
                href={sub.href}
                className="block text-sm text-white/70 hover:text-white"
              >
                {sub.name}
              </a>
            ))}
          </div>
        )}
        {item.href && !item.subitems && (
          <a
            href={item.href}
            className="inline-flex text-sm font-semibold text-white/80 hover:text-primary mt-2"
          >
            Open →
          </a>
        )}
      </div>
    </div>
  </div>
);

export default function VendorPortalFlyoutNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderPopover = (group: NavGroup) => (
    <Popover className="relative">
      <PopoverButton className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white">
        {group.name}
        <ChevronDownIcon className="h-4 w-4 text-white/60" />
      </PopoverButton>
      <PopoverPanel className="fixed inset-x-0 top-16 w-screen max-w-none px-4 sm:px-6 lg:px-8 z-40">
        <div className="mx-auto w-full max-w-6xl border box-shadow-outter shadow-white/40 border-primary/10 bg-black p-6 ring-1 ring-primaryB/5 shadow-inner rounded-b-xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <NavPanelItem key={item.name} item={item} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-white/5 border-x border-primary/20 box-shadow-outter shadow-inner shadow-primaryB/30 bg-white/5 overflow-hidden hover:bg-primary/10 transition-shadow">
            {ctas.map((cta) => (
              <a
                key={cta.name}
                href={cta.href}
                className="flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold text-white hover:bg-white/10"
              >
                <cta.icon className="h-4 w-4 text-white/60" />
                {cta.name}
              </a>
            ))}
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  );

  const mobileGroup = (group: NavGroup) => (
    <Disclosure as="div" className="border-b border-white/10 py-3" key={group.name}>
      <DisclosureButton className="flex w-full items-center justify-between text-left text-sm font-semibold text-white">
        {group.name}
        <ChevronDownIcon className="h-4 w-4 text-white/60 group-data-open:rotate-180" />
      </DisclosureButton>
      <DisclosurePanel className="mt-2 space-y-2">
        {group.items.map((item) => (
          <div key={item.name} className="rounded-lg border border-white/10 p-3 bg-white/5">
            <div className="flex items-center gap-2">
              {item.icon && <item.icon className="h-5 w-5 text-white/70" />}
              <div className="font-semibold text-white text-sm">{item.name}</div>
            </div>
            {item.description && <p className="text-xs text-white/60 mt-1">{item.description}</p>}
            {item.subitems ? (
              <div className="mt-2 space-y-1 ml-4">
                {item.subitems.map((sub) => (
                  <a
                    key={sub.name}
                    href={sub.href}
                    className="block text-xs text-white/70 hover:text-white"
                    onClick={() => setMobileOpen(false)}
                  >
                    {sub.name}
                  </a>
                ))}
              </div>
            ) : (
              item.href && (
                <a
                  href={item.href}
                  className="mt-2 inline-block text-xs font-semibold text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  Open →
                </a>
              )
            )}
          </div>
        ))}
      </DisclosurePanel>
    </Disclosure>
  );

  return (
    <header className="rounded-full sticky mt-7 top-4 z-40 bg-black/85 backdrop-blur border border-primary/30 box-shadow-outter shadow-inner shadow-white/30">
      <nav className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2">
          <a href="/vendor-portal" className="inline-flex items-center gap-2">
            <img src="/logo/faslogo150.webp" alt="FAS Motorsports" className="h-8 w-auto" />
            <span className="sr-only">FAS Motorsports Vendor Portal</span>
          </a>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-white/15 p-2 text-white hover:border-primary transition"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>

        <PopoverGroup className="hidden lg:flex lg:items-center lg:gap-4">
        {renderPopover(navigation.ordersInventory)}
        {renderPopover(navigation.financials)}
        {renderPopover(navigation.communication)}
        {renderPopover(navigation.resources)}
        </PopoverGroup>

        <div className="hidden lg:flex lg:items-center lg:gap-3">
          <a
            href="/vendor-portal/onboarding"
            className="text-sm font-semibold text-white hover:text-primary"
          >
            Onboarding →
          </a>
          <a
            href="/vendor-portal/messages"
            className="text-sm font-semibold text-white hover:text-primary"
          >
            Contact sales
          </a>
        </div>
      </nav>

      <Dialog open={mobileOpen} onClose={setMobileOpen} className="lg:hidden">
        <DialogBackdrop className="fixed inset-0 z-40 bg-black/80" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw] bg-black/70 bg-blur-sm p-4 border-l border-white/10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Menu</p>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center rounded-md border border-white/15 p-2 text-white hover:border-primary transition"
              aria-label="Close menu"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {Object.values(navigation).map((group) => mobileGroup(group))}

          <div className="py-3">
            <div className="mt-3 space-y-2">
              {ctas.map((cta) => (
                <a
                  key={cta.name}
                  href={cta.href}
                  className="flex items-center gap-2 p-3 text-sm font-semibold text-white hover:text-primary transition"
                  onClick={() => setMobileOpen(false)}
                >
                  <cta.icon className="h-4 w-4 text-white/60" />
                  {cta.name}
                </a>
              ))}
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  );
}
