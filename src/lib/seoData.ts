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
  }>;
}

type SanitySeoQueryResult = Omit<SanitySeo, 'jsonLd' | 'breadcrumbs' | 'relatedLinks'> & {
  jsonLd?: Record<string, unknown>[] | null;
  breadcrumbs?: Array<{ label?: string | null; href?: string | null }> | null;
  relatedSeoLinks?: Array<{ label?: string | null; href?: string | null }> | null;
  relatedPageLinks?: Array<{ label?: string | null; href?: string | null }> | null;
  relatedProductLinks?:
    | Array<{
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
      }>
    | null;
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
    'F.A.S. Motorsports delivers premium performance parts, custom fabrication, installs, and wheel packages in Fort Myers, Florida.',
  defaultOgImage: 'https://fasmotorsports.com/images/social/social-share.webp',
  defaultKeywords: [
    'F.A.S. Motorsports',
    'performance parts',
    'supercharger upgrades',
    'billet parts',
    'custom fabrication',
    'Fort Myers auto shop',
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
  items: Array<{label?: string | null; href?: string | null}>,
): Array<{label: string; href?: string}> => {
  const seen = new Set<string>();
  const results: Array<{label: string; href?: string}> = [];
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

type FetchSeoOptions = {
  preview?: boolean;
  token?: string;
};

export async function fetchSeoForPath(
  pathname: string,
  options: FetchSeoOptions = {},
): Promise<SeoPayload> {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  const fetcher = async () => {
    const queryOptions = {
      perspective: options.preview ? ('drafts' as const) : ('published' as const),
      token: options.token,
      useCdn: !options.preview,
      stega: options.preview,
      tag: 'seo.fetchSeoForPath',
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
    "relatedSeoLinks": coalesce(seo.relatedLinks[]->{"label": title, "href": slug.current}, []),
    "relatedPageLinks": coalesce(relatedPages[]->{"label": title, "href": slug.current}, []),
    "relatedProductLinks": coalesce(relatedProducts[]->{
      "label": title,
      "href": slug.current,
      "primaryKeyword": primaryKeyword,
      "seoPrimaryKeyword": coalesce(seo.primaryKeyword, seo.keyphrase, seo.keyword, seo.targetKeyword),
      "fitment": fitment,
      "seoFitment": coalesce(seo.fitment, seo.fitmentText),
      "fitmentText": fitment,
      "seoFitmentText": coalesce(seo.fitmentText, seo.fitment),
      "fitmentYears": fitmentYears,
      "seoFitmentYears": seo.fitmentYears
    }, []),
    "relatedArticleLinks": coalesce(relatedArticles[]->{"label": title, "href": slug.current}, []),
    "relatedServiceLinks": coalesce(relatedServices[]->{"label": title, "href": slug.current}, [])
  }
}`,
        params: {
          slug: normalized === '/' ? 'home' : normalized.replace(/^\//, ''),
        },
      },
      queryOptions,
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
          }
          | null)
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
    const pageKeywords = normalizeKeywordsArray(pageSeoRest.keywords);

    return {
      global: {
        ...FALLBACK_GLOBAL,
        ...globalSettings,
        defaultOgImage: normalizeOgImage(globalSettings?.defaultOgImage) ?? FALLBACK_GLOBAL.defaultOgImage,
        defaultKeywords: globalKeywords ?? FALLBACK_GLOBAL.defaultKeywords,
      },
      page: {
        ...pageSeoRest,
        jsonLd: ensureArray(jsonLd),
        ogImage: normalizeOgImage(pageSeoRest.ogImage),
        breadcrumbs: normalizedBreadcrumbs,
        relatedLinks: normalizedLinks,
        keywords: pageKeywords ?? pageSeoRest.keywords,
      },
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
    page.description ||
    global.defaultDescription ||
    FALLBACK_GLOBAL.defaultDescription ||
    '';
  const ogImage =
    (page.ogImage as string | undefined) ||
    (global.defaultOgImage as string | undefined) ||
    undefined;
  const keywords = (page.keywords && page.keywords.length > 0
    ? page.keywords
    : global.defaultKeywords) ?? FALLBACK_GLOBAL.defaultKeywords ?? [];

  const title = page.title && global.siteName && !page.title.includes(global.siteName)
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
