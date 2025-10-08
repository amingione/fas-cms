import { generateUrlsetXml, getShopUrlEntries } from '@/lib/sitemap';

export async function GET() {
  const urls = await getShopUrlEntries();
  const xml = generateUrlsetXml(urls);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800'
    }
  });
}
