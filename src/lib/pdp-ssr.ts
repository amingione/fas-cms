export type PdpProductSource = 'sanity' | 'medusa-fallback' | null;

export type PdpSsrResult<TProduct = any, TMedusaProduct = any> = {
  product: TProduct | null;
  source: PdpProductSource;
  medusaProductsForPricing: TMedusaProduct[];
  relatedProducts: any[];
  upsellProducts: any[];
  fatalError: boolean;
};

type Deps<TProduct = any, TMedusaProduct = any> = {
  getProductBySlug: (slug: string) => Promise<TProduct | null>;
  listStoreProductsForPricing: () => Promise<TMedusaProduct[]>;
  getRelatedProducts: (
    slug: string,
    catIds: string[],
    tagFilters: string[],
    limit: number
  ) => Promise<any[]>;
  getUpsellProducts: (
    slug: string,
    catIds: string[],
    basePrice: number | undefined,
    limit: number
  ) => Promise<any[]>;
  attachMedusaPricingBySanityIdentity: (products: any[], medusaProducts: TMedusaProduct[]) => any[];
  resolveProductCalculatedPriceAmount: (product: any) => number | undefined;
  normalizeSlugValue: (value: string) => string;
  buildFallbackProduct: (medusaProduct: TMedusaProduct, slug: string) => TProduct;
};

type ResolveInput<TProduct = any, TMedusaProduct = any> = {
  slugValue: string;
  requestUrl: string;
  catIds: string[];
  tagFilters: string[];
  pricingTimeoutMs: number;
  includeOptionalFetches?: boolean;
  includePricingAttach?: boolean;
  deps: Deps<TProduct, TMedusaProduct>;
};

function asErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function normalizeLookupSlug(value: string, normalize: (input: string) => string): string {
  return normalize(value).trim().toLowerCase();
}

function logPdp(prefix: string, payload: Record<string, unknown>, error?: unknown) {
  if (error) {
    console.error(prefix, {
      ...payload,
      error: asErrorMessage(error)
    });
    return;
  }
  console.error(prefix, payload);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  const clamped = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.floor(timeoutMs) : 4500;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`${label} timed out after ${clamped}ms`));
      }, clamped);
    });
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function resolvePdpSsrData<TProduct = any, TMedusaProduct = any>(
  input: ResolveInput<TProduct, TMedusaProduct>
): Promise<PdpSsrResult<TProduct, TMedusaProduct>> {
  const {
    slugValue,
    requestUrl,
    catIds,
    tagFilters,
    pricingTimeoutMs,
    includeOptionalFetches = true,
    includePricingAttach = true,
    deps
  } = input;

  const logBase = {
    slug: slugValue,
    requestUrl,
    source: null as PdpProductSource
  };

  let product: TProduct | null = null;
  let source: PdpProductSource = null;
  let medusaProductsForPricing: TMedusaProduct[] = [];
  let relatedProducts: any[] = [];
  let upsellProducts: any[] = [];

  if (!slugValue) {
    return {
      product: null,
      source,
      medusaProductsForPricing,
      relatedProducts,
      upsellProducts,
      fatalError: false
    };
  }

  // Fetch Sanity product and Medusa pricing list concurrently.
  // Sanity is the authoritative content source — Medusa is only used as a
  // last-resort fallback when Sanity has no document for this slug.
  const [sanityResult, medusaResult] = await Promise.allSettled([
    deps.getProductBySlug(slugValue),
    withTimeout(deps.listStoreProductsForPricing(), pricingTimeoutMs, 'listStoreProductsForPricing')
  ]);

  if (sanityResult.status === 'fulfilled' && sanityResult.value) {
    product = sanityResult.value;
    source = 'sanity';
  } else if (sanityResult.status === 'rejected') {
    logPdp('[pdp-ssr] product fetch failed', { ...logBase }, sanityResult.reason);
  }

  if (medusaResult.status === 'fulfilled') {
    medusaProductsForPricing = medusaResult.value;
  } else {
    logPdp('[pdp-ssr] medusa pricing list failed', { ...logBase }, medusaResult.reason);
  }

  // Only fall back to a Medusa-derived product shell when Sanity returned nothing.
  if (!product && medusaProductsForPricing.length) {
    try {
      const normalizedRequestedSlug = normalizeLookupSlug(slugValue, deps.normalizeSlugValue);
      const medusaByHandle = medusaProductsForPricing.find((entry: any) => {
        const handle = typeof entry?.handle === 'string' ? entry.handle : '';
        const id = typeof entry?.id === 'string' ? entry.id : '';
        return (
          normalizeLookupSlug(handle, deps.normalizeSlugValue) === normalizedRequestedSlug ||
          normalizeLookupSlug(id, deps.normalizeSlugValue) === normalizedRequestedSlug
        );
      });
      if (medusaByHandle) {
        product = deps.buildFallbackProduct(medusaByHandle, slugValue);
        source = 'medusa-fallback';
      }
    } catch (error) {
      logPdp('[pdp-ssr] medusa fallback failed', { ...logBase, source: 'medusa-fallback' }, error);
    }
  }

  if (!product) {
    return {
      product: null,
      source,
      medusaProductsForPricing,
      relatedProducts,
      upsellProducts,
      fatalError: false
    };
  }

  if (includePricingAttach) {
    try {
      if (!medusaProductsForPricing.length) {
        medusaProductsForPricing = await withTimeout(
          deps.listStoreProductsForPricing(),
          pricingTimeoutMs,
          'listStoreProductsForPricing'
        );
      }
      if (medusaProductsForPricing.length) {
        const attached = deps.attachMedusaPricingBySanityIdentity(
          [product as any],
          medusaProductsForPricing
        );
        product = (attached?.[0] as TProduct) ?? product;
      }
    } catch (error) {
      logPdp('[pdp-ssr] pricing attach failed', { ...logBase, source }, error);
    }
  }

  const basePrice = deps.resolveProductCalculatedPriceAmount(product as any);

  if (!includeOptionalFetches) {
    return {
      product,
      source,
      medusaProductsForPricing,
      relatedProducts,
      upsellProducts,
      fatalError: false
    };
  }

  try {
    relatedProducts = await deps.getRelatedProducts(slugValue, catIds, tagFilters, 6);
  } catch (error) {
    logPdp('[pdp-ssr] related fetch failed', { ...logBase, source }, error);
    relatedProducts = [];
  }

  try {
    upsellProducts = await deps.getUpsellProducts(slugValue, catIds, basePrice, 6);
  } catch (error) {
    logPdp('[pdp-ssr] upsell fetch failed', { ...logBase, source }, error);
    upsellProducts = [];
  }

  try {
    if (medusaProductsForPricing.length) {
      relatedProducts = deps.attachMedusaPricingBySanityIdentity(
        relatedProducts as any,
        medusaProductsForPricing
      ) as any[];
      upsellProducts = deps.attachMedusaPricingBySanityIdentity(
        upsellProducts as any,
        medusaProductsForPricing
      ) as any[];
    }
  } catch (error) {
    logPdp('[pdp-ssr] pricing attach failed', { ...logBase, source, scope: 'related-upsell' }, error);
  }

  return {
    product,
    source,
    medusaProductsForPricing,
    relatedProducts,
    upsellProducts,
    fatalError: false
  };
}
