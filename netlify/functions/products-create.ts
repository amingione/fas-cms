// /netlify/functions/products-create.ts
import type { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import { createClient } from '@sanity/client';

// --- Sanity client (write-enabled) ---
function getClient() {
  const token =
    process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN || process.env.SANITY_TOKEN;
  return createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    token,
    useCdn: false,
    apiVersion: '2023-06-07'
  });
}

const { SESSION_SECRET } = process.env;

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*'
  },
  body: JSON.stringify(body)
});

const bad = (code: number, msg: string) => json(code, { error: msg });

function slugify(input: string) {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 96);
}

// Convert a plain string to a minimal Portable Text block array
function blockify(input: any) {
  if (Array.isArray(input)) return input; // assume already PT
  if (typeof input !== 'string' || !input.trim()) return undefined;
  return [
    {
      _type: 'block',
      style: 'normal',
      children: [{ _type: 'span', text: input.trim() }],
      markDefs: []
    }
  ];
}

// Map image asset IDs or full image objects to proper Sanity image objects
function normalizeImages(input: any): any[] | undefined {
  if (!input) return undefined;
  if (!Array.isArray(input)) return undefined;
  return input
    .map((img) => {
      // Already a sanity image with asset ref
      if (img && typeof img === 'object' && img._type === 'image' && img.asset) return img;
      // Accept `{assetId: 'image-abc-123-...'} or `image-...` directly
      const assetId = typeof img === 'string' ? img : img?.assetId || img?.asset?._ref;
      if (typeof assetId === 'string' && assetId.startsWith('image-')) {
        return { _type: 'image', asset: { _type: 'reference', _ref: assetId } };
      }
      return null;
    })
    .filter(Boolean) as any[];
}

