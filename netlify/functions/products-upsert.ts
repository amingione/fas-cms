import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

const readHeader = (headers: Record<string, string | undefined>, name: string): string => {
  const direct = headers?.[name];
  if (typeof direct === 'string') return direct.trim();
  const lower = headers?.[name.toLowerCase()];
  if (typeof lower === 'string') return lower.trim();
  const upper = headers?.[name.toUpperCase()];
  if (typeof upper === 'string') return upper.trim();
  return '';
};

const readBearer = (value: string): string => value.replace(/^Bearer\s+/i, '').trim();

const isMachineAuthorized = (event: Parameters<Handler>[0]): boolean => {
  const configuredSecrets = [
    process.env.MEDUSA_PRODUCT_SYNC_SECRET,
    process.env.WEBHOOK_FORWARD_SHARED_SECRET
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  if (configuredSecrets.length === 0) return false;

  const headers = event.headers || {};
  const candidates = [
    readHeader(headers, 'x-medusa-sync-secret'),
    readHeader(headers, 'x-fas-forwarded-secret'),
    readBearer(readHeader(headers, 'authorization'))
  ].filter(Boolean);

  return candidates.some((candidate) => configuredSecrets.includes(candidate));
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const derivePrice = (input: any): number | null => {
  const direct = toNumber(input?.price);
  if (direct !== null) return direct;

  const amountCandidates = [
    input?.variant?.calculated_price?.calculated_amount,
    input?.variants?.[0]?.calculated_price?.calculated_amount,
    input?.variant?.prices?.[0]?.amount,
    input?.variants?.[0]?.prices?.[0]?.amount
  ];

  for (const rawAmount of amountCandidates) {
    const amount = toNumber(rawAmount);
    if (amount === null) continue;
    if (amount > 1000) return Number((amount / 100).toFixed(2));
    return amount;
  }

  return null;
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    if (!isMachineAuthorized(event)) {
      await requireUser(event);
    }

    const body = JSON.parse(event.body || '{}');
    const source = body?.product && typeof body.product === 'object' ? body.product : body;
    const {
      _id,
      title,
      sku,
      price: rawPrice,
      featured = false,
      categoryIds = [],
      imageAssetId,
      description,
      shortDescription,
      specifications,
      addOns,
      slug,
      metaTitle,
      metaDescription,
      canonicalUrl,
      noindex,
      draft
    } = source;

    const price = derivePrice(source);
    if (!title || price === null) return { statusCode: 400, body: 'Missing fields' };

    // Prepare reference arrays for both legacy `category` and newer `categories` fields
    const catRefs = (categoryIds as string[]).map((id) => ({ _type: 'reference', _ref: String(id) }));

    // Build base doc
    const base: any = {
      _type: 'product',
      title,
      sku,
      price,
      featured: !!featured,
      categories: catRefs,
      category: catRefs
    };

    // If an image asset is provided, set multiple compatible fields
    if (imageAssetId) {
      const imageRef = { _type: 'image', asset: { _type: 'reference', _ref: imageAssetId } };
      base.image = imageRef; // common single-image field
      base.socialImage = imageRef; // used for social/seo in parts of site
      base.images = [{ ...imageRef }]; // gallery array, first item
    }
    // SEO/meta
    if (typeof metaTitle !== 'undefined') base.metaTitle = metaTitle;
    if (typeof metaDescription !== 'undefined') base.metaDescription = metaDescription;
    if (typeof canonicalUrl !== 'undefined') base.canonicalUrl = canonicalUrl;
    if (typeof noindex !== 'undefined') base.noindex = !!noindex;
    if (typeof draft !== 'undefined') base.draft = !!draft;
    // Slug: if provided, set; else if creating and title present, derive
    const toSlug = (s: string) =>
      s
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    if (slug && typeof slug === 'string') base.slug = { _type: 'slug', current: toSlug(slug) } as any;
    else if (!_id && title) base.slug = { _type: 'slug', current: toSlug(title) } as any;

    // Optional extended fields (only set when provided)
    if (typeof description !== 'undefined') base.description = description;
    if (typeof shortDescription !== 'undefined') base.shortDescription = shortDescription;
    if (Array.isArray(specifications)) base.specifications = specifications;
    if (Array.isArray(addOns)) base.addOns = addOns;

    let result: any;
    if (_id) {
      // For updates, use patch to avoid overwriting unknown fields
      const patch = sanity.patch(_id).set(base);
      // If no categories chosen, ensure both fields are at least empty arrays
      if (!categoryIds || categoryIds.length === 0) patch.set({ categories: [], category: [] });
      result = await patch.commit();
    } else {
      // Create new product
      result = await sanity.create(base);
    }

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
