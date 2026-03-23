import { buildSitemapIndexEntries, generateSitemapIndexXml } from '@/lib/sitemap';

export const prerender = true;

export async function GET() {
  const sitemaps = await buildSitemapIndexEntries();
  const xml = generateSitemapIndexXml(sitemaps);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800'
    }
  });
}
