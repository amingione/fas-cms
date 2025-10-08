import { generateUrlsetXml, getStaticUrlEntries } from '@/lib/sitemap';

export async function GET() {
  const urls = await getStaticUrlEntries();
  const xml = generateUrlsetXml(urls);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
