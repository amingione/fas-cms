import type { CartItem } from '@/lib/cart';
import { saveCart } from '@/lib/cart';

const VIEW_KEYS = [
  'dashboard',
  'orders',
  'quotes',
  'invoices',
  'appointments',
  'profile',
  'details'
] as const;
type ViewKey = (typeof VIEW_KEYS)[number];

const viewSet = new Set<ViewKey>(VIEW_KEYS);
let currentView: ViewKey = 'dashboard';
let userEmail = '';
let defaultName = 'Guest';
let loadToken = 0;

const AUTH_TIMEOUT = 8000;
const FALLBACK_ITEM_IMAGE = '/logo/faslogo150.webp';

type OrderPartitions = {
  active: any[];
  expired: any[];
  all: any[];
};

const EMPTY_ORDER_PARTITIONS: OrderPartitions = { active: [], expired: [], all: [] };
const EXPIRED_CART_STATUSES = new Set([
  'expired',
  'expired_cart',
  'checkout_expired',
  'cart_expired',
  'abandoned',
  'abandoned_cart'
]);
const CART_ONLY_STATUSES = new Set(['cart', 'cart_saved']);
const EXPIRED_PAYMENT_STATUSES = new Set(['expired', 'timed_out']);
const ORDER_CACHE_TTL = 60 * 1000;

const orderStore = new Map<string, any>();
let ordersCache: OrderPartitions | null = null;
let ordersCacheTimestamp = 0;
let ordersRequest: Promise<OrderPartitions> | null = null;

function pickImageUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const directKeys: Array<keyof typeof obj> = ['url', 'imageUrl', 'src', 'href'];
    for (const key of directKeys) {
      const nested = obj[key];
      const resolved = pickImageUrl(nested);
      if (resolved) return resolved;
    }
    if (obj.asset) {
      const asset = obj.asset as Record<string, unknown>;
      const assetUrl = pickImageUrl(asset.url);
      if (assetUrl) return assetUrl;
    }
  }
  return null;
}

function resolveOrderItemImage(item: any): string {
  if (!item) return FALLBACK_ITEM_IMAGE;
  const product = item.product ?? {};
  const price = item.price ?? {};
  const priceProduct = typeof price.product === 'object' ? price.product : {};

  const productImages = Array.isArray(product.images) ? product.images : [];
  const priceProductImages = Array.isArray(priceProduct.images)
    ? priceProduct.images
    : [];
  const additionalImages: unknown[] = [];
  const collectImages = (images: unknown[]) => {
    for (const img of images) {
      additionalImages.push(img);
      if (img && typeof img === 'object') {
        const asset = (img as Record<string, unknown>).asset;
        if (asset) additionalImages.push(asset);
      }
    }
  };

  collectImages(productImages);
  collectImages(priceProductImages);

  const metadata = item.metadata ?? {};
  const priceMetadata = price.metadata ?? {};
  const productMetadata = product.metadata ?? {};
  const priceProductMetadata = priceProduct.metadata ?? {};
  const metadataCandidates: unknown[] = [
    metadata.imageUrl,
    metadata.imageURL,
    metadata.image_url,
    metadata.productImage,
    metadata.product_image,
    metadata.productImageUrl,
    metadata.product_image_url,
    metadata.product_imageUrl,
    metadata.thumbnail,
    metadata.thumbnailUrl,
    metadata.thumbnail_url,
    metadata.image,
    metadata.image0,
    priceMetadata,
    priceMetadata.image,
    priceMetadata.imageUrl,
    productMetadata,
    productMetadata.image,
    productMetadata.imageUrl,
    priceProductMetadata,
    priceProductMetadata.image,
    priceProductMetadata.imageUrl
  ];

  const candidates: unknown[] = [
    item.resolvedImageUrl,
    item.productResolvedImageUrl,
    item.imageUrl,
    item.image,
    ...metadataCandidates,
    metadata,
    product.resolvedImageUrl,
    product.imageUrl,
    product.image,
    product.mainImage,
    product.thumbnail,
    product.thumb,
    price.resolvedImageUrl,
    price.imageUrl,
    price.image,
    priceProduct.resolvedImageUrl,
    priceProduct.imageUrl,
    priceProduct.image,
    priceProduct.mainImage,
    priceProduct.thumbnail,
    priceProduct.thumb,
    ...additionalImages
  ];

  for (const candidate of candidates) {
    const url = pickImageUrl(candidate);
    if (url) return url;
  }

  console.debug('[dashboard] Missing product image for order item', item);
  return FALLBACK_ITEM_IMAGE;
}

function collectOrderKeys(order: any): string[] {
  if (!order || typeof order !== 'object') return [];
  const keys: string[] = [];
  const seen = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    keys.push(trimmed);
  };
  add(order?._id);
  add(order?.orderId);
  add(order?.orderNumber);
  add(order?.stripeSessionId);
  add(order?.stripeCheckoutSessionId);
  add(order?.paymentIntentId);
  add(order?.stripePaymentIntentId);
  add(order?.paymentIntent?.id);
  add((order as Record<string, any>)._clientKey);
  if (!keys.length) {
    const fallback = `order-${Math.random().toString(36).slice(2)}`;
    (order as Record<string, any>)._clientKey = fallback;
    add(fallback);
  }
  return keys;
}

