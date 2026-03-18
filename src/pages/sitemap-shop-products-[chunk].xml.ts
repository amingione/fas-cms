import { generateUrlsetXml, getShopProductUrlEntryChunks } from '@/lib/sitemap';

export async function GET({ params }: { params: { chunk?: string } }) {
  const requestedChunk = Number(params.chunk);
  if (!Number.isInteger(requestedChunk) || requestedChunk < 1) {
    return new Response('Not found', { status: 404 });
  }

  const chunks = await getShopProductUrlEntryChunks();
  const urls = chunks[requestedChunk - 1];
  if (!urls) {
    return new Response('Not found', { status: 404 });
  }

  const xml = generateUrlsetXml(urls);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800'
    }
  });
}
