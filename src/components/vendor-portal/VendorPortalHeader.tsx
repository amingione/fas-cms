'use client';

import { Fragment, useMemo, useState } from 'react';
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
  BellIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  CogIcon,
  CubeIcon,
  DocumentTextIcon,
  FolderIcon,
  HomeIcon,
  ShoppingBagIcon,
  TagIcon,
  NewspaperIcon,
  CreditCardIcon,
  Squares2X2Icon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  PlayCircleIcon,
  PhoneIcon,
  RectangleGroupIcon
} from '@heroicons/react/24/outline';

type HeaderProps = {
  currentPath: string;
  vendorName: string;
  unreadNotifications?: number;
  unreadMessages?: number;
};

type NavLink = {
  name: string;
  href?: string;
  icon?: typeof HomeIcon;
  description?: string;
  subitems?: { name: string; href: string }[];
  badge?: number;
};

type NavGroup = { name: string; items: NavLink[] };

const navigation: Record<string, NavGroup> = {
  ordersInventory: {
    name: 'Orders & Inventory',
    items: [
      { name: 'Dashboard', href: '/vendor-portal', icon: HomeIcon, description: 'Overview and quick stats' },
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

const standaloneLinks: NavLink[] = [
  { name: 'Analytics', href: '/vendor-portal/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/vendor-portal/settings', icon: CogIcon }
];

const ctas = [
  { name: 'Watch demo', href: '/vendor-portal/onboarding', icon: PlayCircleIcon },
  { name: 'Contact sales', href: '/vendor-portal/messages', icon: PhoneIcon },
  { name: 'View all products', href: '/vendor-portal/products', icon: RectangleGroupIcon }
];

const UserMenu = ({
  vendorName,
  currentPath
}: {
  vendorName: string;
  currentPath: string;
}) => {
  return (
    <Popover className="relative">
      <PopoverButton className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:border-primary transition">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold">
          {vendorName?.[0] || 'V'}
        </span>
        <span className="hidden sm:inline text-white/80">{vendorName}</span>
        <ChevronDownIcon className="h-4 w-4 text-white/60" />
      </PopoverButton>
      <PopoverPanel className="absolute right-0 mt-2 w-56 rounded-lg border border-white/10 bg-black/90 p-2 shadow-2xl ring-1 ring-white/10 z-30">
        {[
          { name: 'Profile', href: '/vendor-portal/settings', icon: UserCircleIcon },
          { name: 'Settings', href: '/vendor-portal/settings', icon: CogIcon },
          { name: 'Log Out', href: '/vendor-portal/logout', icon: ArrowRightOnRectangleIcon }
        ].map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              currentPath === item.href ? 'text-primary bg-white/5' : 'text-white/80 hover:bg-white/5'
            }`}
          >
            <item.icon className="h-5 w-5 text-white/60" />
            {item.name}
          </a>
        ))}
      </PopoverPanel>
    </Popover>
  );
};

function NavPanelItem({ item, currentPath }: { item: NavLink; currentPath: string }) {
  const active = item.href && currentPath.startsWith(item.href);
  return (
    <div
      className={`rounded-2xl p-5 transition h-full ${
        active ? 'border border-primary/40 bg-primary/10' : 'border border-white/10 hover:bg-white/5'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white/70">
          {item.icon ? <item.icon className="h-6 w-6" /> : <Squares2X2Icon className="h-6 w-6" />}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-white">{item.name}</p>
            {item.badge ? (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {item.badge}
              </span>
            ) : null}
          </div>
          {item.description && <p className="text-sm text-white/60">{item.description}</p>}
          {item.subitems && (
            <div className="mt-2 space-y-1">
              {item.subitems.map((sub) => (
                <a
                  key={sub.name}
                  href={sub.href}
                  className={`block text-sm ${
                    currentPath === sub.href ? 'text-primary' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {sub.name}
                </a>
              ))}
            </div>
          )}
          {item.href && !item.subitems && (
            <a
              href={item.href}
              className={`mt-3 inline-flex text-sm font-semibold ${
                active ? 'text-primary' : 'text-white/80 hover:text-white'
              }`}
            >
              Open →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendorPortalHeader({
  currentPath,
  vendorName,
  unreadNotifications = 0,
  unreadMessages = 0
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const notificationsBadge = unreadNotifications > 9 ? '9+' : unreadNotifications || undefined;
  const messagesBadge = unreadMessages > 9 ? '9+' : unreadMessages || undefined;

  const renderPopover = (group: NavGroup) => (
    <Popover className="relative">
      <PopoverButton className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 transition">
        {group.name}
        <ChevronDownIcon className="h-4 w-4 text-white/60" />
      </PopoverButton>
      <PopoverPanel className="fixed left-1/2 top-[72px] w-screen max-w-none -translate-x-1/2 px-4 z-30">
        <div className="mx-auto w-full max-w-6xl border border-white/10 bg-[#0f1115] p-6 ring-1 ring-white/10 shadow-2xl rounded-none">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <NavPanelItem
                key={item.name}
                item={{
                  ...item,
                  badge:
                    item.name === 'Notifications'
                      ? unreadNotifications
                      : item.name === 'Messages'
                      ? unreadMessages
                      : item.badge
                }}
                currentPath={currentPath}
              />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-white/5 overflow-hidden">
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
              {item.name === 'Notifications' && notificationsBadge && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {notificationsBadge}
                </span>
              )}
              {item.name === 'Messages' && messagesBadge && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {messagesBadge}
                </span>
              )}
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
    <div className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#111827]/95 backdrop-blur shadow-lg">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/vendor-portal" className="flex items-center gap-2">
            <img
              src="http://www.fasmotorsports.com/logo/faslogo150.webp"
              alt="FAS Motorsports"
              className="h-8 w-auto"
            />
          </a>
          <PopoverGroup className="hidden lg:flex lg:items-center lg:gap-3">
            {renderPopover(navigation.ordersInventory)}
            {renderPopover(navigation.financials)}
            {renderPopover(navigation.communication)}
            {renderPopover(navigation.resources)}
            {standaloneLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                  currentPath.startsWith(link.href)
                    ? 'text-primary bg-white/5'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {link.icon && <link.icon className="h-5 w-5 text-white/60" />}
                {link.name}
              </a>
            ))}
          </PopoverGroup>
        </div>

        <div className="flex items-center gap-3">
          <UserMenu vendorName={vendorName} currentPath={currentPath} />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden inline-flex items-center justify-center rounded-md border border-white/15 p-2 text-white hover:border-primary transition"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Dialog open={mobileOpen} onClose={setMobileOpen} className="lg:hidden">
        <DialogBackdrop className="fixed inset-0 z-40 bg-black/70" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw] bg-[#0f1115] border-l border-white/10 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img
                src="http://www.fasmotorsports.com/logo/faslogo150.webp"
                alt="FAS Motorsports"
                className="h-8 w-auto"
              />
              <span className="text-sm font-semibold text-white">Vendor Portal</span>
            </div>
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
            <p className="text-xs uppercase tracking-[0.14em] text-white/60 font-semibold mb-2">More</p>
            <div className="space-y-2">
              {standaloneLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm font-semibold text-white hover:border-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.icon && <link.icon className="h-5 w-5 text-white/60" />}
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </div>
  );
}
