import type { APIRoute } from 'astro';
import { getProductBySlug } from '@/lib/sanity-utils';

function normalizeQuantity(value: string | null): number {
  if (!value) return 1;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.min(parsed, 99);
}

function normalizeSlug(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as any).current === 'string') {
    return (value as any).current;
  }
  return '';
}

function collectFilterSlugs(filters: unknown): string[] {
  if (!filters) return [];
  const entries = Array.isArray(filters) ? filters : [filters];
  return entries
    .map((entry) => {
      if (!entry) return '';
      if (typeof entry === 'string') return entry;
      if (typeof entry === 'object') {
        const obj = entry as Record<string, any>;
        if (typeof obj.slug === 'string') return obj.slug;
        if (obj.slug && typeof obj.slug === 'object' && typeof obj.slug.current === 'string') {
          return obj.slug.current;
        }
        if (typeof obj.label === 'string') return obj.label;
        if (typeof obj.title === 'string') return obj.title;
        if (typeof obj.name === 'string') return obj.name;
        if (typeof obj.value === 'string') return obj.value;
      }
      return '';
    })
    .map((slug) => slug.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .filter(Boolean);
}

export const GET: APIRoute = async ({ params, request }) => {
  const slugParam = params.slug ? normalizeSlug(params.slug) : '';
  if (!slugParam) {
    return new Response('Missing product', { status: 400 });
  }

  const product = await getProductBySlug(slugParam);
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const productUrl = new URL(`/shop/${slugParam}`, origin).toString();

  if (!product || !product._id) {
    return Response.redirect(productUrl, 303);
  }

  const qtyParam = requestUrl.searchParams.get('qty');
  const quantity = normalizeQuantity(qtyParam);
  const unitPrice = typeof product.price === 'number' ? product.price : Number(product.price) || 0;
  const imageUrl =
    (Array.isArray(product.images) && product.images[0]?.asset?.url) || '/logo/faslogochroma.png';
  const shippingClassRaw = (product.shippingClass || '').toString();
  const normalizedClass = shippingClassRaw.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const filterSlugs = collectFilterSlugs((product as any).filters);
  const hasInstallOnlyFilter = filterSlugs.includes('install-only') || filterSlugs.includes('installonly');
  const installOnly = normalizedClass === 'installonly' || hasInstallOnlyFilter;

  const cartPayload = {
    cart: [
      {
        id: product._id,
        sku: product.sku,
        name: product.title || 'Product',
        price: unitPrice,
        quantity,
        image: imageUrl,
        productUrl: `/shop/${slugParam}`,
        ...(shippingClassRaw ? { shippingClass: shippingClassRaw } : {}),
        ...(installOnly ? { installOnly: true } : {})
      }
    ]
  };

  const checkoutUrl = new URL('/api/checkout', origin);
  let response: Response;
  try {
    response = await fetch(checkoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cartPayload)
    });
  } catch (error) {
    console.error('[quick-checkout] Failed to contact checkout API:', error);
    return Response.redirect(productUrl, 303);
  }

  const rawBody = await response.text();
  let data: any = null;
  try {
    data = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    data = null;
  }

  if (response.ok && data?.url && typeof data.url === 'string') {
    return Response.redirect(data.url, 303);
  }

  console.error('[quick-checkout] Checkout API error:', response.status, rawBody);
  return Response.redirect(productUrl, 303);
};

export const HEAD: APIRoute = async ({ params, request }) => {
  const slugParam = params.slug ? normalizeSlug(params.slug) : '';
  if (!slugParam) {
    return new Response(null, { status: 400 });
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const productUrl = new URL(`/shop/${slugParam}`, origin);
  const headers = new Headers({ Location: productUrl.toString() });

  return new Response(null, { status: 302, headers });
};
