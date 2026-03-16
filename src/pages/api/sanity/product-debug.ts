/**
 * GET /api/sanity/product-debug?slug=<slug>
 *
 * Diagnostic endpoint — bypasses the in-memory Sanity cache and queries
 * the Sanity API directly so we can verify what the SSR layer actually
 * receives at runtime.  Returns a JSON snapshot with:
 *   - rawSanity   – the raw GROQ result for the product (no cache)
 *   - cacheState  – whether the in-memory cache currently holds this key
 *   - buildInfo   – the SANITY_CACHE_VERSION baked in at build time
 *
 * NOTE: Protected by a simple token check so it can't be scraped in prod.
 * Pass  ?token=<DEBUG_TOKEN>  (set DEBUG_TOKEN in Netlify env) or the
 * endpoint accepts any token when DEBUG_TOKEN is not set (dev / preview).
 */

import type { APIRoute } from 'astro';
import { sanity } from '@lib/sanity-utils';

// Build-time constant injected by astro.config.mjs → vite.define
declare const __SANITY_CACHE_VERSION__: string;
const BUILD_SANITY_CACHE_VERSION: string =
  typeof __SANITY_CACHE_VERSION__ !== 'undefined' ? __SANITY_CACHE_VERSION__ : '(not-injected)';

const SANITY_CACHE_SYMBOL = Symbol.for('__fasSanityCacheStore__');

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get('token') ?? '';
  const debugToken = import.meta.env.DEBUG_TOKEN ?? '';
  if (debugToken && token !== debugToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  const slug = url.searchParams.get('slug') ?? '';
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing ?slug= param' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  let rawSanity: unknown = null;
  let queryError: string | null = null;

  if (sanity) {
    const query = `*[_type == "product" && !(_id in path("drafts.**")) && slug.current == $slug][0]{
      _id,
      _updatedAt,
      title,
      displayTitle,
      slug,
      contentStatus,
      status,
      productType,
      featured,
      "shortDescType": select(
        array::length(shortDescription) > 0 => "portableText",
        shortDescription != null => "string",
        "null"
      ),
      "shortDescFirst": shortDescription[0].children[0].text,
      "shortDescStr": select(
        shortDescription._type == "block" => shortDescription.children[0].text,
        typeof(shortDescription) == "string" => shortDescription,
        null
      ),
      "kfCount": count(keyFeatures),
      "hasImportantNotes": defined(importantNotes) && array::length(importantNotes) > 0,
      "hasAddOns": defined(addOns) && array::length(addOns) > 0,
      "hasSpecifications": defined(specifications) && array::length(specifications) > 0,
      "hasAttributes": defined(attributes) && array::length(attributes) > 0,
      "addOnsCount": count(addOns),
      "specificationsCount": count(specifications),
      "attributesCount": count(attributes),
      keyFeatures[]{ title, icon, summary },
      addOns[]{ label, priceDelta, skuSuffix },
      specifications[0..2],
      attributes[0..2],
      importantNotes[0..1]
    }`;

    try {
      rawSanity = await sanity.fetch(query, { slug });
    } catch (err) {
      queryError = err instanceof Error ? err.message : String(err);
    }
  } else {
    queryError = 'Sanity client not available';
  }

  // Check in-memory cache
  const globalTarget = globalThis as typeof globalThis & {
    [key: symbol]: Map<string, { value?: unknown; expiresAt: number }> | undefined;
  };
  const cacheStore = globalTarget[SANITY_CACHE_SYMBOL];
  const cacheEntries: Record<string, { expired: boolean; hasValue: boolean }> = {};

  if (cacheStore) {
    const now = Date.now();
    for (const [k, v] of cacheStore.entries()) {
      if (k.includes(slug)) {
        cacheEntries[k] = {
          expired: v.expiresAt < now,
          hasValue: v.value !== undefined
        };
      }
    }
  }

  const payload = {
    slug,
    buildInfo: {
      sanityApiVersion: import.meta.env.SANITY_API_VERSION ?? '(unset)',
      sanityProject: import.meta.env.SANITY_PROJECT_ID ?? '(unset)',
      sanityDataset: import.meta.env.SANITY_DATASET ?? '(unset)',
      cacheEnabled: import.meta.env.PUBLIC_SANITY_ENABLE_CACHE ?? '(unset)',
      cacheTtlSeconds: import.meta.env.PUBLIC_SANITY_CACHE_TTL_SECONDS ?? '(unset)',
      buildSanityCacheVersion: BUILD_SANITY_CACHE_VERSION
    },
    rawSanity,
    queryError,
    cacheState: {
      storeExists: !!cacheStore,
      entriesForSlug: cacheEntries
    }
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
};