function rememberOrders(list: any[]): void {
  list.forEach((order) => {
    if (!order || typeof order !== 'object') return;
    const keys = collectOrderKeys(order);
    keys.forEach((key) => orderStore.set(key, order));
  });
}

function getPrimaryOrderKey(order: any): string {
  const keys = collectOrderKeys(order);
  return keys[0] ?? '';
}

function lookupStoredOrder(key: string | null): any | null {
  if (!key) return null;
  if (orderStore.has(key)) return orderStore.get(key);
  for (const order of orderStore.values()) {
    const keys = collectOrderKeys(order);
    if (keys.includes(key)) {
      return order;
    }
  }
  return null;
}

function getOrderLineItems(order: any): any[] {
  if (Array.isArray(order?.cart) && order.cart.length) return order.cart;
  if (Array.isArray(order?.items) && order.items.length) return order.items;
  return [];
}

function hasPaymentEvidence(order: any): boolean {
  if (!order || typeof order !== 'object') return false;
  return Boolean(
    order.paymentIntentId ||
      order.stripePaymentIntentId ||
      order.receiptUrl ||
      order.invoiceRef?._id ||
      order.paymentStatus === 'paid' ||
      order.paymentStatus === 'succeeded'
  );
}

function isExpiredCart(order: any): boolean {
  const status = typeof order?.status === 'string' ? order.status.toLowerCase().trim() : '';
  const paymentStatus =
    typeof order?.paymentStatus === 'string' ? order.paymentStatus.toLowerCase().trim() : '';
  if (status && EXPIRED_CART_STATUSES.has(status)) return true;
  if (paymentStatus && EXPIRED_PAYMENT_STATUSES.has(paymentStatus)) return true;
  if (status && CART_ONLY_STATUSES.has(status) && !hasPaymentEvidence(order)) return true;
  return false;
}

function partitionOrders(raw: any[]): OrderPartitions {
  const safe = Array.isArray(raw)
    ? raw.filter((order) => order && typeof order === 'object')
    : [];
  rememberOrders(safe);
  const active: any[] = [];
  const expired: any[] = [];
  safe.forEach((order) => {
    (isExpiredCart(order) ? expired : active).push(order);
  });
  return { active, expired, all: safe };
}

function mapOrderItemToCart(item: any, index: number): CartItem | null {
  if (!item || typeof item !== 'object') return null;
  const idCandidates = [item.id, item.sku, item._key, item.productId, item.product?.id];
  let id = '';
  for (const candidate of idCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      id = candidate.trim();
      break;
    }
  }
  if (!id) {
    id = `order-item-${index + 1}`;
  }
  const quantity = Number(item.quantity);
  const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  let priceValue: number | null = null;
  if (typeof item.price === 'number') {
    priceValue = item.price;
  } else if (item.price && typeof item.price === 'object') {
    const priceRecord = item.price as Record<string, any>;
    if (typeof priceRecord.unit_amount === 'number') {
      priceValue = priceRecord.unit_amount / 100;
    } else if (typeof priceRecord.amount === 'number') {
      priceValue = priceRecord.amount;
    }
  }
  if (priceValue === null) {
    const fallbackNumber = Number(item.amount ?? item.total ?? item.unitPrice);
    priceValue = Number.isFinite(fallbackNumber) ? fallbackNumber : 0;
  }
  const productUrlRaw =
    item.productUrl ||
    item.href ||
    (typeof item.productSlug === 'string' && item.productSlug ? `/shop/${item.productSlug.replace(/^\//, '')}` : '');
  return {
    id,
    name: String(item.name || item.title || 'Item'),
    price: priceValue || 0,
    quantity: normalizedQuantity,
    image: resolveOrderItemImage(item),
    productUrl: typeof productUrlRaw === 'string' && productUrlRaw ? productUrlRaw : undefined
  };
}

function restoreOrderIntoCart(order: any): { success: boolean; items: CartItem[] } {
  const mapped = getOrderLineItems(order)
    .map((item, index) => mapOrderItemToCart(item, index))
    .filter((entry): entry is CartItem => Boolean(entry));
  if (!mapped.length) {
    return { success: false, items: [] };
  }
  saveCart(mapped);
  return { success: true, items: mapped };
}

function getContainers(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-dash-content]'));
}

function setContent(html: string) {
  getContainers().forEach((el) => {
    el.innerHTML = html;
  });
}

function setName(name: string) {
  const safe = name || defaultName;
  document.querySelectorAll<HTMLElement>('#customer-name, #customer-name-mobile').forEach((el) => {
    el.textContent = safe;
  });
}

function highlightNav(view: ViewKey) {
  document.querySelectorAll<HTMLAnchorElement>('.js-view').forEach((link) => {
    const target = link.dataset.view?.toLowerCase();
    const isActive = target === view || (view === 'details' && target === 'profile');
    link.classList.toggle('bg-white/15', isActive);
    link.classList.toggle('text-primary', isActive);
  });
  const select = document.getElementById('mobile-account-select') as HTMLSelectElement | null;
  if (select) {
    const normalized = view === 'profile' ? 'details' : view;
    if (viewSet.has(normalized as ViewKey)) {
      select.value = normalized;
    }
  }
}

