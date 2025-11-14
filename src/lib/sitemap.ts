import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { sanity } from './sanity-utils';

const FALLBACK_SITE_URL = 'https://www.fasmotorsports.com';

type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: ChangeFreq;
  priority?: number;
}

export interface SitemapIndexEntry {
  loc: string;
  lastmod?: string;
}

interface StaticPageConfig {
  pathname: string;
  source?: string;
  changefreq?: ChangeFreq;
  priority?: number;
}

interface SanitySlugDoc {
  slug: string;
  updatedAt?: string;
}

const STATIC_PAGES: StaticPageConfig[] = [
  { pathname: '/', source: '../pages/index.astro', priority: 1, changefreq: 'weekly' },
  { pathname: '/about', source: '../pages/about.astro', changefreq: 'monthly', priority: 0.8 },
  { pathname: '/contact', source: '../pages/contact.astro', changefreq: 'monthly', priority: 0.7 },
  { pathname: '/faq', source: '../pages/faq.astro', changefreq: 'monthly', priority: 0.6 },
  { pathname: '/faq2', source: '../pages/faq2.astro', changefreq: 'monthly', priority: 0.4 },
  {
    pathname: '/schedule',
    source: '../pages/schedule.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/customBuild',
    source: '../pages/customBuild.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  { pathname: '/search', source: '../pages/search.astro', changefreq: 'weekly', priority: 0.6 },
  {
    pathname: '/packages',
    source: '../pages/packages/index.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/packages/powerPackages',
    source: '../pages/packages/powerPackages.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/packages/truckPackages',
    source: '../pages/packages/truckPackages.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/services/overview',
    source: '../pages/services/overview.astro',
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    pathname: '/services/coreExchange',
    source: '../pages/services/coreExchange.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/services/customFab',
    source: '../pages/services/customFab.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/services/igla',
    source: '../pages/services/igla.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/services/porting',
    source: '../pages/services/porting.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/services/welding',
    source: '../pages/services/welding.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/belak/wheels',
    source: '../pages/belak/wheels.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/belak/series2',
    source: '../pages/belak/series2.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/belak/series3',
    source: '../pages/belak/series3.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/belak/skinnies',
    source: '../pages/belak/skinnies.astro',
    changefreq: 'monthly',
    priority: 0.5
  },
  {
    pathname: '/belak/thanks',
    source: '../pages/belak/thanks.astro',
    changefreq: 'monthly',
    priority: 0.3
  },
  {
    pathname: '/jtx/wheels',
    source: '../pages/jtx/wheels.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/jtx/retro',
    source: '../pages/jtx/retro.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/jtx/monoforged',
    source: '../pages/jtx/monoforged.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/jtx/concave',
    source: '../pages/jtx/concave.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  { pathname: '/jtx/arc', source: '../pages/jtx/arc.astro', changefreq: 'monthly', priority: 0.6 },
  {
    pathname: '/jtx/two-piece',
    source: '../pages/jtx/two-piece.astro',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    pathname: '/jtx/thanks',
    source: '../pages/jtx/thanks.astro',
    changefreq: 'monthly',
    priority: 0.3
  },
  {
    pathname: '/jtx/beadlock',
    source: '../pages/jtx/beadlock.astro',
    changefreq: 'monthly',
    priority: 0.5
  },
  {
    pathname: '/jtx/rock-ring',
    source: '../pages/jtx/rock-ring.astro',
    changefreq: 'monthly',
    priority: 0.5
  },
  {
    pathname: '/jtx/phantom',
    source: '../pages/jtx/phantom.astro',
    changefreq: 'monthly',
    priority: 0.5
  },
  { pathname: '/jtx/utv', source: '../pages/jtx/utv.astro', changefreq: 'monthly', priority: 0.5 },
  {
    pathname: '/jtx/dually',
    source: '../pages/jtx/dually.astro',
    changefreq: 'monthly',
    priority: 0.5
  },
  {
    pathname: '/specs/billet-snouts',
    source: '../pages/specs/billet-snouts.astro',
    changefreq: 'yearly',
    priority: 0.5
  },
  {
    pathname: '/specs/BilletSnout',
    source: '../pages/specs/BilletSnout.astro',
    changefreq: 'yearly',
    priority: 0.5
  },
  {
    pathname: '/specs/PulleyHub',
    source: '../pages/specs/PulleyHub.astro',
    changefreq: 'yearly',
    priority: 0.5
  },
  {
    pathname: '/specs/BilletLid',
    source: '../pages/specs/BilletLid.astro',
    changefreq: 'yearly',
    priority: 0.5
  },
  {
    pathname: '/specs/PredatorPulley',
    source: '../pages/specs/PredatorPulley.astro',
    changefreq: 'yearly',
    priority: 0.5
  },
  {
    pathname: '/specs/BilletThrottleBody108',
    source: '../pages/specs/BilletThrottleBody108.astro',
    changefreq: 'yearly',
    priority: 0.5
  },
  {
    pathname: '/specs/BilletBearingPlate',
    source: '../pages/specs/BilletBearingPlate.astro',
    changefreq: 'yearly',
    priority: 0.5
  },
  {
    pathname: '/privacypolicy',
    source: '../pages/privacypolicy.astro',
    changefreq: 'yearly',
    priority: 0.3
  },
  {
    pathname: '/termsandconditions',
    source: '../pages/termsandconditions.astro',
    changefreq: 'yearly',
    priority: 0.3
  },
  {
    pathname: '/returnRefundPolicy',
    source: '../pages/returnRefundPolicy.astro',
    changefreq: 'yearly',
    priority: 0.3
  },
  { pathname: '/warranty', source: '../pages/warranty.astro', changefreq: 'yearly', priority: 0.4 }
];

const SHOP_STATIC_PAGES: StaticPageConfig[] = [
  { pathname: '/shop', source: '../pages/shop/index.astro', changefreq: 'daily', priority: 0.9 },
  {
    pathname: '/shop/storefront',
    source: '../pages/shop/storefront.astro',
    changefreq: 'daily',
    priority: 0.8
  },
  {
    pathname: '/shop/categories',
    source: '../pages/shop/categories.astro',
    changefreq: 'weekly',
    priority: 0.7
  }
];

function normalisePath(pathname: string): string {
  if (!pathname.startsWith('/')) return `/${pathname}`;
  return pathname;
}

function stripMilliseconds(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError('Invalid date');
  }
  const iso = date.toISOString();
  return iso.replace(/\.\d{3}Z$/, 'Z');
}

export function getSiteBaseUrl(): string {
  const envUrl =
    (import.meta.env?.PUBLIC_SITE_URL as string | undefined) ||
    (import.meta.env?.PUBLIC_BASE_URL as string | undefined) ||
    FALLBACK_SITE_URL;
  try {
    const url = new URL(envUrl);
    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function toAbsoluteUrl(pathname: string): string {
  if (!pathname) return getSiteBaseUrl();
  if (/^https?:/i.test(pathname)) return pathname;
  const base = getSiteBaseUrl();
  return new URL(normalisePath(pathname), base).toString();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function getLastModifiedFromSource(source?: string): Promise<string | undefined> {
  if (!source) return undefined;
  try {
    const filePath = fileURLToPath(new URL(source, import.meta.url));
    const stats = await stat(filePath);
    return stripMilliseconds(stats.mtime);
  } catch (err) {
    console.warn(`[sitemap] Unable to stat ${source}:`, err instanceof Error ? err.message : err);
    return undefined;
  }
}

function mapStaticConfigToUrls(configs: StaticPageConfig[]): Promise<SitemapUrlEntry[]> {
  return Promise.all(
    configs.map(async ({ pathname, source, changefreq, priority }) => ({
      loc: toAbsoluteUrl(pathname),
      changefreq,
      priority,
      lastmod: await getLastModifiedFromSource(source)
    }))
  );
}

export async function getStaticUrlEntries(): Promise<SitemapUrlEntry[]> {
  return mapStaticConfigToUrls(STATIC_PAGES);
}

export async function getShopStaticEntries(): Promise<SitemapUrlEntry[]> {
  return mapStaticConfigToUrls(SHOP_STATIC_PAGES);
}

async function fetchSanitySlugs(query: string): Promise<SanitySlugDoc[]> {
  if (!sanity) return [];
  try {
    const results = await sanity.fetch<SanitySlugDoc[]>(query);
    return (results ?? []).filter((item) => typeof item?.slug === 'string');
  } catch (err) {
    console.error('[sitemap] Failed to fetch Sanity slugs:', err);
    return [];
  }
}

export async function getProductEntries(): Promise<SitemapUrlEntry[]> {
  const query = `*[_type == "product" && !(_id in path('drafts.**')) && lower(coalesce(status, "active")) == "active" && defined(slug.current) && coalesce(noindex, false) != true]{
    "slug": slug.current,
    "updatedAt": coalesce(_updatedAt, _createdAt)
  }`;
  const docs = await fetchSanitySlugs(query);
  return docs.map(({ slug, updatedAt }) => {
    const lastmodDate = updatedAt ? new Date(updatedAt) : undefined;
    const lastmod =
      lastmodDate && Number.isFinite(lastmodDate.getTime())
        ? stripMilliseconds(lastmodDate)
        : undefined;
    return {
      loc: toAbsoluteUrl(`/shop/${slug}`),
      lastmod,
      changefreq: 'weekly',
      priority: 0.8
    };
  });
}

export async function getCategoryEntries(): Promise<SitemapUrlEntry[]> {
  const query = `*[_type == "category" && !(_id in path('drafts.**')) && defined(slug.current)]{
    "slug": slug.current,
    "updatedAt": coalesce(_updatedAt, _createdAt)
  }`;
  const docs = await fetchSanitySlugs(query);
  return docs.map(({ slug, updatedAt }) => {
    const lastmodDate = updatedAt ? new Date(updatedAt) : undefined;
    const lastmod =
      lastmodDate && Number.isFinite(lastmodDate.getTime())
        ? stripMilliseconds(lastmodDate)
        : undefined;
    return {
      loc: toAbsoluteUrl(`/shop/categories/${slug}`),
      lastmod,
      changefreq: 'weekly',
      priority: 0.7
    };
  });
}

export function generateUrlsetXml(urls: SitemapUrlEntry[]): string {
  const items = urls
    .map((url) => {
      const parts = [`    <loc>${escapeXml(url.loc)}</loc>`];
      if (url.lastmod) parts.push(`    <lastmod>${escapeXml(url.lastmod)}</lastmod>`);
      if (url.changefreq) parts.push(`    <changefreq>${url.changefreq}</changefreq>`);
      if (typeof url.priority === 'number') {
        const priority = Math.max(0, Math.min(1, url.priority));
        parts.push(`    <priority>${priority.toFixed(1)}</priority>`);
      }
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

export function generateSitemapIndexXml(sitemaps: SitemapIndexEntry[]): string {
  const items = sitemaps
    .map((sitemap) => {
      const parts = [`    <loc>${escapeXml(sitemap.loc)}</loc>`];
      if (sitemap.lastmod) parts.push(`    <lastmod>${escapeXml(sitemap.lastmod)}</lastmod>`);
      return `  <sitemap>\n${parts.join('\n')}\n  </sitemap>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

export function getMostRecentLastmod(entries: SitemapUrlEntry[]): string | undefined {
  const timestamps = entries
    .map((entry) => (entry.lastmod ? Date.parse(entry.lastmod) : undefined))
    .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (!timestamps.length) return undefined;
  return stripMilliseconds(new Date(Math.max(...timestamps)));
}

export async function getShopUrlEntries(): Promise<SitemapUrlEntry[]> {
  const [staticEntries, categoryEntries, productEntries] = await Promise.all([
    getShopStaticEntries(),
    getCategoryEntries(),
    getProductEntries()
  ]);
  return [...staticEntries, ...categoryEntries, ...productEntries];
}

export async function getFullSitemapEntries(): Promise<SitemapUrlEntry[]> {
  const [staticEntries, shopEntries] = await Promise.all([
    getStaticUrlEntries(),
    getShopUrlEntries()
  ]);
  return [...staticEntries, ...shopEntries];
}
