// src/pages/api/get-user-order.ts
import type { APIRoute } from 'astro';
import { sanityClient } from '@/lib/sanityClient';
import { readSession } from '../../server/auth/session';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type'
};

const asNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const normalizeSlug = (value: unknown): string | undefined => {
  const raw = asNonEmptyString(value);
  if (!raw) return undefined;
  const withoutOrigin = raw.replace(/^https?:\/\/[^/]+/i, '');
  const withoutQuery = withoutOrigin.split(/[?#]/)[0];
  const segments = withoutQuery.replace(/^\/+/, '').split('/').filter(Boolean);
  if (!segments.length) return undefined;
  const slug = segments[segments.length - 1];
  return slug ? slug.toLowerCase() : undefined;
};

const firstNonEmpty = (values: unknown[]): string | undefined => {
  for (const value of values) {
    const str = asNonEmptyString(value);
    if (str) return str;
  }
  return undefined;
};

const setImageOnItem = (item: Record<string, any>, url: string) => {
  if (!url) return;
  item.resolvedImageUrl = url;
  if (!asNonEmptyString(item.imageUrl)) item.imageUrl = url;
  if (!asNonEmptyString(item.image)) item.image = url;
  if (!asNonEmptyString(item.productResolvedImageUrl)) item.productResolvedImageUrl = url;
  if (item.product && typeof item.product === 'object') {
    if (!asNonEmptyString(item.product.imageUrl)) item.product.imageUrl = url;
    if (!asNonEmptyString(item.product.image)) item.product.image = url;
  }
};

const collectItemMetadata = (item: Record<string, any>): Record<string, unknown> => {
  if (item?.metadata && typeof item.metadata === 'object') {
    return item.metadata as Record<string, unknown>;
  }
  return {};
};

const gatherLookupCandidates = (
  item: Record<string, any>,
  idSet: Set<string>,
  slugSet: Set<string>,
  skuSet: Set<string>,
  titleSet: Set<string>
) => {
  const metadata = collectItemMetadata(item);
  const idCandidates = [
    item?.id,
    metadata.sanity_product_id,
    metadata.product_id,
    metadata.productId,
    metadata.sanityProductId
  ];
  idCandidates.forEach((candidate) => {
    const str = asNonEmptyString(candidate);
    if (str) idSet.add(str);
  });

  const slugCandidates = [
    item?.productSlug,
    metadata.product_slug,
    metadata.slug,
    metadata.productSlug,
    item?.productUrl,
    metadata.product_url,
    metadata.url
  ];
  slugCandidates.forEach((candidate) => {
    const slug = normalizeSlug(candidate);
    if (slug) slugSet.add(slug);
  });

  const skuCandidates = [item?.sku, metadata.sku, metadata.product_sku, metadata.productSku];
  skuCandidates.forEach((candidate) => {
    const str = asNonEmptyString(candidate);
    if (str) skuSet.add(str.toLowerCase());
  });

  const titleCandidates = [
    item?.name,
    metadata.product_name,
    metadata.productName,
    metadata.title,
    metadata.name
  ];
  titleCandidates.forEach((candidate) => {
    const str = asNonEmptyString(candidate);
    if (str) titleSet.add(str.toLowerCase());
  });
};

const applyLookupImage = (
  item: Record<string, any>,
  maps: {
    byId: Map<string, string>;
    bySlug: Map<string, string>;
    bySku: Map<string, string>;
    byTitle: Map<string, string>;
  }
) => {
  const existing = firstNonEmpty([
    item?.resolvedImageUrl,
    item?.imageUrl,
    item?.image,
    item?.productResolvedImageUrl,
    item?.product?.imageUrl,
    item?.product?.image
  ]);
  if (existing) {
    setImageOnItem(item, existing);
    return;
  }

  const metadata = collectItemMetadata(item);

  const idCandidates = [
    item?.id,
    metadata.sanity_product_id,
    metadata.product_id,
    metadata.productId,
    metadata.sanityProductId
  ];
  for (const candidate of idCandidates) {
    const str = asNonEmptyString(candidate);
    if (str) {
      const url = maps.byId.get(str);
      if (url) {
        setImageOnItem(item, url);
        return;
      }
    }
  }

  const slugCandidates = [
    item?.productSlug,
    metadata.product_slug,
    metadata.productSlug,
    metadata.slug,
    item?.productUrl,
    metadata.product_url,
    metadata.url
  ];
  for (const candidate of slugCandidates) {
    const slug = normalizeSlug(candidate);
    if (slug) {
      const url = maps.bySlug.get(slug);
      if (url) {
        setImageOnItem(item, url);
        return;
      }
    }
  }

  const skuCandidates = [item?.sku, metadata.sku, metadata.product_sku, metadata.productSku];
  for (const candidate of skuCandidates) {
    const str = asNonEmptyString(candidate);
    if (str) {
      const url = maps.bySku.get(str.toLowerCase());
      if (url) {
        setImageOnItem(item, url);
        return;
      }
    }
  }

  const titleCandidates = [
    item?.name,
    metadata.product_name,
    metadata.productName,
    metadata.title,
    metadata.name
  ];
  for (const candidate of titleCandidates) {
    const str = asNonEmptyString(candidate);
    if (str) {
      const url = maps.byTitle.get(str.toLowerCase());
      if (url) {
        setImageOnItem(item, url);
        return;
      }
    }
  }
};

async function enrichOrdersWithProductImages(orders: any[]): Promise<void> {
  if (!Array.isArray(orders) || !orders.length) return;

  const idSet = new Set<string>();
  const slugSet = new Set<string>();
  const skuSet = new Set<string>();
  const titleSet = new Set<string>();

  orders.forEach((order) => {
    if (!order || typeof order !== 'object') return;
    const cartItems = Array.isArray(order.cart) ? order.cart : [];
    cartItems.forEach((item: unknown) => {
      if (item && typeof item === 'object') {
        gatherLookupCandidates(item as Record<string, any>, idSet, slugSet, skuSet, titleSet);
      }
    });
    const orderItems = Array.isArray(order.items) ? order.items : [];
    orderItems.forEach((item: unknown) => {
      if (item && typeof item === 'object') {
        gatherLookupCandidates(item as Record<string, any>, idSet, slugSet, skuSet, titleSet);
      }
    });
  });

  if (!idSet.size && !slugSet.size && !skuSet.size && !titleSet.size) return;

  const params = {
    ids: idSet.size ? Array.from(idSet) : ['__none__'],
    slugs: slugSet.size ? Array.from(slugSet) : ['__none__'],
    skus: skuSet.size ? Array.from(skuSet) : ['__none__'],
    titles: titleSet.size ? Array.from(titleSet) : ['__none__']
  };

  const products: Array<{
    _id?: string;
    title?: string;
    sku?: string;
    slug?: string;
    imageUrl?: string;
  }> =
    (await sanityClient
      .fetch(
        `*[_type == "product" && !(_id in path('drafts.**')) && (status == "active" || !defined(status)) && coalesce(productType, "") != "service" && (
          (_id in $ids) ||
          (slug.current in $slugs) ||
          (sku in $skus) ||
          (title in $titles)
        )]{
          _id,
          title,
          sku,
          "slug": slug.current,
          "imageUrl": coalesce(
            imageUrl,
            image.asset->url,
            images[0].asset->url,
            mainImage.asset->url,
            thumbnail.asset->url,
            thumb.asset->url
          )
        }`,
        params
      )
      .catch(() => [])) || [];

  const maps = {
    byId: new Map<string, string>(),
    bySlug: new Map<string, string>(),
    bySku: new Map<string, string>(),
    byTitle: new Map<string, string>()
  };

  products.forEach((product) => {
    const imageUrl = asNonEmptyString(product?.imageUrl);
    if (!imageUrl) return;
    if (product?._id) maps.byId.set(product._id, imageUrl);
    const slug = normalizeSlug(product?.slug);
    if (slug) maps.bySlug.set(slug, imageUrl);
    const sku = asNonEmptyString(product?.sku);
    if (sku) maps.bySku.set(sku.toLowerCase(), imageUrl);
    const title = asNonEmptyString(product?.title);
    if (title) maps.byTitle.set(title.toLowerCase(), imageUrl);
  });

  orders.forEach((order) => {
    if (!order || typeof order !== 'object') return;
    if (Array.isArray(order.cart)) {
      order.cart = order.cart.map((item: unknown) => {
        if (item && typeof item === 'object') {
          applyLookupImage(item as Record<string, any>, maps);
        }
        return item;
      });
    }
    if (Array.isArray(order.items)) {
      order.items = order.items.map((item: unknown) => {
        if (item && typeof item === 'object') {
          applyLookupImage(item as Record<string, any>, maps);
        }
        return item;
      });
    }
  });
}

// No bearer/jwks needed; use fas_session or query ?email

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: cors });

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Allow either query param or token-derived email
    let email = (url.searchParams.get('email') || '').trim().toLowerCase();

    // If no email in query, try session cookie
    if (!email) {
      const { session } = await readSession(request);
      const se = (session?.user?.email as string | undefined) || '';
      email = se ? se.toLowerCase() : '';
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400,
        headers: { ...cors, 'content-type': 'application/json' }
      });
    }

    const query = `*[_type == "order" && customerRef->email == $email]{
        _id,
        orderNumber,
        status,
        paymentStatus,
        orderType,
        totalAmount,
        amountSubtotal,
        amountTax,
        amountShipping,
        createdAt,
        carrier,
        service,
        trackingNumber,
        trackingUrl,
        shippingAddress,
        billingAddress,
        cart,
        customerName,
        customerEmail
      }`;

    const orders = await sanityClient.fetch(query, { email });
    const safeOrders = Array.isArray(orders) ? orders : [];
    await enrichOrdersWithProductImages(safeOrders);

    return new Response(JSON.stringify(safeOrders), {
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  } catch (err: any) {
    console.error('get-user-order error:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Failed to fetch orders' }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' }
    });
  }
};
