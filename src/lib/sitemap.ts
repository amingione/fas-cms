import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanity } from './sanity-utils';

const FALLBACK_SITE_URL = 'https://fasmotorsports.com';
const PAGES_DIR = fileURLToPath(new URL('../pages', import.meta.url));

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

interface RouteFileEntry {
  pathname: string;
  sourceFile: string;
}

interface SanitySlugDoc {
  slug: string;
  updatedAt?: string;
}

const EXCLUDED_ROUTES = new Set<string>([
  '/_app',
  '/cart',
  '/checkout',
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/sitemap-shop.xml',
  '/sitemap-static.xml'
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
  const envUrl =
    (import.meta.env?.PUBLIC_SITE_URL as string | undefined) ||
    (import.meta.env?.PUBLIC_BASE_URL as string | undefined) ||
    FALLBACK_SITE_URL;
  try {
    return new URL(envUrl).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
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

export async function getShopStaticEntries(): Promise<SitemapUrlEntry[]> {
  const publicRouteFiles = await discoverPublicRouteFiles();
  const shopFiles = publicRouteFiles.filter(({ pathname }) => pathname.startsWith('/shop'));
  const entries = await Promise.all(shopFiles.map(toUrlEntry));
  return dedupeByLoc(entries);
}

export async function getShopUrlEntries(): Promise<SitemapUrlEntry[]> {
  const [staticEntries, categoryEntries, productEntries] = await Promise.all([
    getShopStaticEntries(),
    getCategoryEntries(),
    getProductEntries()
  ]);
  return dedupeByLoc([...staticEntries, ...categoryEntries, ...productEntries]);
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
