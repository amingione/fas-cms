import { generateUrlsetXml, getServiceUrlEntries } from '@/lib/sitemap';

export const prerender = true;

export async function GET() {
  const urls = await getServiceUrlEntries();
  const xml = generateUrlsetXml(urls);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800'
    }
  });
}
