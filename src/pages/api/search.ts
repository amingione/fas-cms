import type { APIRoute } from 'astro';
import { sanityClient } from '../../lib/sanityClient';
import {
  listStoreProductsForPricing,
  attachMedusaPricingBySanityIdentity,
  resolveProductCalculatedPriceAmount
} from '../../lib/medusa-storefront-pricing';
import { SITE_PAGES } from '../../data/pages-index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SanityProductResult {
  _id: string;
  _type: 'product';
  title: string | null;
  shortDescription: string | null;
  images: { asset?: { url?: string } }[] | null;
  slug: string | null;
  medusaProductId: string | null;
  metadata?: { sanity_id?: string; sanity_slug?: string };
  priceDisplay?: string | null;
  priceKnown?: boolean;
  url: string;
}

interface SanityGenericResult {
  _id: string;
  _type: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  slug: string | null;
  url: string;
}

// ---------------------------------------------------------------------------
// GROQ — products only (published, non-draft, has slug)
// Active guard mirrors sanity-utils ACTIVE_PRODUCT_WITH_SLUG_FILTER
// ---------------------------------------------------------------------------
const PRODUCT_SEARCH_QUERY = /* groq */ `
  *[
    _type == "product" &&
    !(_id in path("drafts.**")) &&
    defined(slug.current) &&
    (status == "active" || contentStatus == "published") &&
    (
      pt::text(title) match $q ||
      pt::text(shortDescription) match $q ||
      slug.current match $q ||
      pt::text(body) match $q
    )
  ][0..19]{
    _id,
    _type,
    "title": coalesce(title, name),
    shortDescription,
    images[0..0]{ asset->{ url } },
    "slug": slug.current,
    medusaProductId,
    "metadata": {
      "sanity_id": _id,
      "sanity_slug": slug.current
    },
    "url": "/shop/" + slug.current
  }
`;

// ---------------------------------------------------------------------------
// GROQ — blog posts
// ---------------------------------------------------------------------------
const BLOG_SEARCH_QUERY = /* groq */ `
  *[
    _type == "blogPost" &&
    !(_id in path("drafts.**")) &&
    defined(slug.current) &&
    (
      title match $q ||
      pt::text(excerpt) match $q ||
      pt::text(body) match $q
    )
  ][0..9]{
    _id,
    _type,
    title,
    "description": pt::text(excerpt),
    "slug": slug.current,
    "url": "/blog/" + slug.current
  }
`;

// ---------------------------------------------------------------------------
// Site-page fuzzy search (static, no I/O)
// ---------------------------------------------------------------------------
function searchStaticPages(query: string): SanityGenericResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return SITE_PAGES
    .map((p, idx) => {
      const hay = [p.title, p.path, ...(p.keywords ?? [])].join(' ').toLowerCase();
      const hits = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      return { page: p, score: hits + (p.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0), idx };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .slice(0, 6)
    .map(({ page }) => ({
      _id: page.path,
      _type: 'page' as const,
      title: page.title,
      description: page.description ?? null,
      slug: page.path.replace(/^\//, ''),
      url: page.path,
    }));
}

// ---------------------------------------------------------------------------
// Pricing merge: attach Medusa calculated price to product results
// ---------------------------------------------------------------------------
async function mergePricing(products: SanityProductResult[]): Promise<SanityProductResult[]> {
  if (!products.length) return products;

  try {
    const medusaProducts = await listStoreProductsForPricing({ limit: 200 });
    const priced = attachMedusaPricingBySanityIdentity(products as any[], medusaProducts);

    return priced.map((p: any) => {
      const amount = resolveProductCalculatedPriceAmount(p);
      const hasMedusaPricing = Boolean(p?.medusa && typeof p.medusa === 'object');
      const priceDisplay = amount != null
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
        : null;
      return { ...p, priceDisplay, priceKnown: hasMedusaPricing };
    });
  } catch {
    // Medusa unavailable — preserve product search, but keep pricing state "unknown"
    // so clients do not render "View for pricing" for priced products.
    return products.map((p) => ({ ...p, priceDisplay: null, priceKnown: false }));
  }
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------
export const GET: APIRoute = async ({ url }) => {
  const rawQ = (url.searchParams.get('q') ?? '').trim();
  if (!rawQ || rawQ.length < 2) {
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Append wildcard so partial-word matches work (e.g. "hell" → "hellcat*")
  const q = `${rawQ}*`;

  try {
    const [rawProducts, rawBlog] = await Promise.all([
      sanityClient.fetch<SanityProductResult[]>(PRODUCT_SEARCH_QUERY, { q }),
      sanityClient.fetch<SanityGenericResult[]>(BLOG_SEARCH_QUERY, { q }),
    ]);

    const [products, pages] = await Promise.all([
      mergePricing(rawProducts),
      Promise.resolve(searchStaticPages(rawQ)),
    ]);

    // Products first, then blog, then static pages
    const results = [...products, ...rawBlog, ...pages];

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/search] error:', message);
    return new Response(JSON.stringify({ error: message, results: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
