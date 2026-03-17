import { ensureFasAuthLoaded } from './fas-auth-shared';

// ── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  thumbnail?: string;
  variantTitle?: string;
}

interface FulfillmentTrack {
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
}

interface Order {
  id: string;
  displayId?: number;
  orderNumber?: string | number;
  status?: string;
  fulfillmentStatus?: string;
  paymentStatus?: string;
  createdAt?: string;
  _createdAt?: string;
  totalAmount?: number;
  amountSubtotal?: number;
  amountShipping?: number;
  currencyCode?: string;
  items?: OrderItem[];
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  fulfillments?: Array<{ trackingLinks?: FulfillmentTrack[] }>;
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
}

// ── DOM helpers ──────────────────────────────────────────────────────────────

const root = document.getElementById('orders-root');
if (root) root.textContent = 'Loading...';

const renderError = (msg: string) => {
  if (!root) return;
  root.innerHTML = `<p class="text-red-300 py-6">${msg}</p>`;
};

const renderEmpty = () => {
  if (!root) return;
  root.innerHTML = `
    <div class="flex flex-col items-center py-16 text-center">
      <svg class="w-16 h-16 text-white/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p class="text-xl font-semibold mb-2">No orders yet</p>
      <p class="text-white/60 text-sm mb-6">Your completed purchases will appear here.</p>
      <a href="/shop" class="rounded-full bg-primary px-6 py-2 text-sm font-semibold uppercase tracking-wide text-black hover:opacity-90 transition">
        Shop Now
      </a>
    </div>
  `;
};

// ── Formatting helpers ───────────────────────────────────────────────────────

const formatCents = (cents: number | undefined, currency = 'USD'): string => {
  if (typeof cents !== 'number') return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2
  }).format(cents / 100);
};

const formatDate = (iso: string | undefined): string => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'gray';

const STATUS_MAP: Record<string, BadgeVariant> = {
  completed: 'green',
  shipped: 'green',
  delivered: 'green',
  fulfilled: 'green',
  processing: 'blue',
  pending: 'amber',
  requires_action: 'amber',
  captured: 'green',
  partially_refunded: 'amber',
  refunded: 'red',
  canceled: 'red',
  cancelled: 'red',
  not_fulfilled: 'gray',
  partially_fulfilled: 'blue'
};

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  green: 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30',
  blue: 'bg-blue-400/15 text-blue-300 border border-blue-400/30',
  amber: 'bg-amber-400/15 text-amber-300 border border-amber-400/30',
  red: 'bg-red-400/15 text-red-300 border border-red-400/30',
  gray: 'bg-white/10 text-white/60 border border-white/15'
};

const statusBadge = (label: string | undefined): string => {
  if (!label) return '';
  const variant = STATUS_MAP[label.toLowerCase()] ?? 'gray';
  const cls = BADGE_CLASSES[variant];
  const display = label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return `<span class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cls}">${display}</span>`;
};

// ── Tracking helper ──────────────────────────────────────────────────────────

const extractTracking = (order: Order): FulfillmentTrack | null => {
  // Direct fields (legacy / custom)
  if (order.trackingNumber) {
    return {
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      carrier: order.carrier
    };
  }
  // Medusa fulfillments array
  const link = order.fulfillments?.[0]?.trackingLinks?.[0];
  if (link?.trackingNumber) return link;
  return null;
};

// ── Item thumbnail row ───────────────────────────────────────────────────────

