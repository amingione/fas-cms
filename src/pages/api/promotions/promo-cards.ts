import type { APIRoute } from 'astro';
import { sanityClient } from '@/lib/sanityClient';
import { jsonResponse } from '@/server/http/responses';

type PromoCardRequest = {
  handles?: string[];
};

export const POST: APIRoute = async ({ request }) => {
  let body: PromoCardRequest | null = null;
  try {
    body = (await request.json()) as PromoCardRequest;
  } catch {
    body = null;
  }

  const handles = Array.isArray(body?.handles)
    ? body!.handles
        .filter((handle) => typeof handle === 'string' && handle.trim())
        .map((handle) => handle.trim())
    : [];

  if (!handles.length) {
    return jsonResponse({ error: 'No promo card handles provided.' }, { status: 400 }, { noIndex: true });
  }

  try {
    const query = `
      *[_type == "product" && slug.current in $slugs]{
        "handle": slug.current,
        "showPrice": coalesce(promoCardShowPrice, false)
      }
    `;
    const results = await sanityClient.fetch<Array<{ handle?: string; showPrice?: boolean }>>(
      query,
      { slugs: handles }
    );

    const visibility: Record<string, boolean> = {};
    for (const entry of results || []) {
      if (entry?.handle) {
        visibility[entry.handle] = entry.showPrice === true;
      }
    }

    return jsonResponse({ visibility }, { status: 200 }, { noIndex: true });
  } catch (error) {
    console.error('[api/promotions/promo-cards] Failed to fetch promo card visibility', error);
    return jsonResponse({ error: 'Failed to load promo card visibility.' }, { status: 500 }, { noIndex: true });
  }
};