// Normalize arbitrary list of refs: accept array of IDs or array of slugs + fetch to IDs
async function refsFrom({
  ids,
  slugs,
  type,
  client
}: {
  ids?: any;
  slugs?: any;
  type: string;
  client: any;
}) {
  const out: { _type: 'reference'; _ref: string }[] = [];
  const idList: string[] = Array.isArray(ids) ? ids.filter((s) => typeof s === 'string') : [];
  if (idList.length) {
    out.push(...idList.map((_ref) => ({ _type: 'reference' as const, _ref })));
  }
  const slugList: string[] = Array.isArray(slugs) ? slugs.filter((s) => typeof s === 'string') : [];
  if (slugList.length) {
    const q = `*[_type == "${type}" && slug.current in $slugs][]._id`;
    const rows: string[] = await client.fetch(q, { slugs: slugList });
    out.push(...rows.map((_ref) => ({ _type: 'reference' as const, _ref })));
  }
  return out.length ? out : undefined;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return bad(405, 'Method Not Allowed');
  }

  // --- Auth check (employee OR owner) ---
  try {
    const cookie = event.headers.cookie || '';
    const session = /(?:^|;\s*)session=([^;]+)/.exec(cookie)?.[1];
    if (!session) return bad(401, 'Unauthorized');

    const user = jwt.verify(session, SESSION_SECRET!) as any;
    const roles: string[] = Array.isArray(user?.roles)
      ? user.roles.map((r: string) => (r || '').toLowerCase())
      : [];
    const allowed = roles.includes('employee') || roles.includes('owner');
    if (!allowed) return bad(403, 'Forbidden');
  } catch (e) {
    return bad(401, 'Invalid session');
  }

  // --- Parse body ---
  let body: any;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return bad(400, 'Invalid JSON');
  }

  const client = getClient();

  // Required
  const title: string = (body.title || '').trim();
  if (!title) return bad(400, 'title is required');

  // Build slug
  const slugInput: string | undefined = body.slug?.current || body.slug || undefined;
  const slug = { _type: 'slug', current: slugInput ? slugify(slugInput) : slugify(title) };

  // Categories: accept categoryIds OR categorySlugs
  const categoryRefs = await refsFrom({
    ids: body.categoryIds,
    slugs: body.categorySlugs,
    type: 'category',
    client
  });

  // Related entities by slug or id
  const relatedProductRefs = await refsFrom({
    ids: body.relatedProducts,
    slugs: body.relatedProductSlugs,
    type: 'product',
    client
  });
  const upsellProductRefs = await refsFrom({
    ids: body.upsellProducts,
    slugs: body.upsellProductSlugs,
    type: 'product',
    client
  });
  const vehicleRefs = await refsFrom({
    ids: body.compatibleVehicles,
    slugs: body.vehicleSlugs,
    type: 'vehicleModel',
    client
  });

  // Rich text
  const description = Array.isArray(body.description)
    ? body.description
    : blockify(body.description);
  const shortDescription = Array.isArray(body.shortDescription)
    ? body.shortDescription
    : blockify(body.shortDescription);
  const importantNotes = Array.isArray(body.importantNotes)
    ? body.importantNotes
    : blockify(body.importantNotes);

  // Simple scalars
  const sku: string | undefined = body.sku?.toString().trim() || undefined;
  const featured: boolean | undefined =
    typeof body.featured === 'boolean' ? body.featured : undefined;
  const productType: string | undefined = body.productType?.toString().trim() || undefined; // simple | variable | grouped | variation | custom

  // Pricing & inventory
  const price = body.price != null ? Number(body.price) : undefined;
  const salePrice = body.salePrice != null ? Number(body.salePrice) : undefined;
  const onSale = typeof body.onSale === 'boolean' ? body.onSale : undefined;
  const pricingTiers = Array.isArray(body.pricingTiers) ? body.pricingTiers : undefined;
  const inventory = body.inventory != null ? Number(body.inventory) : undefined;

  // Media
  const images = normalizeImages(body.images);
  const mediaAssets = Array.isArray(body.mediaAssets) ? body.mediaAssets : undefined;
  // Support single social image either as image object or assetId string
  const socialImage = body.socialImage
    ? Array.isArray(body.socialImage)
      ? body.socialImage[0]
      : body.socialImage
    : undefined;

  // Details/relations
  const variationOptions = Array.isArray(body.variationOptions) ? body.variationOptions : undefined;
  const parentProduct =
    body.parentProduct && typeof body.parentProduct === 'string'
      ? { _type: 'reference', _ref: body.parentProduct }
      : undefined;
  const specifications = Array.isArray(body.specifications) ? body.specifications : undefined;
  const includedInKit = Array.isArray(body.includedInKit) ? body.includedInKit : undefined;
  const attributes = Array.isArray(body.attributes) ? body.attributes : undefined;
  const customPaint =
    body.customPaint && typeof body.customPaint === 'object' ? body.customPaint : undefined;
  const addOns = Array.isArray(body.addOns) ? body.addOns : undefined;

  // Shipping/SEO/marketing/internal
  const shippingWeight = body.shippingWeight != null ? Number(body.shippingWeight) : undefined;
  const boxDimensions = body.boxDimensions?.toString() || undefined;
  const shippingClass = body.shippingClass?.toString() || undefined;
  const shipsAlone = typeof body.shipsAlone === 'boolean' ? body.shipsAlone : undefined;
  const handlingTime = body.handlingTime != null ? Number(body.handlingTime) : undefined;
  const coreRequired = typeof body.coreRequired === 'boolean' ? body.coreRequired : undefined;
  const coreNotes = body.coreNotes?.toString() || undefined;
  const filters = Array.isArray(body.filters)
    ? body.filters.filter((s: any) => typeof s === 'string')
    : undefined;

  const brand = body.brand?.toString() || undefined;
  const gtin = body.gtin?.toString() || undefined;
  const mpn = body.mpn?.toString() || undefined;
  const metaTitle = body.metaTitle?.toString() || undefined;
  const metaDescription = body.metaDescription?.toString() || undefined;
  const canonicalUrl = body.canonicalUrl?.toString() || undefined;
  const noindex = typeof body.noindex === 'boolean' ? body.noindex : undefined;

  // Assemble Sanity document according to schema
  const doc: any = {
    _type: 'product',
    title,
    slug,
    sku,
    featured,
    productType,

    // Group: general
    category: categoryRefs,

    // Rich text
    description,
    shortDescription,
    importantNotes,

    // Pricing & inventory
    price,
    salePrice,
    onSale,
    pricingTiers,
    inventory,

    // Variants & relations
    variationOptions,
    parentProduct,

    // Custom paint / add-ons
    customPaint,
    addOns,

    // Specs & kit & attributes
    specifications,
    includedInKit,
    attributes,

    // Media
    images,
    mediaAssets,
    socialImage,

    // Relations
    compatibleVehicles: vehicleRefs,
    relatedProducts: relatedProductRefs,
    upsellProducts: upsellProductRefs,

    // SEO / marketing
    brand,
    gtin,
    mpn,
    metaTitle,
    metaDescription,
    canonicalUrl,
    noindex,

    // Shipping/internal
    shippingWeight,
    boxDimensions,
    shippingClass,
    shipsAlone,
    handlingTime,
    coreRequired,
    coreNotes,

    // Filters
    filters
  };

  // Remove undefined keys to keep the document clean
  Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);

  try {
    const created = await client.create(doc);
    return json(200, created);
  } catch (e: any) {
    const msg = e?.message || 'Failed to create product';
    return bad(500, msg);
  }
};
