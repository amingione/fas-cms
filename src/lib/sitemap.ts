import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanity } from './sanity-utils';

const FALLBACK_SITE_URL = 'https://fasmotorsports.com';
const PAGES_DIR = fileURLToPath(new URL('../pages', import.meta.url));
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
  '/internalPolicy'
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

function routeFromAstroPath(absoluteFilePath: string): string {
  const relative = path.relative(PAGES_DIR, absoluteFilePath).replace(/\\/g, '/');
  const noExt = relative.replace(/\.astro$/, '');
  const noIndex = noExt.endsWith('/index') ? noExt.slice(0, -'/index'.length) : noExt;
  const route = normalisePath(noIndex || '/');
  return route;
}

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

async function collectAstroFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(root, entry.name);
      if (entry.isDirectory()) {
        return collectAstroFiles(resolved);
      }
      if (!entry.isFile() || !entry.name.endsWith('.astro')) return [];
      return [resolved];
    })
  );
  return files.flat();
}

async function discoverPublicRouteFiles(): Promise<RouteFileEntry[]> {
  const files = await collectAstroFiles(PAGES_DIR);
  return files
    .filter((filePath) => !filePath.includes('['))
    .map((filePath) => ({
      pathname: routeFromAstroPath(filePath),
      sourceFile: filePath
    }))
    .filter(({ pathname }) => !isExcluded(pathname));
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
  try {
    const stats = await stat(sourceFile);
    lastmod = stripMilliseconds(stats.mtime);
  } catch (err) {
    console.warn(
      `[sitemap] Unable to stat ${sourceFile}:`,
      err instanceof Error ? err.message : err
    );
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
    (productType == "service" || productType == "bundle" || productType == "physical" || featured == true) &&
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
