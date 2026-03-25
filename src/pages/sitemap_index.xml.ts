import {
  generateSitemapIndexXml,
  getBlogUrlEntries,
  getCoreUrlEntries,
  getImageSitemapEntries,
  getMostRecentImageLastmod,
  getMostRecentLastmod,
  getPackageUrlEntries,
  getPlatformUrlEntries,
  getServiceUrlEntries,
  getShopCategoryUrlEntries,
  getShopProductUrlEntryChunks,
  getVendorUrlEntries,
  toAbsoluteUrl
} from '@/lib/sitemap';
import type { SitemapIndexEntry } from '@/lib/sitemap';

export const prerender = true;

export async function GET() {
  const [
    coreUrls,
    serviceUrls,
    platformUrls,
    packageUrls,
    shopCategoryUrls,
    shopProductChunks,
    blogUrls,
    vendorUrls,
    imageEntries
  ] = await Promise.all([
    getCoreUrlEntries(),
    getServiceUrlEntries(),
    getPlatformUrlEntries(),
    getPackageUrlEntries(),
    getShopCategoryUrlEntries(),
    getShopProductUrlEntryChunks(),
    getBlogUrlEntries(),
    getVendorUrlEntries(),
    getImageSitemapEntries()
  ]);

  const productChunkEntries: SitemapIndexEntry[] =
    shopProductChunks.length <= 1
      ? shopProductChunks[0]?.length
        ? [
            {
              loc: toAbsoluteUrl('/sitemap-shop-products.xml'),
              lastmod: getMostRecentLastmod(shopProductChunks[0])
            }
          ]
        : []
      : shopProductChunks.map((chunk, index) => ({
          loc: toAbsoluteUrl(`/sitemap-shop-products-${index + 1}.xml`),
          lastmod: getMostRecentLastmod(chunk)
        }));

  const sitemapCandidates: Array<SitemapIndexEntry | undefined> = [
    coreUrls.length > 0
      ? { loc: toAbsoluteUrl('/sitemap-core.xml'), lastmod: getMostRecentLastmod(coreUrls) }
      : undefined,
    serviceUrls.length > 0
      ? { loc: toAbsoluteUrl('/sitemap-services.xml'), lastmod: getMostRecentLastmod(serviceUrls) }
      : undefined,
    platformUrls.length > 0
      ? { loc: toAbsoluteUrl('/sitemap-platforms.xml'), lastmod: getMostRecentLastmod(platformUrls) }
      : undefined,
    packageUrls.length > 0
      ? { loc: toAbsoluteUrl('/sitemap-packages.xml'), lastmod: getMostRecentLastmod(packageUrls) }
      : undefined,
    shopCategoryUrls.length > 0
      ? {
          loc: toAbsoluteUrl('/sitemap-shop-categories.xml'),
          lastmod: getMostRecentLastmod(shopCategoryUrls)
        }
      : undefined,
    ...productChunkEntries,
    blogUrls.length > 0
      ? { loc: toAbsoluteUrl('/sitemap-blog.xml'), lastmod: getMostRecentLastmod(blogUrls) }
      : undefined,
    vendorUrls.length > 0
      ? { loc: toAbsoluteUrl('/sitemap-vendors.xml'), lastmod: getMostRecentLastmod(vendorUrls) }
      : undefined,
    imageEntries.length > 0
      ? {
          loc: toAbsoluteUrl('/sitemap-images.xml'),
          lastmod: getMostRecentImageLastmod(imageEntries)
        }
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
