import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    await requireUser(event);
    const body = JSON.parse(event.body || '{}');
    const {
      _id,
      title,
      sku,
      price,
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
    } = body;
    if (!title || typeof price !== 'number') return { statusCode: 400, body: 'Missing fields' };

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
    // Optional extended fields (only set when provided)
    if (typeof description !== 'undefined') base.description = description;
    if (typeof shortDescription !== 'undefined') base.shortDescription = shortDescription;
    if (Array.isArray(specifications)) base.specifications = specifications;
    if (Array.isArray(addOns)) base.addOns = addOns;
