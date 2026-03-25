import { stat } from 'node:fs/promises';
import { sanity } from './sanity-utils';

const FALLBACK_SITE_URL = 'https://fasmotorsports.com';
const PRODUCT_SITEMAP_CHUNK_SIZE = 5000;

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

export interface SitemapImageAsset {
  loc: string;
  title?: string;
}

export interface SitemapImageEntry {
  loc: string;
  lastmod?: string;
  images: SitemapImageAsset[];
}

interface RouteFileEntry {
  pathname: string;
  sourceFile: string;
}

interface SanitySlugDoc {
  slug: string;
  updatedAt?: string;
}

interface SanityImageDoc extends SanitySlugDoc {
  imageUrl?: string;
  title?: string;
}

const EXCLUDED_ROUTES = new Set<string>([
  '/_app',
  '/cart',
  '/checkout',
  '/sitemap',
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/sitemap-static.xml',
  '/sitemap-shop.xml',
  '/sitemap-core.xml',
  '/sitemap-services.xml',
  '/sitemap-platforms.xml',
  '/sitemap-packages.xml',
  '/sitemap-shop-categories.xml',
  '/sitemap-shop-products.xml',
  '/sitemap-blog.xml',
  '/sitemap-vendors.xml',
  '/sitemap-images.xml'
]);

const EXCLUDED_PREFIXES = [
  '/api/',
  '/account/',
  '/admin/',
  '/appointments/',
  '/customerdashboard/',
  '/dashboard/',
  '/fonts/',
  '/order/',
  '/orders/',
  '/vendor-portal/'
];

const CORE_ROUTE_CANDIDATES = new Set<string>([
  '/',
  '/about',
  '/contact',
  '/faq',
  '/schedule',
  '/wheels',
  '/privacypolicy',
  '/termsandconditions',
  '/returnRefundPolicy',
  '/internalPolicy',
  '/hellcat-supercharger'
]);

const PLATFORM_ROUTE_PREFIXES = [
  '/builds',
  '/hellcat-performance',
  '/trackhawk-performance',
  '/trx-performance',
  '/dodge-demon-performance',
  '/powerstroke-diesel-performance',
  '/ford-raptor-performance'
];

function normalisePath(pathname: string): string {
  if (!pathname.startsWith('/')) return `/${pathname}`;
  return pathname;
}

function stripMilliseconds(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError('Invalid date');
  }
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function getSiteBaseUrl(): string {
  return FALLBACK_SITE_URL;
}

