import { generateImageSitemapXml, getImageSitemapEntries } from '@/lib/sitemap';

export async function GET() {
  const entries = await getImageSitemapEntries();
  const xml = generateImageSitemapXml(entries);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800'
    }
  });
}
