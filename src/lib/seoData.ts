import { buildPrimaryKeywordAnchor, collapseLabelSpaces } from './seoAnchors';
import { sanityFetch } from './sanityFetch';

export interface SanitySeoImage {
  asset?: {
    url?: string;
  };
  alt?: string;
}

export interface SanitySeo {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  keywords?: string[];
  noindex?: boolean;
  ogImage?: SanitySeoImage | string;
  jsonLd?: Record<string, unknown>[];
  breadcrumbs?: Array<{ label: string; href?: string }>;
  relatedLinks?: Array<{
    label: string;
    href?: string;
    source?: string;
    docType?: string;
  }>;
}

type SanitySeoQueryResult = Omit<SanitySeo, 'jsonLd' | 'breadcrumbs' | 'relatedLinks'> & {
  jsonLd?: Record<string, unknown>[] | null;
  breadcrumbs?: Array<{ label?: string | null; href?: string | null }> | null;
  relatedSeoLinks?: Array<{ label?: string | null; href?: string | null }> | null;
  relatedPageLinks?: Array<{ label?: string | null; href?: string | null }> | null;
  relatedProductLinks?: Array<{
    label?: string | null;
    href?: string | null;
    primaryKeyword?: string | null;
    seoPrimaryKeyword?: string | null;
    fitment?: string | null;
    seoFitment?: string | null;
    fitmentText?: string | null;
    seoFitmentText?: string | null;
    fitmentYears?: unknown;
    seoFitmentYears?: unknown;
  }> | null;
  relatedArticleLinks?: Array<{ label?: string | null; href?: string | null }> | null;
  relatedServiceLinks?: Array<{ label?: string | null; href?: string | null }> | null;
};

export interface GlobalSeoSettings {
  siteName?: string;
  defaultDescription?: string;
  defaultOgImage?: SanitySeoImage | string;
  defaultKeywords?: string[];
  organizationJsonLd?: Record<string, unknown>;
  globalJsonLd?: Record<string, unknown>[];
}

export interface SeoPayload {
  global: GlobalSeoSettings;
  page: SanitySeo;
}

const FALLBACK_GLOBAL: GlobalSeoSettings = {
  siteName: 'F.A.S. Motorsports',
  defaultDescription:
    'F.A.S. Motorsports delivers premium performance parts, custom fabrication, installs, and wheel packages in Punta Gorda, Florida.',
  defaultOgImage: 'https://fasmotorsports.com/images/social/social-share.webp',
  defaultKeywords: [
    'F.A.S. Motorsports',
    'performance parts',
    'supercharger upgrades',
    'billet parts',
    'custom fabrication',
    'Punta Gorda auto shop',
    'Hellcat performance',
    'Trackhawk upgrades',
    'TRX packages'
  ]
};

const seoCache = new Map<string, Promise<SeoPayload>>();

const normalizeOgImage = (input?: SanitySeoImage | string): string | undefined => {
  if (!input) return undefined;
  if (typeof input === 'string') return input;
  if (typeof input.asset?.url === 'string') return input.asset.url;
  return undefined;
};

const ensureArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeKeywordsArray = (value: unknown): string[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const entries = value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
    return entries.length ? entries : undefined;
  }
  if (typeof value === 'string') {
    const entries = value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    return entries.length ? entries : undefined;
  }
  return undefined;
};

