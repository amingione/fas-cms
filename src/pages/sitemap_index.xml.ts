import {
  generateSitemapIndexXml,
  getMostRecentLastmod,
  getShopUrlEntries,
  getStaticUrlEntries,
  toAbsoluteUrl
} from '@/lib/sitemap';

export async function GET() {
  const [staticUrls, shopUrls] = await Promise.all([
    getStaticUrlEntries(),
    getShopUrlEntries()
  ]);

  const sitemaps = [
    staticUrls.length > 0
      ? { loc: toAbsoluteUrl('/sitemap-static.xml'), lastmod: getMostRecentLastmod(staticUrls) }
      : undefined,
    shopUrls.length > 0
      ? { loc: toAbsoluteUrl('/sitemap-shop.xml'), lastmod: getMostRecentLastmod(shopUrls) }
      : undefined
  ].filter((entry): entry is { loc: string; lastmod?: string } => Boolean(entry));

  const xml = generateSitemapIndexXml(sitemaps);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800'
    }
  });
}