function updateHash(view: ViewKey) {
  const targetHash = view === 'dashboard' ? '' : `#${view}`;
  const desired = `${window.location.pathname}${window.location.search}${targetHash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (desired !== current) {
    history.replaceState(null, '', desired);
  }
}

function viewFromHash(): ViewKey {
  const value = window.location.hash.replace('#', '').toLowerCase();
  if (viewSet.has(value as ViewKey)) {
    return value as ViewKey;
  }
  if (value === 'account' || value === 'details') {
    return 'details';
  }
  return 'dashboard';
}

function ensureView(value?: string | null): ViewKey {
  if (!value) return 'dashboard';
  const lowered = value.toLowerCase();
  if (viewSet.has(lowered as ViewKey)) {
    return lowered as ViewKey;
  }
  if (lowered === 'account') return 'details';
  return 'dashboard';
}

function setLoading(message = 'Loading…') {
  setContent(`<p class="opacity-80">${message}</p>`);
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function formatMoney(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(2);
  }
  const num = Number(value);
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return num.toFixed(2);
  }
  return '';
}

function formatDateTime(value: unknown, withTime = true): string {
  if (!value) return '';
  try {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';
    if (!withTime) return date.toLocaleDateString();
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return '';
  }
}

function normalizeValueList(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((entry) => escapeHtml(String(entry))).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(/[,•]/)
      .map((part) => escapeHtml(part.trim()))
      .filter(Boolean);
  }
  return [];
}

function normalizeAddressParts(address: any): string[] {
  if (!address) return [];
  if (typeof address === 'string') {
    return address
      .split(/\n|,/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map(escapeHtml);
  }

  if (typeof address === 'object') {
    const parts = [
      address.name || address.label,
      address.street || address.street1 || address.addressLine1 || address.address1,
      address.addressLine2 || address.address2,
      [
        address.city,
        address.state || address.stateProvince || address.region,
        address.postalCode || address.zip
      ]
        .flat()
        .filter(Boolean)
        .join(', '),
      address.country
    ]
      .flat()
      .filter(Boolean)
      .map((part: any) => escapeHtml(String(part)));
    return parts.filter((part) => part !== '');
  }

  return [];
}

function formatAddress(address: any): string {
  const parts = normalizeAddressParts(address);
  return parts.join(', ');
}

async function waitForFasAuth(timeoutMs = AUTH_TIMEOUT): Promise<any | null> {
  if (typeof window === 'undefined') return null;
  if ((window as any).fasAuth) return (window as any).fasAuth;

  return await new Promise<any | null>((resolve) => {
    const start = Date.now();
    const poll = () => {
      const fas = (window as any).fasAuth;
      if (fas) {
        resolve(fas);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  });
}

async function requestJSON<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(input, { credentials: 'include', ...init });
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

async function fetchOrders(): Promise<OrderPartitions> {
  if (!userEmail) return EMPTY_ORDER_PARTITIONS;
  if (ordersCache && Date.now() - ordersCacheTimestamp < ORDER_CACHE_TTL) {
    return ordersCache;
  }
  if (ordersRequest) return ordersRequest;
  ordersRequest = (async () => {
    try {
      const raw = await requestJSON<any[]>(
        `/api/get-user-order?email=${encodeURIComponent(userEmail)}`
      );
      const partitioned = partitionOrders(raw);
      ordersCache = partitioned;
      ordersCacheTimestamp = Date.now();
      return partitioned;
    } catch (err) {
      console.error('[dashboard] failed to fetch orders', err);
      ordersCache = null;
      ordersCacheTimestamp = 0;
      return EMPTY_ORDER_PARTITIONS;
    } finally {
      ordersRequest = null;
    }
  })();
  return ordersRequest;
}

async function fetchQuotes(): Promise<any[]> {
  if (!userEmail) return [];
  return await requestJSON<any[]>(`/api/get-user-quotes?email=${encodeURIComponent(userEmail)}`);
}

async function fetchInvoices(): Promise<any[]> {
  if (!userEmail) return [];
  return await requestJSON<any[]>(`/api/get-user-invoices?email=${encodeURIComponent(userEmail)}`);
}

async function fetchAppointments(): Promise<any[]> {
  if (!userEmail) return [];
  return await requestJSON<any[]>(
    `/api/get-user-appointments?email=${encodeURIComponent(userEmail)}`
  );
}

async function fetchProfile(): Promise<any> {
  if (!userEmail) return null;
  return await requestJSON<any>('/api/customer/get', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: userEmail })
  });
}

function renderOrdersHtml(partitions: OrderPartitions): string {
  const items = Array.isArray(partitions?.active) ? partitions.active : [];
  const expired = Array.isArray(partitions?.expired) ? partitions.expired : [];

  const cards = items
    .map((order) => {
      const rawOrderId = typeof order?._id === 'string' ? order._id : '';
      const detailUrlRaw =
        order.orderUrl ||
        order.href ||
        (rawOrderId ? `/dashboard/order/${encodeURIComponent(rawOrderId)}` : '');
      const invoiceUrlRaw =
        order.invoiceUrl ||
        order.invoiceHref ||
        (order.invoiceRef && order.invoiceRef.invoicePdfUrl) ||
        '';

      const orderNumber = escapeHtml(order.orderNumber ?? rawOrderId ?? 'Order');
      const status = escapeHtml(order.status ?? '');
      const createdDate = formatDateTime(
        order.orderDate || order.createdAt || order._createdAt,
        false
      );
      const deliveredDate = formatDateTime(
        order.deliveredAt || order.completedAt || order.updatedAt,
        false
      );
      const total = formatMoney(order.total ?? order.totalAmount);
      const tracking = escapeHtml(order.trackingNumber ?? '');
      const carrier = escapeHtml(order.shippingCarrier ?? order.selectedService?.carrier ?? '');
      const service = escapeHtml(
        order.selectedService?.service ?? order.selectedService?.serviceCode ?? ''
      );
      const viewUrl = detailUrlRaw ? escapeHtml(detailUrlRaw) : '';
      const invoiceUrl = invoiceUrlRaw ? escapeHtml(invoiceUrlRaw) : '';

      const summaryColumns = [
        {
          label: 'Date placed',
          value: createdDate ? escapeHtml(createdDate) : '—',
          datetime: order.orderDate || order.createdAt || order._createdAt
        },
        {
          label: 'Order number',
          value: orderNumber
        },
        {
          label: 'Total amount',
          value: total ? `$${total}` : '—'
        }
      ];

      if (status) {
        summaryColumns.push({
          label: 'Status',
          value: status
        });
      }

      if (tracking) {
        summaryColumns.push({
          label: 'Tracking',
          value: tracking
        });
      }

      const summaryGrid = `
        <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 sm:px-6 lg:px-8">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <dl class="grid flex-1 grid-cols-1 gap-4 text-sm text-white sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              ${summaryColumns
                .map((col) => {
                  const datetime = col.datetime
                    ? ` datetime="${escapeHtml(String(col.datetime))}"`
                    : '';
                  const value = col.datetime
                    ? `<time${datetime}>${col.value}</time>`
                    : escapeHtml(col.value);
                  return `<div class="max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-4">
                    <dt class="font-semibold text-white/80">${escapeHtml(col.label)}</dt>
                    <dd class="mt-1 text-white/60 sm:mt-2">${value}</dd>
                  </div>`;
                })
                .join('')}
            </dl>
            <div class="flex flex-col gap-3 sm:flex-row sm:flex-none">
              ${
                viewUrl
                  ? `<a href="${viewUrl}" class="inline-flex items-center justify-center rounded-md border border-white/20 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:border-primary hover:text-primary">View Order</a>`
                  : ''
              }
              ${
                invoiceUrl
                  ? `<a href="${invoiceUrl}" class="inline-flex items-center justify-center rounded-md border border-white/20 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:border-primary hover:text-primary" target="_blank" rel="noopener">View Invoice</a>`
                  : ''
              }
            </div>
          </div>
        </div>
      `;

      const productRows = Array.isArray(order.items)
        ? order.items
            .map((item: any) => {
              const name = escapeHtml(item?.name ?? item?.product?.title ?? 'Item');
              const image = escapeHtml(resolveOrderItemImage(item)) || FALLBACK_ITEM_IMAGE;
              const price = formatMoney(item?.price ?? item?.unitPrice ?? item?.lineTotal);
              const statusLine = escapeHtml(
                item?.status ||
                  item?.deliveryStatus ||
                  (deliveredDate ? `Delivered ${deliveredDate}` : '')
              );
              const productUrl = escapeHtml(item?.productUrl ?? item?.href ?? '');
              return `
                <tr>
                  <td class="py-5 pr-6">
                    <div class="flex items-center gap-4">
                      <img src="${image}" alt="${name}" class="size-16 rounded-md object-cover" loading="lazy" />
                      <div>
                        <div class="font-semibold text-white">${name}</div>
                        ${price ? `<div class="mt-1 text-xs text-white/60 sm:hidden">$${price}</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td class="hidden py-5 pr-6 text-sm text-white/70 sm:table-cell">${price ? `$${price}` : '—'}</td>
                  <td class="hidden py-5 pr-6 text-sm text-white/60 sm:table-cell">${statusLine || '—'}</td>
                  <td class="py-5 text-right text-xs font-semibold uppercase tracking-wide text-primary">
                    ${productUrl ? `<a href="${productUrl}" class="hover:text-primary/80">View<span class="hidden lg:inline"> Product</span></a>` : ''}
                  </td>
                </tr>
              `;
            })
            .join('')
        : `<tr><td class="py-5 text-sm text-white/70">No products found for this order.</td></tr>`;

      const shippingMeta: string[] = [];
      if (carrier) shippingMeta.push(`Carrier ${carrier}`);
      if (service) shippingMeta.push(`Service ${service}`);
      const shippingFooter = shippingMeta.length
        ? `<p class="text-xs text-white/60">${shippingMeta.join(' • ')}</p>`
        : '';

      return `
        <article class="space-y-4">
          ${summaryGrid}
          <div class="overflow-hidden px-5 py-5 rounded-2xl border border-white/10 bg-white/5 shadow-[0_25px_70px_-40px_rgba(0,0,0,0.75)]">
            <table class="min-w-full text-left text-sm text-white/70">
              <caption class="sr-only">Order ${orderNumber} items</caption>
              <thead class="hidden border-b border-white/10 text-xs uppercase tracking-wide text-white/50 sm:table-header-group">
                <tr>
                  <th scope="col" class="py-3 pr-6 font-medium">Product</th>
                  <th scope="col" class="py-3 pr-6 font-medium">Price</th>
                  <th scope="col" class="py-3 pr-6 font-medium">Status</th>
                  <th scope="col" class="py-3 pl-6 text-right font-medium">Info</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/10">
                ${productRows}
              </tbody>
            </table>
            <div class="flex flex-col gap-2 border-t border-white/10 px-4 py-4 text-sm text-white/70 sm:px-6">
              ${deliveredDate ? `<p class="text-xs text-white/50">Last updated ${escapeHtml(deliveredDate)}</p>` : ''}
              ${shippingFooter}
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  const ordersBody = items.length
    ? `<div class="space-y-16">${cards}</div>`
    : '<p class="opacity-80">No orders found.</p>';

  return `
    <section class="space-y-12">
      <header class="space-y-2">
        <h3 class="font-ethno text-xl text-white tracking-wide">Order History</h3>
        <p class="text-sm text-white/60">
          Check the status of recent orders, manage installs, and download invoices.
        </p>
      </header>
      ${ordersBody}
      ${renderExpiredCartsHtml(expired)}
    </section>
  `;
}

function renderExpiredCartsHtml(expired: any[]): string {
  const safe = Array.isArray(expired) ? expired : [];
  const cards = safe
    .map((order) => {
      const orderKey = getPrimaryOrderKey(order);
      const items = getOrderLineItems(order);
      const previewItem = items[0] || null;
      const image = escapeHtml(resolveOrderItemImage(previewItem));
      const name = escapeHtml(previewItem?.name ?? previewItem?.title ?? 'Cart items');
      const createdDate = formatDateTime(order?.orderDate || order?.createdAt || order?._createdAt);
      const total = formatMoney(order?.total ?? order?.totalAmount ?? order?.amountSubtotal);
      const status = escapeHtml(order?.status ?? 'expired');
      const itemCount = items.reduce((sum: number, item: any) => {
        const qty = Number(item?.quantity);
        if (Number.isFinite(qty) && qty > 0) return sum + qty;
        return sum + 1;
      }, 0);
      const quantityLabel = `${itemCount} item${itemCount === 1 ? '' : 's'}`;
      return `
        <article class="rounded-2xl border border-amber-400/40 bg-black/40 px-4 py-4 sm:px-6" data-expired-card>
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-start gap-4">
              <img src="${image}" alt="${name}" class="size-16 rounded-md border border-white/10 object-cover" loading="lazy" />
              <div>
                <p class="text-[10px] uppercase tracking-[0.35em] text-amber-300">Expired cart</p>
                <p class="text-lg font-semibold text-white">${escapeHtml(
                  order?.orderNumber ?? order?._id ?? 'Recovered cart'
                )}</p>
                ${
                  createdDate
                    ? `<p class="text-xs text-white/60">Saved ${escapeHtml(createdDate)}</p>`
                    : ''
                }
                <p class="text-xs text-white/60">${quantityLabel} · ${
                  total ? `$${total}` : 'Total unavailable'
                }</p>
              </div>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center" data-expired-actions>
              <button
                class="inline-flex items-center justify-center rounded-md bg-amber-400 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 hover:bg-amber-300"
                data-restore-cart="${escapeHtml(orderKey)}"
              >
                Restore cart
              </button>
              <p class="hidden text-xs" data-feedback></p>
            </div>
          </div>
          <p class="mt-3 text-xs text-white/60">Status: ${status}. Restoring replaces the contents of your current shopping cart.</p>
        </article>
      `;
    })
    .join('');

  return `
    <section class="space-y-4" data-expired-carts>
      <div>
        <h3 class="font-ethno text-base">Expired carts</h3>
        <p class="text-sm text-white/70">Checkout sessions that timed out before payment. Restore a cart to try checkout again. Restoring will overwrite the items currently in your cart.</p>
      </div>
      ${
        cards
          ? `<div class="space-y-4">${cards}</div>`
          : '<p class="text-sm text-white/60">You don\'t have any expired carts right now.</p>'
      }
    </section>
  `;
}

function handleExpiredCartRestore(button: HTMLButtonElement) {
  const key = button.getAttribute('data-restore-cart');
  const card = button.closest<HTMLElement>('[data-expired-card]');
  const feedback = card?.querySelector<HTMLElement>('[data-feedback]');
  const showFeedback = (message: string, variant: 'success' | 'error') => {
    if (!feedback) return;
    feedback.innerHTML = message;
    feedback.classList.remove('hidden', 'text-green-400', 'text-red-400');
    feedback.classList.add(variant === 'success' ? 'text-green-400' : 'text-red-400');
  };

  const order = lookupStoredOrder(key);
  if (!order) {
    showFeedback('Unable to locate this cart snapshot.', 'error');
    return;
  }
  const result = restoreOrderIntoCart(order);
  if (!result.success) {
    showFeedback('This cart no longer contains any items to restore.', 'error');
    return;
  }
  button.disabled = true;
  button.classList.add('opacity-60', 'cursor-not-allowed');
  button.textContent = 'Cart restored';
  showFeedback('Cart restored. <a class="underline" href="/cart">View cart</a>.', 'success');
}

function renderQuotesHtml(items: any[]): string {
  if (!items.length) {
    return '<p class="opacity-80">No quotes found.</p>';
  }
  const list = items
    .map((quote) => {
      const id = escapeHtml(quote.quoteNumber ?? quote._id ?? '');
      const status = escapeHtml(quote.status ?? '');
      const created = formatDateTime(quote.createdAt || quote._createdAt, false);
      const total = formatMoney(quote.total);
      const billToName = escapeHtml(quote?.billTo?.name ?? '');
      const shipToName = escapeHtml(quote?.shipTo?.name ?? '');
      const notes = escapeHtml(quote?.notes ?? '');
      const pdfUrl = quote?.quotePdfUrl
        ? `<a class="text-xs text-primary" href="${escapeHtml(quote.quotePdfUrl)}" target="_blank" rel="noopener">Download PDF</a>`
        : '';
      const itemsMarkup = Array.isArray(quote.items)
        ? quote.items
            .map((item: any) => {
              const label = escapeHtml(
                item?.customName ?? item?.description ?? item?.product?.title ?? 'Item'
              );
              const quantity = Number.isFinite(Number(item?.quantity))
                ? Number(item.quantity)
                : undefined;
              const unit = formatMoney(item?.unitPrice);
              const line = formatMoney(item?.lineTotal);
              const description = escapeHtml(item?.description ?? '');
              const metaParts: string[] = [];
              if (description) metaParts.push(description);
              if (unit) metaParts.push(`Unit $${unit}`);
              if (line) metaParts.push(`Line $${line}`);
              return `<div class="border border-white/10 rounded px-3 py-2 bg-black/30">
                <div class="flex justify-between text-sm">
                  <span class="font-medium">${label}</span>
                  ${quantity ? `<span class="opacity-70">Qty ${quantity}</span>` : ''}
                </div>
                ${metaParts.length ? `<div class="text-xs opacity-70 mt-1">${metaParts.join(' • ')}</div>` : ''}
              </div>`;
            })
            .join('')
        : '';
      return `
        <div class="border border-white/20 rounded p-4 bg-black/40">
          <div class="flex justify-between"><div class="font-semibold">${id}</div><div class="opacity-70">${status}</div></div>
          <div class="text-xs opacity-70 mt-1">${escapeHtml(created)}</div>
          ${billToName ? `<div class="text-xs opacity-70 mt-1">Bill To: ${billToName}</div>` : ''}
          ${shipToName ? `<div class="text-xs opacity-70">Ship To: ${shipToName}</div>` : ''}
          ${notes ? `<div class="mt-2 text-xs opacity-70">Notes: ${notes}</div>` : ''}
          ${itemsMarkup ? `<div class="mt-3 space-y-2">${itemsMarkup}</div>` : ''}
          <div class="mt-3 flex items-center justify-between">
            <span>${total ? `Total: $${total}` : ''}</span>
            ${pdfUrl || ''}
          </div>
        </div>
      `;
    })
    .join('');
  return `<h3 class="font-ethno text-lg mb-4">Quotes</h3><div class="space-y-3">${list}</div>`;
}

function renderInvoicesHtml(items: any[]): string {
  if (!items.length) {
    return '<p class="opacity-80">No invoices found.</p>';
  }
  const list = items
    .map((invoice) => {
      const id = escapeHtml(invoice.invoiceNumber ?? invoice._id ?? '');
      const status = escapeHtml(invoice.status ?? '');
      const created = formatDateTime(invoice._createdAt, false);
      const due = formatDateTime(invoice.dueDate, false);
      const total = formatMoney(invoice.total ?? invoice.totalAmount ?? invoice.amount);
      const orderNumber = escapeHtml(invoice?.orderRef?.orderNumber ?? '');
      const trackingNumber = escapeHtml(invoice?.orderRef?.trackingNumber ?? '');
      const carrier = escapeHtml(invoice?.orderRef?.shippingCarrier ?? '');
      const paymentLink = invoice?.paymentLinkUrl
        ? `<a class="text-xs text-primary" href="${escapeHtml(invoice.paymentLinkUrl)}" target="_blank" rel="noopener">Pay Invoice</a>`
        : '';
      const pdfLink = invoice?.invoicePdfUrl
        ? `<a class="text-xs text-primary" href="${escapeHtml(invoice.invoicePdfUrl)}" target="_blank" rel="noopener">Download PDF</a>`
        : '';
      const itemsMarkup = Array.isArray(invoice.lineItems)
        ? invoice.lineItems
            .map((item: any) => {
              const description = escapeHtml(
                item?.description ?? item?.product?.title ?? 'Invoice item'
              );
              const quantity = Number.isFinite(Number(item?.quantity))
                ? Number(item.quantity)
                : undefined;
              const unit = formatMoney(item?.unitPrice);
              const line = formatMoney(item?.lineTotal);
              const sku = escapeHtml(item?.sku ?? '');
              const metaParts: string[] = [];
              if (sku) metaParts.push(`SKU ${sku}`);
              if (unit) metaParts.push(`Unit $${unit}`);
              if (line) metaParts.push(`Line $${line}`);
              return `<div class="border border-white/10 rounded px-3 py-2 bg-black/30">
                <div class="flex justify-between text-sm">
                  <span class="font-medium">${description}</span>
                  ${quantity ? `<span class="opacity-70">Qty ${quantity}</span>` : ''}
                </div>
                ${metaParts.length ? `<div class="text-xs opacity-70 mt-1">${metaParts.join(' • ')}</div>` : ''}
              </div>`;
            })
            .join('')
        : '';
      const shippingBlurbs: string[] = [];
      if (carrier) shippingBlurbs.push(`Carrier: ${carrier}`);
      if (trackingNumber) shippingBlurbs.push(`Tracking: ${trackingNumber}`);
      return `
        <div class="border border-white/20 rounded p-4 bg-black/40">
          <div class="flex justify-between"><div class="font-semibold">${id}</div><div class="opacity-70">${status}</div></div>
          <div class="text-xs opacity-70 mt-1">${escapeHtml(created)}</div>
          ${due ? `<div class="text-xs opacity-70">Due: ${escapeHtml(due)}</div>` : ''}
          ${orderNumber ? `<div class="text-xs opacity-70 mt-1">Order: ${orderNumber}</div>` : ''}
          ${shippingBlurbs.length ? `<div class="text-xs opacity-70">${shippingBlurbs.join(' • ')}</div>` : ''}
          ${itemsMarkup ? `<div class="mt-3 space-y-2">${itemsMarkup}</div>` : ''}
          <div class="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <span>${total ? `Total: $${total}` : ''}</span>
            <span class="flex gap-3">${paymentLink || ''}${pdfLink || ''}</span>
          </div>
        </div>
      `;
    })
    .join('');
  return `<h3 class="font-ethno text-lg mb-4">Invoices</h3><div class="space-y-3">${list}</div>`;
}

function renderAppointmentsHtml(items: any[]): string {
  if (!items.length) {
    return '<p class="opacity-80">No appointments found.</p>';
  }
  const list = items
    .map((appt) => {
      const id = escapeHtml(appt.bookingId ?? appt._id ?? '');
      const status = escapeHtml(appt.status ?? '');
      const scheduledAt = formatDateTime(appt.scheduledAt);
      const created = formatDateTime(appt.createdAt ?? appt._createdAt, false);
      const service = escapeHtml(appt.service ?? '');
      const notes = escapeHtml(appt.notes ?? '');
      return `
        <div class="border border-white/20 rounded p-4 bg-black/40">
          <div class="flex justify-between"><div class="font-semibold">${id}</div><div class="opacity-70">${status}</div></div>
          <div class="text-xs opacity-70 mt-1">${escapeHtml(scheduledAt)}</div>
          ${service ? `<div class="text-xs opacity-70">Service: ${service}</div>` : ''}
          ${created ? `<div class="text-xs opacity-70">Booked: ${escapeHtml(created)}</div>` : ''}
          ${notes ? `<div class="mt-1 text-xs opacity-70">Notes: ${notes}</div>` : ''}
        </div>
      `;
    })
    .join('');
  return `<h3 class="font-ethno text-lg mb-4">Appointments</h3><div class="space-y-3">${list}</div>`;
}

function renderProfileHtml(profile: any): string {
  if (!profile) {
    return '<p class="opacity-80">Unable to load profile.</p>';
  }
  const billingAddress = formatAddress(profile.billingAddress);
  const shippingCandidate =
    Array.isArray(profile.addresses) && profile.addresses.length > 0
      ? profile.addresses[0]
      : profile.shippingAddress || profile.address;
  const shippingAddress = formatAddress(shippingCandidate);
  return `
    <h3 class="font-ethno text-lg mb-3">My Profile</h3>
    <div class="grid sm:grid-cols-2 gap-3 text-sm">
      <div><div class="opacity-70">First Name</div><div class="font-semibold">${escapeHtml(profile.firstName)}</div></div>
      <div><div class="opacity-70">Last Name</div><div class="font-semibold">${escapeHtml(profile.lastName)}</div></div>
      <div><div class="opacity-70">Email</div><div class="font-semibold">${escapeHtml(profile.email ?? userEmail)}</div></div>
      <div><div class="opacity-70">Phone</div><div class="font-semibold">${escapeHtml(profile.phone)}</div></div>
      <div class="sm:col-span-2"><div class="opacity-70">Billing Address</div><div class="font-semibold">${billingAddress || "<span class='opacity-60'>No billing address on file</span>"}</div></div>
      <div class="sm:col-span-2"><div class="opacity-70">Shipping Address</div><div class="font-semibold">${shippingAddress || "<span class='opacity-60'>No shipping address on file</span>"}</div></div>
    </div>
    <p class="mt-5 text-xs opacity-70">Need changes? <a class="underline js-view" data-view="details" href="#details">Edit profile</a>.</p>
  `;
}

async function renderDashboardHtml(): Promise<string> {
  try {
    const profile = await fetchProfile().catch(() => null);
    const preferred =
      profile?.firstName && profile?.lastName
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : defaultName;
    if (preferred) setName(preferred);
    return `
      <h3 class="font-ethno text-base mb-3">Dashboard</h3>
      <div class="font-sans space-y-2 opacity-90 text-base">
        <p>Hello, <strong>${escapeHtml(preferred)}</strong>.</p>
        <p>From your account dashboard you can view your <a href="#orders" data-view="orders" class="underline js-view">recent orders</a>, manage your <a href="#details" data-view="details" class="underline js-view">account details</a>, and more.</p>
      </div>
    `;
  } catch (err) {
    console.error('[dashboard] dashboard view failed', err);
    return '<p class="opacity-80">Unable to load dashboard data right now.</p>';
  }
}

const viewRenderers: Record<ViewKey, () => Promise<string>> = {
  dashboard: renderDashboardHtml,
  orders: async () => renderOrdersHtml(await fetchOrders()),
  quotes: async () => renderQuotesHtml(await fetchQuotes().catch(() => [])),
  invoices: async () => renderInvoicesHtml(await fetchInvoices().catch(() => [])),
  appointments: async () => renderAppointmentsHtml(await fetchAppointments().catch(() => [])),
  profile: async () => renderProfileHtml(await fetchProfile().catch(() => null)),
  details: async () => renderProfileHtml(await fetchProfile().catch(() => null))
};

async function loadView(target: ViewKey) {
  const token = ++loadToken;
  currentView = target;
  updateHash(target);
  highlightNav(target);
  setLoading();
  try {
    const html = await viewRenderers[target]();
    if (token === loadToken) {
      setContent(html);
    }
  } catch (err) {
    console.error('[dashboard] failed to load view', target, err);
    if (token === loadToken) {
      setContent('<p class="opacity-80">Something went wrong loading this view.</p>');
    }
  }
}

async function refreshCounts() {
  const updates: Array<[string, () => Promise<number>]> = [
    ['orders', async () => (await fetchOrders()).active.length],
    ['quotes', async () => (await fetchQuotes().catch(() => [])).length],
    ['invoices', async () => (await fetchInvoices().catch(() => [])).length],
    ['appts', async () => (await fetchAppointments().catch(() => [])).length]
  ];
  await Promise.all(
    updates.map(async ([id, getter]) => {
      try {
        const count = await getter();
        const desktop = document.getElementById(`${id}-count`);
        const mobile = document.getElementById(`${id}-count-mobile`);
        if (desktop) desktop.textContent = String(count);
        if (mobile) mobile.textContent = String(count);
      } catch (err) {
        console.error('[dashboard] count fetch failed for', id, err);
      }
    })
  );
}

function bindNavigation() {
  document.querySelectorAll<HTMLAnchorElement>('.js-view').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      loadView(ensureView(link.dataset.view));
    });
  });

  const select = document.getElementById('mobile-account-select') as HTMLSelectElement | null;
  if (select) {
    select.addEventListener('change', () => {
      loadView(ensureView(select.value));
    });
  }

  document.addEventListener('click', (event) => {
    const restoreButton =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[data-restore-cart]')
        : null;
    if (restoreButton) {
      event.preventDefault();
      handleExpiredCartRestore(restoreButton);
      return;
    }

    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('.js-view[data-view]')
        : null;
    if (target) {
      event.preventDefault();
      loadView(ensureView(target.getAttribute('data-view')));
    }
  });
}

async function initDashboard() {
  try {
    const fas = await waitForFasAuth();
    if (!fas) {
      setContent(
        '<p class="opacity-80">Account services are offline right now. Please try again soon.</p>'
      );
      return;
    }

    const authed = await fas.isAuthenticated?.();
    if (!authed) {
      setContent(
        '<p class="opacity-80">You\'re not signed in. <a class="underline" href="/account">Log in</a>.</p>'
      );
      return;
    }

    const session = await fas.getSession?.();
    userEmail = (session?.user?.email as string) || '';
    if (!userEmail) {
      try {
        userEmail = localStorage.getItem('customerEmail') || '';
      } catch (error) {
        void error;
      }
    }
    userEmail = userEmail.trim().toLowerCase();

    defaultName =
      (session?.user?.given_name as string) ||
      (session?.user?.name as string) ||
      userEmail ||
      defaultName;
    setName(defaultName);

    bindNavigation();

    window.addEventListener('hashchange', () => {
      loadView(viewFromHash());
    });

    refreshCounts();
    await loadView(viewFromHash());
  } catch (err) {
    console.error('[dashboard] init failed', err);
    setContent('<p class="opacity-80">Unable to load dashboard right now.</p>');
  }
}

void initDashboard();

function logout() {
  try {
    localStorage.clear();
  } catch (error) {
    void error;
  }
  try {
    const fas = (window as any).fasAuth;
    if (fas && typeof fas.logout === 'function') {
      fas.logout(window.location.origin + '/account');
      return;
    }
  } catch (error) {
    void error;
  }
  window.location.href = '/api/auth/logout';
}

document.querySelectorAll('.logout-link').forEach((el) => {
  el.addEventListener('click', (event) => {
    event.preventDefault();
    logout();
  });
});

export {};