export function toAbsoluteUrl(pathname: string): string {
  if (!pathname) return getSiteBaseUrl();
  if (/^https?:/i.test(pathname)) return pathname;
  return new URL(normalisePath(pathname), getSiteBaseUrl()).toString();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isExcluded(pathname: string): boolean {
  if (EXCLUDED_ROUTES.has(pathname)) return true;
  return EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Static route manifest — replaces filesystem-based discovery.
// import.meta.url in a bundled Netlify function resolves to the compiled output path,
// not src/; readdir on ../pages finds nothing. Maintain this list when adding pages.
const KNOWN_PUBLIC_ROUTES: RouteFileEntry[] = [
  // Root & core
  '/',
  '/about',
  '/become-a-vendor',
  '/contact',
  '/contact/success',
  '/faq',
  '/faq2',
  '/hellcat-supercharger',
  '/internalPolicy',
  '/press-media',
  '/privacypolicy',
  '/resources/employee-sms-consent',
  '/returnRefundPolicy',
  '/schedule',
  '/search',
  '/termsandconditions',
  '/warranty',
  '/wheels',
  // Seasonal / sales
  '/blackFridaySale',
  '/sales/cyberMonday',
  // Wheel brand pages
  '/belak/series2',
  '/belak/series3',
  '/belak/skinnies',
  '/belak/thanks',
  '/belak/wheels',
  '/jtx/arc',
  '/jtx/beadlock',
  '/jtx/concave',
  '/jtx/dually',
  '/jtx/monoforged',
  '/jtx/phantom',
  '/jtx/retro',
  '/jtx/rock-ring',
  '/jtx/single',
  '/jtx/thanks',
  '/jtx/two-piece',
  '/jtx/utv',
  '/jtx/wheels',
  // Builds / platforms
  '/builds',
  '/builds/challenger',
  '/builds/f150',
  '/builds/mustang',
  '/builds/trackhawk',
  '/builds/trx',
  // Packages
  '/packages',
  '/packages/fas-1x',
  '/packages/fas-2x',
  '/packages/fas500',
  '/packages/fas800',
  '/packages/fas850',
  '/packages/fas900',
  '/packages/fas1000',
  '/packages/powerPackages',
  '/packages/truckPackages',
  // Services
  '/services/overview',
  '/services/coreExchange',
  '/services/customFab',
  '/services/customFab/inquiry',
  '/services/igla',
  '/services/porting',
  '/services/welding',
  // Shop static
  '/shop',
  '/shop/categories',
  '/shop/performance-packages',
  '/shop/performance-packages/performanceSection',
  '/shop/storefront',
  // Specs
  '/specs/BilletBearingPlate',
  '/specs/BilletLid',
  '/specs/BilletSnout',
  '/specs/BilletThrottleBody108',
  '/specs/PredatorPulley',
  '/specs/PulleyHub',
  '/specs/billet-snouts',
  // Vendors index (slug pages come from Sanity)
  '/vendors',
  // Blog index (slug pages come from Sanity)
  '/blog',
].map((pathname) => ({ pathname, sourceFile: '' }));

function pathFromLoc(loc: string): string {
  try {
    return new URL(loc).pathname;
  } catch {
    return loc;
  }
}

function splitIntoChunks<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function discoverPublicRouteFiles(): Promise<RouteFileEntry[]> {
  return Promise.resolve(KNOWN_PUBLIC_ROUTES.filter(({ pathname }) => !isExcluded(pathname)));
}

function inferChangefreq(pathname: string): ChangeFreq {
  if (pathname === '/') return 'weekly';
  if (pathname.startsWith('/shop')) return 'daily';
  if (pathname.startsWith('/blog')) return 'weekly';
  if (pathname.startsWith('/services')) return 'monthly';
  if (pathname.startsWith('/specs')) return 'yearly';
  if (
    pathname.endsWith('/thanks') ||
    pathname.endsWith('/success') ||
    pathname === '/privacypolicy' ||
    pathname === '/termsandconditions' ||
    pathname === '/returnRefundPolicy' ||
    pathname === '/internalPolicy' ||
    pathname === '/resources/employee-sms-consent'
  ) {
    return 'yearly';
  }
  return 'monthly';
}

function inferPriority(pathname: string): number {
  if (pathname === '/') return 1;
  if (pathname === '/shop') return 0.9;
  if (pathname === '/wheels') return 0.8;
  if (pathname.startsWith('/shop')) return 0.8;
  // High-value commercial landing pages
  if (
    pathname === '/hellcat-supercharger' ||
    pathname === '/hellcat-performance' ||
    pathname === '/trackhawk-performance' ||
    pathname === '/trx-performance'
  ) return 0.8;
  if (pathname.startsWith('/services') || pathname.startsWith('/packages')) return 0.7;
  if (pathname.startsWith('/blog') || pathname.startsWith('/vendors')) return 0.7;
  if (pathname.startsWith('/specs')) return 0.5;
  if (pathname.endsWith('/thanks') || pathname.endsWith('/success')) return 0.2;
  if (
    pathname === '/privacypolicy' ||
    pathname === '/termsandconditions' ||
    pathname === '/returnRefundPolicy' ||
    pathname === '/internalPolicy' ||
    pathname === '/resources/employee-sms-consent'
  ) {
    return 0.3;
  }
  return 0.6;
}

async function toUrlEntry({ pathname, sourceFile }: RouteFileEntry): Promise<SitemapUrlEntry> {
  let lastmod: string | undefined;
  if (sourceFile) {
    try {
      const stats = await stat(sourceFile);
      lastmod = stripMilliseconds(stats.mtime);
    } catch (err) {
      console.warn(
        `[sitemap] Unable to stat ${sourceFile}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return {
    loc: toAbsoluteUrl(pathname),
    lastmod,
    changefreq: inferChangefreq(pathname),
    priority: inferPriority(pathname)
  };
}

function dedupeByLoc(entries: SitemapUrlEntry[]): SitemapUrlEntry[] {
  const byLoc = new Map<string, SitemapUrlEntry>();
  for (const entry of entries) {
    const existing = byLoc.get(entry.loc);
    if (!existing) {
      byLoc.set(entry.loc, entry);
      continue;
    }
    const existingTime = existing.lastmod ? Date.parse(existing.lastmod) : Number.NaN;
    const nextTime = entry.lastmod ? Date.parse(entry.lastmod) : Number.NaN;
    if (Number.isFinite(nextTime) && (!Number.isFinite(existingTime) || nextTime > existingTime)) {
      byLoc.set(entry.loc, entry);
    }
  }
  return [...byLoc.values()].sort((a, b) => a.loc.localeCompare(b.loc));
}

async function fetchSanitySlugs(query: string): Promise<SanitySlugDoc[]> {
  if (!sanity) return [];
  try {
    const results = await sanity.fetch<SanitySlugDoc[]>(query);
    return (results ?? []).filter((item) => typeof item?.slug === 'string' && item.slug.length > 0);
  } catch (err) {
    console.error('[sitemap] Failed to fetch Sanity slugs:', err);
    return [];
  }
}

async function fetchSanityImageDocs(query: string): Promise<SanityImageDoc[]> {
  if (!sanity) return [];
  try {
    const results = await sanity.fetch<SanityImageDoc[]>(query);
    return (results ?? []).filter((item) => typeof item?.slug === 'string' && item.slug.length > 0);
  } catch (err) {
    console.error('[sitemap] Failed to fetch Sanity image docs:', err);
    return [];
  }
}

function mapSanityDocsToEntries(
  docs: SanitySlugDoc[],
  pathnamePrefix: string,
  changefreq: ChangeFreq,
  priority: number
): SitemapUrlEntry[] {
  return docs.map(({ slug, updatedAt }) => {
    const lastmodDate = updatedAt ? new Date(updatedAt) : undefined;
    const lastmod =
      lastmodDate && Number.isFinite(lastmodDate.getTime())
        ? stripMilliseconds(lastmodDate)
        : undefined;
    return {
      loc: toAbsoluteUrl(`${pathnamePrefix}/${slug}`),
      lastmod,
      changefreq,
      priority
    };
  });
}

function withFixedMetadata(
  entries: SitemapUrlEntry[],
  changefreq: ChangeFreq,
  priority: number
): SitemapUrlEntry[] {
  return entries.map((entry) => ({ ...entry, changefreq, priority }));
}

function filterEntriesByPathPrefix(entries: SitemapUrlEntry[], prefixes: string[]): SitemapUrlEntry[] {
  return entries.filter((entry) => prefixes.some((prefix) => pathFromLoc(entry.loc).startsWith(prefix)));
}

export async function getProductEntries(): Promise<SitemapUrlEntry[]> {
  const docs = await fetchSanitySlugs(`*[
    _type == "product" &&
    !(_id in path('drafts.**')) &&
    status == "active" &&
    defined(slug.current) &&
    coalesce(noindex, false) != true
  ]{
    "slug": slug.current,
    "updatedAt": coalesce(_updatedAt, _createdAt)
  }`);
  return mapSanityDocsToEntries(docs, '/shop', 'weekly', 0.8);
}

export async function getCategoryEntries(): Promise<SitemapUrlEntry[]> {
  const docs = await fetchSanitySlugs(`*[
    _type == "category" &&
    !(_id in path('drafts.**')) &&
    defined(slug.current)
  ]{
    "slug": slug.current,
    "updatedAt": coalesce(_updatedAt, _createdAt)
  }`);
  return mapSanityDocsToEntries(docs, '/shop/categories', 'weekly', 0.7);
}

export async function getBlogEntries(): Promise<SitemapUrlEntry[]> {
  const docs = await fetchSanitySlugs(`*[
    _type == "post" &&
    !(_id in path('drafts.**')) &&
    status == "published" &&
    publishedAt <= now() &&
    defined(slug.current)
  ]{
    "slug": slug.current,
    "updatedAt": coalesce(_updatedAt, _createdAt)
  }`);
  return mapSanityDocsToEntries(docs, '/blog', 'weekly', 0.7);
}

export async function getVendorEntries(): Promise<SitemapUrlEntry[]> {
  const docs = await fetchSanitySlugs(`*[
    _type == "vendor" &&
    !(_id in path('drafts.**')) &&
    status == "active" &&
    defined(slug.current)
  ]{
    "slug": slug.current,
    "updatedAt": coalesce(_updatedAt, _createdAt)
  }`);
  return mapSanityDocsToEntries(docs, '/vendors', 'weekly', 0.7);
}

export async function getCoreUrlEntries(): Promise<SitemapUrlEntry[]> {
  const publicRouteFiles = await discoverPublicRouteFiles();
  const coreRouteFiles = publicRouteFiles.filter(({ pathname }) => CORE_ROUTE_CANDIDATES.has(pathname));
  const entries = await Promise.all(coreRouteFiles.map(toUrlEntry));
  return dedupeByLoc(withFixedMetadata(entries, 'weekly', 0.8));
}

export async function getServiceUrlEntries(): Promise<SitemapUrlEntry[]> {
  const publicRouteFiles = await discoverPublicRouteFiles();
  const serviceRouteFiles = publicRouteFiles.filter(({ pathname }) => pathname.startsWith('/services'));
  const entries = await Promise.all(serviceRouteFiles.map(toUrlEntry));
  return dedupeByLoc(withFixedMetadata(entries, 'weekly', 0.8));
}

export async function getPlatformUrlEntries(): Promise<SitemapUrlEntry[]> {
  const publicRouteFiles = await discoverPublicRouteFiles();
  const platformRouteFiles = publicRouteFiles.filter(({ pathname }) =>
    PLATFORM_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
  const entries = await Promise.all(platformRouteFiles.map(toUrlEntry));
  return dedupeByLoc(withFixedMetadata(entries, 'weekly', 0.7));
}

export async function getPackageUrlEntries(): Promise<SitemapUrlEntry[]> {
  const publicRouteFiles = await discoverPublicRouteFiles();
  const packageRouteFiles = publicRouteFiles.filter(({ pathname }) => pathname.startsWith('/packages'));
  const entries = await Promise.all(packageRouteFiles.map(toUrlEntry));
  return dedupeByLoc(withFixedMetadata(entries, 'weekly', 0.7));
}

export async function getShopStaticEntries(): Promise<SitemapUrlEntry[]> {
  const publicRouteFiles = await discoverPublicRouteFiles();
  const shopFiles = publicRouteFiles.filter(({ pathname }) => pathname.startsWith('/shop'));
  const entries = await Promise.all(shopFiles.map(toUrlEntry));
  return dedupeByLoc(entries);
}

export async function getShopCategoryUrlEntries(): Promise<SitemapUrlEntry[]> {
  const [shopStaticEntries, categoryEntries] = await Promise.all([
    getShopStaticEntries(),
    getCategoryEntries()
  ]);
  const categoryStaticEntries = filterEntriesByPathPrefix(shopStaticEntries, ['/shop/categories']);
  return dedupeByLoc([...categoryStaticEntries, ...withFixedMetadata(categoryEntries, 'weekly', 0.7)]);
}

export async function getShopProductUrlEntries(): Promise<SitemapUrlEntry[]> {
  const entries = await getProductEntries();
  return dedupeByLoc(withFixedMetadata(entries, 'weekly', 0.8));
}

export async function getShopProductUrlEntryChunks(
  chunkSize = PRODUCT_SITEMAP_CHUNK_SIZE
): Promise<SitemapUrlEntry[][]> {
  const entries = await getShopProductUrlEntries();
  return splitIntoChunks(entries, chunkSize);
}

export async function getBlogUrlEntries(): Promise<SitemapUrlEntry[]> {
  const entries = await getBlogEntries();
  return dedupeByLoc(withFixedMetadata(entries, 'weekly', 0.7));
}

export async function getVendorUrlEntries(): Promise<SitemapUrlEntry[]> {
  const entries = await getVendorEntries();
  return dedupeByLoc(withFixedMetadata(entries, 'weekly', 0.6));
}

export async function getImageSitemapEntries(): Promise<SitemapImageEntry[]> {
  const [productDocs, blogDocs] = await Promise.all([
    fetchSanityImageDocs(`*[
      _type == "product" &&
      !(_id in path('drafts.**')) &&
      status == "active" &&
      (productType == "service" || productType == "bundle" || productType == "physical" || featured == true) &&
      defined(slug.current) &&
      coalesce(noindex, false) != true
    ]{
      "slug": slug.current,
      "updatedAt": coalesce(_updatedAt, _createdAt),
      "imageUrl": coalesce(mainImage.asset->url, images[0].asset->url, ogImage.asset->url),
      "title": coalesce(displayTitle, name, title)
    }`),
    fetchSanityImageDocs(`*[
      _type == "post" &&
      !(_id in path('drafts.**')) &&
      status == "published" &&
      publishedAt <= now() &&
      defined(slug.current)
    ]{
      "slug": slug.current,
      "updatedAt": coalesce(_updatedAt, _createdAt),
      "imageUrl": coalesce(mainImage.asset->url, ogImage.asset->url),
      "title": title
    }`)
  ]);

  const toImageEntry = (doc: SanityImageDoc, basePath: string): SitemapImageEntry | undefined => {
    if (!doc.imageUrl) return undefined;
    const lastmodDate = doc.updatedAt ? new Date(doc.updatedAt) : undefined;
    const lastmod =
      lastmodDate && Number.isFinite(lastmodDate.getTime())
        ? stripMilliseconds(lastmodDate)
        : undefined;
    return {
      loc: toAbsoluteUrl(`${basePath}/${doc.slug}`),
      lastmod,
      images: [{ loc: doc.imageUrl, title: doc.title }]
    };
  };

  const combined = [
    ...productDocs.map((doc) => toImageEntry(doc, '/shop')),
    ...blogDocs.map((doc) => toImageEntry(doc, '/blog'))
  ].filter((entry): entry is SitemapImageEntry => Boolean(entry));

  const deduped = new Map<string, SitemapImageEntry>();
  for (const entry of combined) {
    if (!deduped.has(entry.loc)) {
      deduped.set(entry.loc, entry);
      continue;
    }
    const existing = deduped.get(entry.loc);
    if (!existing) continue;
    const existingTime = existing.lastmod ? Date.parse(existing.lastmod) : Number.NaN;
    const nextTime = entry.lastmod ? Date.parse(entry.lastmod) : Number.NaN;
    if (Number.isFinite(nextTime) && (!Number.isFinite(existingTime) || nextTime > existingTime)) {
      deduped.set(entry.loc, entry);
    }
  }

  return [...deduped.values()].sort((a, b) => a.loc.localeCompare(b.loc));
}

export async function getStaticUrlEntries(): Promise<SitemapUrlEntry[]> {
  const [publicRouteFiles, blogEntries, vendorEntries] = await Promise.all([
    discoverPublicRouteFiles(),
    getBlogEntries(),
    getVendorEntries()
  ]);
  const nonShopRouteFiles = publicRouteFiles.filter(({ pathname }) => !pathname.startsWith('/shop'));
  const staticEntries = await Promise.all(nonShopRouteFiles.map(toUrlEntry));
  return dedupeByLoc([...staticEntries, ...blogEntries, ...vendorEntries]);
}

export async function getShopUrlEntries(): Promise<SitemapUrlEntry[]> {
  const [shopStaticEntries, categoryEntries, productEntries] = await Promise.all([
    getShopStaticEntries(),
    getCategoryEntries(),
    getProductEntries()
  ]);
  return dedupeByLoc([...shopStaticEntries, ...categoryEntries, ...productEntries]);
}

export async function getFullSitemapEntries(): Promise<SitemapUrlEntry[]> {
  const [staticEntries, shopEntries] = await Promise.all([getStaticUrlEntries(), getShopUrlEntries()]);
  return dedupeByLoc([...staticEntries, ...shopEntries]);
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

export function generateImageSitemapXml(entries: SitemapImageEntry[]): string {
  const items = entries
    .map((entry) => {
      const imageTags = entry.images
        .map((image) => {
          const imageParts = [`      <image:loc>${escapeXml(image.loc)}</image:loc>`];
          if (image.title) {
            imageParts.push(`      <image:title>${escapeXml(image.title)}</image:title>`);
          }
          return `    <image:image>\n${imageParts.join('\n')}\n    </image:image>`;
        })
        .join('\n');

      const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`];
      if (entry.lastmod) parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);

      return `  <url>\n${parts.join('\n')}\n${imageTags}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${items}\n</urlset>\n`;
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

export function getMostRecentImageLastmod(entries: SitemapImageEntry[]): string | undefined {
  const timestamps = entries
    .map((entry) => (entry.lastmod ? Date.parse(entry.lastmod) : undefined))
    .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (!timestamps.length) return undefined;
  return stripMilliseconds(new Date(Math.max(...timestamps)));
}

export function getProductSitemapChunkSize(): number {
  return PRODUCT_SITEMAP_CHUNK_SIZE;
}

// ---------------------------------------------------------------------------
// URL Inventory — single source of truth for both XML generation and HTML page
// ---------------------------------------------------------------------------

export interface SitemapSection {
  /** Human-readable label for the HTML sitemap */
  label: string;
  /** Slug key used to identify the XML sitemap file (e.g. "core" → sitemap-core.xml) */
  key: string;
  entries: SitemapUrlEntry[];
}

/**
 * Returns the full sitemap inventory grouped by section.
 * Both the XML sitemap files and the HTML /sitemap page MUST derive their
 * URL lists from this function so they always stay in sync.
 *
 * Usage in XML files: call the individual `get*Entries()` helpers (they're
 * already backed by the same underlying fetchers).
 * Usage in HTML page: call `getSitemapInventory()` and iterate sections.
 */
export async function getSitemapInventory(): Promise<SitemapSection[]> {
  const [
    coreEntries,
    serviceEntries,
    platformEntries,
    packageEntries,
    shopCategoryEntries,
    shopProductEntries,
    blogEntries,
    vendorEntries,
  ] = await Promise.all([
    getCoreUrlEntries(),
    getServiceUrlEntries(),
    getPlatformUrlEntries(),
    getPackageUrlEntries(),
    getShopCategoryUrlEntries(),
    getShopProductUrlEntries(),
    getBlogUrlEntries(),
    getVendorUrlEntries(),
  ]);

  const sections: SitemapSection[] = [
    { label: 'Core Pages', key: 'core', entries: coreEntries },
    { label: 'Services', key: 'services', entries: serviceEntries },
    { label: 'Platform Pages', key: 'platforms', entries: platformEntries },
    { label: 'Packages', key: 'packages', entries: packageEntries },
    { label: 'Shop Categories', key: 'shop-categories', entries: shopCategoryEntries },
    { label: 'Shop Products', key: 'shop-products', entries: shopProductEntries },
    { label: 'Blog', key: 'blog', entries: blogEntries },
    { label: 'Vendors', key: 'vendors', entries: vendorEntries },
  ];

  // Only return sections that have at least one entry
  return sections.filter((s) => s.entries.length > 0);
}