const renderItemRow = (items: OrderItem[] | undefined): string => {
  if (!items || items.length === 0) return '';
  const MAX_THUMBS = 4;
  const visible = items.slice(0, MAX_THUMBS);
  const overflow = items.length - MAX_THUMBS;

  const thumbs = visible
    .map(
      (item) => `
      <li title="${item.title}${item.variantTitle ? ` — ${item.variantTitle}` : ''}" class="relative">
        <div class="w-10 h-10 rounded border border-white/10 overflow-hidden bg-black/40 flex items-center justify-center">
          ${
            item.thumbnail
              ? `<img src="${item.thumbnail}" alt="${item.title}" class="w-full h-full object-cover" loading="lazy" />`
              : `<svg class="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586A2 2 0 0110 11h4a2 2 0 011.414.586L20 16M14 8a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`
          }
        </div>
        ${item.quantity > 1 ? `<span class="absolute -top-1 -right-1 bg-primary text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">${item.quantity}</span>` : ''}
      </li>
    `
    )
    .join('');

  const overflowBadge =
    overflow > 0
      ? `<li class="w-10 h-10 rounded border border-white/15 bg-white/5 flex items-center justify-center text-xs text-white/50">+${overflow}</li>`
      : '';

  return `
    <ul class="flex gap-2 flex-wrap items-center mt-3">
      ${thumbs}
      ${overflowBadge}
    </ul>
  `;
};

// ── Main render ──────────────────────────────────────────────────────────────

const renderList = (orders: Order[]) => {
  if (!root) return;
  root.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'space-y-4';

  for (const order of orders) {
    const created = order.createdAt ?? order._createdAt;
    const orderId = order.displayId ? `#${order.displayId}` : (order.orderNumber ?? order.id ?? '—');
    const tracking = extractTracking(order);
    const currency = order.currencyCode ?? 'USD';

    const trackingHtml = tracking
      ? tracking.trackingUrl
        ? `<a href="${tracking.trackingUrl}" target="_blank" rel="noopener noreferrer"
             class="text-primary hover:underline text-sm">
             Track: ${tracking.trackingNumber}${tracking.carrier ? ` (${tracking.carrier})` : ''}
           </a>`
        : `<span class="text-sm text-white/70">Tracking: ${tracking.trackingNumber}${tracking.carrier ? ` (${tracking.carrier})` : ''}</span>`
      : '';

    const li = document.createElement('li');
    li.className = 'border border-white/10 rounded-xl bg-black/40 p-5 space-y-2';
    li.setAttribute('data-order-id', String(order.id ?? ''));

    li.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span class="text-base font-semibold">Order ${orderId}</span>
          <span class="ml-3 text-sm text-white/50">${formatDate(created)}</span>
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          ${statusBadge(order.fulfillmentStatus ?? order.status)}
          ${statusBadge(order.paymentStatus)}
        </div>
      </div>
      ${renderItemRow(order.items)}
      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 mt-3">
        <div class="text-sm text-white/60">
          ${trackingHtml}
        </div>
        <div class="text-right">
          <div class="text-base font-semibold">${formatCents(order.totalAmount, currency)}</div>
          ${
            typeof order.amountShipping === 'number'
              ? `<div class="text-xs text-white/50">incl. ${formatCents(order.amountShipping, currency)} shipping</div>`
              : ''
          }
        </div>
      </div>
    `;

    ul.appendChild(li);
  }

  root.appendChild(ul);
};

// ── Bootstrap ────────────────────────────────────────────────────────────────

(async () => {
  try {
    const fas = await ensureFasAuthLoaded();
    const isAuthed = fas ? await fas.isAuthenticated() : false;
    if (!isAuthed) {
      renderError('Please <a href="/login" class="underline text-primary">log in</a> to view your orders.');
      return;
    }

    // Session-auth only — no email fallback (API returns 401 for unauthenticated requests)
    const res = await fetch('/api/get-user-order');
    if (res.status === 401 || res.status === 403) {
      renderError('Session expired. Please <a href="/login" class="underline text-primary">log in again</a>.');
      return;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data: unknown = await res.json();
    const orders: Order[] = Array.isArray(data)
      ? (data as Order[])
      : Array.isArray((data as { items?: Order[] }).items)
        ? ((data as { items: Order[] }).items)
        : [];

    if (orders.length === 0) {
      renderEmpty();
      return;
    }

    renderList(orders);
  } catch (err) {
    console.error('[user-orders-page] Failed to load orders:', err);
    renderError('Unable to load your orders. Please try again later.');
  }
})();
