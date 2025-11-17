const FALLBACK_SITE_URL = 'https://www.fasmotorsports.com/';
const FALLBACK_IMAGE_URL = `${FALLBACK_SITE_URL}images/social/social-share.webp`;
const FALLBACK_LOGO_URL = `${FALLBACK_SITE_URL}logo/faslogochroma.webp`;
const FALLBACK_DESCRIPTION =
  'F.A.S. Motorsports delivers billet upgrades, fabrication, installs, and premium performance packages from Fort Myers, Florida.';
const DEFAULT_EMAIL = 'sales@fasmotorsports.com';
const DEFAULT_PHONE = '+1-812-200-9012';

const BUSINESS_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: '6161 Riverside Dr',
  addressLocality: 'Fort Myers',
  addressRegion: 'FL',
  postalCode: '33982',
  addressCountry: 'US'
};

const DEFAULT_SAME_AS = [
  'https://www.facebook.com/fasmotorsports',
  'https://www.instagram.com/fasmotorsports'
];

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

const normalizeSiteUrl = (siteUrl?: string, canonicalUrl?: string) => {
  const candidates = [siteUrl, canonicalUrl];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate, FALLBACK_SITE_URL);
      parsed.pathname = '/';
      parsed.search = '';
      parsed.hash = '';
      return ensureTrailingSlash(parsed.toString());
    } catch {
      /* noop */
    }
  }
  return FALLBACK_SITE_URL;
};

const normalizeAbsoluteUrl = (value?: string, base?: string) => {
  if (!value) return undefined;
  try {
    const parsed = new URL(value, base ?? FALLBACK_SITE_URL);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return undefined;
  }
};

const normalizePageUrl = (value?: string, siteUrl?: string) => {
  if (value) {
    try {
      const parsed = new URL(value, siteUrl ?? FALLBACK_SITE_URL);
      parsed.hash = '';
      return parsed.toString();
    } catch {
      /* noop */
    }
  }
  return siteUrl ?? FALLBACK_SITE_URL;
};

const dedupeStrings = (values: Array<string | undefined>) => {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const entry of values) {
    if (!entry) continue;
    const normalized = entry.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    results.push(normalized);
  }
  return results;
};

export type BreadcrumbEntry = { label: string; href?: string };

export interface BuildDefaultJsonLdGraphOptions {
  siteName: string;
  siteUrl?: string;
  canonicalUrl?: string;
  pageTitle?: string;
  description?: string;
  breadcrumbs?: BreadcrumbEntry[];
  imageUrl?: string;
}

export const buildDefaultJsonLdGraph = ({
  siteName,
  siteUrl,
  canonicalUrl,
  pageTitle,
  description,
  breadcrumbs,
  imageUrl
}: BuildDefaultJsonLdGraphOptions) => {
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl, canonicalUrl);
  const normalizedPageUrl = normalizePageUrl(canonicalUrl, normalizedSiteUrl);
  const resolvedImage = normalizeAbsoluteUrl(imageUrl, normalizedSiteUrl) ?? FALLBACK_IMAGE_URL;
  const resolvedLogo = normalizeAbsoluteUrl('/logo/faslogochroma.webp', normalizedSiteUrl) ?? FALLBACK_LOGO_URL;
  const resolvedTitle = pageTitle?.trim() || siteName;
  const resolvedDescription = description?.trim() || FALLBACK_DESCRIPTION;

  const orgId = `${normalizedSiteUrl}#organization`;
  const websiteId = `${normalizedSiteUrl}#website`;
  const localBusinessId = `${normalizedSiteUrl}#localbusiness`;
  const breadcrumbId = `${normalizedPageUrl}#breadcrumb`;
  const webPageId = `${normalizedPageUrl}#webpage`;

  const breadcrumbItems = (breadcrumbs ?? [])
    .map((crumb, index) => {
      if (!crumb || typeof crumb.label !== 'string') return null;
      const name = crumb.label.trim();
      if (!name) return null;
      const entry: Record<string, unknown> = {
        '@type': 'ListItem',
        position: index + 1,
        name
      };
      const absolute = normalizeAbsoluteUrl(crumb.href, normalizedSiteUrl);
      if (absolute) {
        entry.item = absolute;
      }
      return entry;
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      '@id': orgId,
      name: siteName,
      url: normalizedSiteUrl,
      logo: {
        '@type': 'ImageObject',
        url: resolvedLogo
      },
      image: resolvedImage,
      sameAs: dedupeStrings(DEFAULT_SAME_AS),
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'Sales',
          email: DEFAULT_EMAIL,
          telephone: DEFAULT_PHONE,
          areaServed: 'US',
          availableLanguage: ['English']
        }
      ]
    },
    {
      '@type': 'AutoRepair',
      '@id': localBusinessId,
      name: siteName,
      url: normalizedSiteUrl,
      image: resolvedImage,
      telephone: DEFAULT_PHONE,
      email: DEFAULT_EMAIL,
      priceRange: '$$',
      address: BUSINESS_ADDRESS,
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '17:00'
        }
      ],
      parentOrganization: {
        '@id': orgId
      }
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: normalizedSiteUrl,
      name: siteName,
      description: resolvedDescription,
      inLanguage: 'en-US',
      publisher: {
        '@id': orgId
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${normalizedSiteUrl}search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    },
    {
      '@type': 'WebPage',
      '@id': webPageId,
      url: normalizedPageUrl,
      name: resolvedTitle,
      description: resolvedDescription,
      inLanguage: 'en-US',
      isPartOf: {
        '@id': websiteId
      },
      about: {
        '@id': localBusinessId
      },
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: resolvedImage
      },
      publisher: {
        '@id': orgId
      }
    }
  ];

  if (breadcrumbItems.length > 0) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: breadcrumbItems
    });
    const webPage = graph.find(
      (entry) => typeof entry['@id'] === 'string' && entry['@id'] === webPageId
    );
    if (webPage) {
      (webPage as Record<string, unknown>).breadcrumb = { '@id': breadcrumbId };
    }
  }

  return [
    {
      '@context': 'https://schema.org',
      '@graph': graph
    }
  ];
};