const dedupeByHref = (
  items: Array<{ label?: string | null; href?: string | null }>
): Array<{ label: string; href?: string }> => {
  const seen = new Set<string>();
  const results: Array<{ label: string; href?: string }> = [];
  for (const item of items) {
    const label = (item.label ?? '').trim();
    const href = (item.href ?? undefined) || undefined;
    if (!label) continue;
    const key = `${label.toLowerCase()}::${href ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ label, href });
  }
  return results;
};

interface RawRelatedLink {
  label?: string | null;
  href?: string | null;
  source?: string | null;
  docType?: string | null;
}

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const ROUTE_PREFIX_MATCHERS: Array<{ pattern: RegExp; prefix: string }> = [
  { pattern: /(product|vehicle|inventory)/, prefix: '/shop' },
  { pattern: /(category|collection)/, prefix: '/shop/categories' },
  { pattern: /(article|blog|post|news)/, prefix: '/blog' },
  { pattern: /(service|repair)/, prefix: '/services' }
];

const resolveRoutePrefix = (...identifiers: Array<string | null | undefined>) => {
  for (const identifier of identifiers) {
    const normalized = (identifier ?? '').toLowerCase();
    if (!normalized) continue;
    for (const { pattern, prefix } of ROUTE_PREFIX_MATCHERS) {
      if (pattern.test(normalized)) {
        return prefix;
      }
    }
  }
  return '';
};

const normalizeRelatedLink = (link: RawRelatedLink): { label: string; href?: string } | null => {
  const label = (link.label ?? '').trim();
  if (!label) return null;

  const rawHref = (link.href ?? '').trim();
  if (!rawHref) {
    return { label };
  }

  if (isHttpUrl(rawHref)) {
    return { label, href: rawHref };
  }

  if (rawHref.startsWith('//')) {
    return { label, href: `https:${rawHref}` };
  }

  if (rawHref.startsWith('/')) {
    return { label, href: rawHref };
  }

  const sanitized = rawHref.replace(/^\/+/, '');
  const prefix = resolveRoutePrefix(link.docType, link.source);
  const sanitizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const lowerSanitized = sanitized.toLowerCase();

  if (!sanitized) {
    if (!sanitizedPrefix) return { label, href: '/' };
    return { label, href: `/${sanitizedPrefix}` };
  }

  if (!sanitizedPrefix && lowerSanitized === 'home') {
    return { label, href: '/' };
  }

  if (sanitizedPrefix) {
    const normalizedPrefix = sanitizedPrefix.toLowerCase();
    if (lowerSanitized === normalizedPrefix || lowerSanitized.startsWith(`${normalizedPrefix}/`)) {
      return { label, href: `/${sanitized}` };
    }
  }

  const segments = [sanitizedPrefix, sanitized].filter(Boolean);
  return { label, href: `/${segments.join('/')}` };
};

export async function fetchSeoForPath(
  pathname: string,
  options: { preview?: boolean; token?: string } = {}
): Promise<SeoPayload> {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  const fetcher = async () => {
    const queryOptions = {
      perspective: options.preview ? ('drafts' as const) : ('published' as const),
      token: options.token,
      useCdn: !options.preview,
      stega: options.preview,
      tag: 'seo.fetchSeoForPath'
    };

    const data = await sanityFetch<{
      globalSettings?: GlobalSeoSettings | null;
      page?: SanitySeoQueryResult | null;
    }>(
      {
        query: `{
  "globalSettings": *[_type == "globalSeoSettings"][0]{
    siteName,
    defaultDescription,
    defaultOgImage,
    defaultKeywords,
    organizationJsonLd,
    globalJsonLd
  },
  "page": *[
    (defined(seo.slug.current) && seo.slug.current == $slug) ||
    (defined(slug.current) && slug.current == $slug) ||
    ($slug == 'home' && defined(slug.current) && slug.current == 'home')
  ][0]{
    "title": coalesce(seo.title, title),
    "description": coalesce(seo.description, description),
    "canonicalUrl": select(
      defined(seo.canonicalUrl) => seo.canonicalUrl,
      defined(canonicalUrl) => canonicalUrl,
      defined(slug.current) => slug.current
    ),
    "keywords": coalesce(seo.keywords, keywords),
    "noindex": coalesce(seo.noindex, false),
    "ogImage": coalesce(seo.ogImage, seo.openGraphImage),
    "jsonLd": coalesce(seo.jsonLd[], []),
    "breadcrumbs": coalesce(seo.breadcrumbs[], []),
    "relatedLinks": array::compact(
      coalesce(
        seo.relatedLinks[]->{
          "label": coalesce(title, name, label),
          "href": coalesce(slug.current, href, url),
          "source": "seo",
          "docType": _type
        },
        []
      ) +
      coalesce(
        relatedPages[]->{
          "label": coalesce(title, name, label),
          "href": coalesce(slug.current, href, url),
          "source": "page",
          "docType": _type
        },
        []
      ) +
      coalesce(
        relatedProducts[]->{
          "label": coalesce(title, name, label),
          "href": coalesce(slug.current, href, url),
          "source": "product",
          "docType": _type
        },
        []
      ) +
      coalesce(
        relatedArticles[]->{
          "label": coalesce(title, name, label),
          "href": coalesce(slug.current, href, url),
          "source": "article",
          "docType": _type
        },
        []
      ) +
      coalesce(
        relatedServices[]->{
          "label": coalesce(title, name, label),
          "href": coalesce(slug.current, href, url),
          "source": "service",
          "docType": _type
        },
        []
      )
    )
  }
}`,
        params: {
          slug: normalized === '/' ? 'home' : normalized.replace(/^\//, '')
        }
      },
      queryOptions
    ).catch((error) => {
      console.error('[seo] Failed to fetch SEO data', error);
      return { globalSettings: undefined, page: undefined };
    });

    const globalSettings = data?.globalSettings ?? FALLBACK_GLOBAL;
    const pageSeo = data?.page ?? {};
    const {
      relatedSeoLinks,
      relatedPageLinks,
      relatedProductLinks,
      relatedArticleLinks,
      relatedServiceLinks,
      breadcrumbs,
      jsonLd,
      ...pageSeoRest
    } = pageSeo;

    const normalizeSimpleLink = (
      entry: { label?: string | null; href?: string | null } | null | undefined
    ) => {
      if (!entry) return null;
      const label = collapseLabelSpaces(String(entry.label ?? '')).trim();
      if (!label) return null;
      const href = entry.href ?? undefined;
      return { label, href };
    };

    const normalizeProductLink = (
      entry:
        | ({
            label?: string | null;
            href?: string | null;
            primaryKeyword?: string | null;
            seoPrimaryKeyword?: string | null;
            fitment?: string | null;
            seoFitment?: string | null;
            fitmentText?: string | null;
            seoFitmentText?: string | null;
            fitmentYears?: unknown;
            seoFitmentYears?: unknown;
          } | null)
        | undefined
    ) => {
      if (!entry) return null;
      const computedLabel = buildPrimaryKeywordAnchor(
        {
          primaryKeyword: entry.primaryKeyword ?? undefined,
          seoPrimaryKeyword: entry.seoPrimaryKeyword ?? undefined,
          fitment: entry.fitment ?? undefined,
          seoFitment: entry.seoFitment ?? undefined,
          fitmentText: entry.fitmentText ?? undefined,
          seoFitmentText: entry.seoFitmentText ?? undefined,
          fitmentYears: entry.fitmentYears,
          seoFitmentYears: entry.seoFitmentYears,
          fallbackLabel: entry.label ?? undefined
        },
        entry.label ?? undefined
      );
      const label = collapseLabelSpaces(computedLabel ?? String(entry.label ?? '')).trim();
      if (!label) return null;
      const href = entry.href ?? undefined;
      return { label, href };
    };

    const normalizedBreadcrumbs = dedupeByHref(ensureArray(breadcrumbs));
    const normalizedLinks = dedupeByHref([
      ...ensureArray(relatedSeoLinks).map(normalizeSimpleLink).filter(Boolean),
      ...ensureArray(relatedPageLinks).map(normalizeSimpleLink).filter(Boolean),
      ...ensureArray(relatedProductLinks).map(normalizeProductLink).filter(Boolean),
      ...ensureArray(relatedArticleLinks).map(normalizeSimpleLink).filter(Boolean),
      ...ensureArray(relatedServiceLinks).map(normalizeSimpleLink).filter(Boolean)
    ] as Array<{ label: string; href?: string }>);
    const globalKeywords = normalizeKeywordsArray(globalSettings?.defaultKeywords);
    const pageKeywords = normalizeKeywordsArray((pageSeoRest as { keywords?: unknown }).keywords);

    return {
      global: {
        ...FALLBACK_GLOBAL,
        ...globalSettings,
        defaultOgImage:
          normalizeOgImage(globalSettings?.defaultOgImage) ?? FALLBACK_GLOBAL.defaultOgImage,
        defaultKeywords: globalKeywords ?? FALLBACK_GLOBAL.defaultKeywords
      },
      page: {
        ...pageSeoRest,
        jsonLd: ensureArray(jsonLd),
        ogImage: normalizeOgImage(pageSeoRest.ogImage),
        breadcrumbs: normalizedBreadcrumbs,
        relatedLinks: normalizedLinks,
        keywords: pageKeywords ?? pageSeoRest.keywords
      }
    } satisfies SeoPayload;
  };

  if (options.preview) {
    return fetcher();
  }

  if (!seoCache.has(normalized)) {
    seoCache.set(normalized, fetcher());
  }
  return seoCache.get(normalized)!;
}

export const buildMetaEntries = (payload: SeoPayload, canonicalUrl?: string) => {
  const { global, page } = payload;
  const description =
    page.description || global.defaultDescription || FALLBACK_GLOBAL.defaultDescription || '';
  const ogImage =
    (page.ogImage as string | undefined) ||
    (global.defaultOgImage as string | undefined) ||
    undefined;
  const keywords =
    (page.keywords && page.keywords.length > 0 ? page.keywords : global.defaultKeywords) ??
    FALLBACK_GLOBAL.defaultKeywords ??
    [];

  const title =
    page.title && global.siteName && !page.title.includes(global.siteName)
      ? `${page.title} | ${global.siteName}`
      : page.title || global.siteName || FALLBACK_GLOBAL.siteName!;

  const robots = page.noindex ? 'noindex,follow' : 'index,follow';

  const meta: Array<{ name?: string; property?: string; content: string }> = [
    { name: 'description', content: description },
    { name: 'keywords', content: keywords.join(', ') },
    { name: 'robots', content: robots },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' }
  ];

  if (ogImage) {
    meta.push({ property: 'og:image', content: ogImage });
  }

  if (canonicalUrl) {
    meta.push({ property: 'og:url', content: canonicalUrl });
  }

  return { title, description, meta };
};

export const buildJsonLd = (payload: SeoPayload, breadcrumbStructuredData?: any) => {
  const scripts: Record<string, unknown>[] = [];
  const globalJson = ensureArray(payload.global.globalJsonLd);
  const pageJson = ensureArray(payload.page.jsonLd);

  if (payload.global.organizationJsonLd) {
    scripts.push(payload.global.organizationJsonLd);
  }

  scripts.push(...globalJson, ...pageJson);

  if (breadcrumbStructuredData) {
    scripts.push(breadcrumbStructuredData);
  }

  return scripts;
};
