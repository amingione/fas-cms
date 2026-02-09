import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { getMedusaConfig, medusaFetch, readJsonSafe } from '@/lib/medusa';
import { resolveVariantCalculatedPriceAmount } from '@/lib/medusa-storefront-pricing';

type PricingRequest = {
  handles?: string[];
};

export const POST: APIRoute = async ({ request }) => {
  const config = getMedusaConfig();
  if (!config) {
    return jsonResponse({ error: 'Medusa backend not configured.' }, { status: 503 }, { noIndex: true });
  }

  let body: PricingRequest | null = null;
  try {
    body = (await request.json()) as PricingRequest;
  } catch {
    body = null;
  }

  const handles = Array.isArray(body?.handles)
    ? body!.handles.filter((h) => typeof h === 'string' && h.trim()).map((h) => h.trim())
    : [];

  if (!handles.length) {
    return jsonResponse({ error: 'No product handles provided.' }, { status: 400 }, { noIndex: true });
  }

  const results: Record<string, { priceCents?: number; variantId?: string }> = {};

  for (const handle of handles) {
    try {
      const response = await medusaFetch(`/store/products?handle=${encodeURIComponent(handle)}`, {
        method: 'GET',
        cache: 'no-store'
      });
      const data = await readJsonSafe<any>(response);
      if (!response.ok) {
        results[handle] = {};
        continue;
      }

      const product = Array.isArray(data?.products) ? data.products[0] : null;
      const variant = Array.isArray(product?.variants) ? product.variants[0] : null;
      const priceCents = resolveVariantCalculatedPriceAmount(variant);

      results[handle] = {
        priceCents: typeof priceCents === 'number' ? priceCents : undefined,
        variantId: typeof variant?.id === 'string' ? variant.id : undefined
      };
    } catch {
      results[handle] = {};
    }
  }

  return jsonResponse({ prices: results }, { status: 200 }, { noIndex: true });
};
