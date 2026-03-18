import { generateUrlsetXml, getPackageUrlEntries } from '@/lib/sitemap';

export async function GET() {
  const urls = await getPackageUrlEntries();
  const xml = generateUrlsetXml(urls);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800'
    }
  });
}
