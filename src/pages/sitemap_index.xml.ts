import {
  generateSitemapIndexXml,
  getMostRecentLastmod,
  getShopUrlEntries,
  getStaticUrlEntries,
  toAbsoluteUrl
} from '@/lib/sitemap';
import type { SitemapIndexEntry } from '@/lib/sitemap';

export async function GET() {
  const [staticUrls, shopUrls] = await Promise.all([
    getStaticUrlEntries(),
    getShopUrlEntries()
  ]);

  const sitemapCandidates: Array<SitemapIndexEntry | undefined> = [
    staticUrls.length > 0
      ? { loc: toAbsoluteUrl('/sitemap-static.xml'), lastmod: getMostRecentLastmod(staticUrls) }
      : undefined,
    shopUrls.length > 0
      ? { loc: toAbsoluteUrl('/sitemap-shop.xml'), lastmod: getMostRecentLastmod(shopUrls) }
      : undefined
  ];

  const sitemaps = sitemapCandidates.filter(
    (entry): entry is SitemapIndexEntry => Boolean(entry)
  );

  const xml = generateSitemapIndexXml(sitemaps);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800'
    }
  });
}
