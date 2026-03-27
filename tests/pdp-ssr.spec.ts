import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePdpSsrData } from '../src/lib/pdp-ssr';

function createDeps(overrides: Partial<any> = {}) {
  return {
    getProductBySlug: vi.fn(async (slug: string) => ({ _id: `sanity-${slug}`, title: 'Sanity Product' })),
    listStoreProductsForPricing: vi.fn(async () => [
      { id: 'med_1', handle: 'fallback-product', title: 'Fallback Product' }
    ]),
    getRelatedProducts: vi.fn(async () => [{ _id: 'rel_1' }]),
    getUpsellProducts: vi.fn(async () => [{ _id: 'up_1' }]),
    attachMedusaPricingBySanityIdentity: vi.fn((products: any[]) => products),
    resolveProductCalculatedPriceAmount: vi.fn(() => 1000),
    normalizeSlugValue: vi.fn((value: string) => value.trim().toLowerCase()),
    buildFallbackProduct: vi.fn((entry: any, slug: string) => ({ _id: `fallback-${slug}`, title: entry.title })),
    ...overrides
  };
}

describe('resolvePdpSsrData', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves a valid Sanity-backed product', async () => {
    const deps = createDeps();

    const result = await resolvePdpSsrData({
      slugValue: 'sanity-product',
      requestUrl: 'https://example.com/shop/sanity-product',
      catIds: [],
      tagFilters: [],
      pricingTimeoutMs: 100,
      includeOptionalFetches: true,
      includePricingAttach: true,
      deps
    });

    expect(result.product).toBeTruthy();
    expect(result.source).toBe('sanity');
  });

  it('resolves a valid Medusa-fallback product', async () => {
    const deps = createDeps({
      getProductBySlug: vi.fn(async () => null),
      listStoreProductsForPricing: vi.fn(async () => [
        { id: 'med_2', handle: 'target-slug', title: 'Target From Medusa' }
      ])
    });

    const result = await resolvePdpSsrData({
      slugValue: 'target-slug',
      requestUrl: 'https://example.com/shop/target-slug',
      catIds: [],
      tagFilters: [],
      pricingTimeoutMs: 100,
      includeOptionalFetches: false,
      includePricingAttach: false,
      deps
    });

    expect(result.product).toBeTruthy();
    expect(result.source).toBe('medusa-fallback');
  });

  it('prefers Sanity product when both Sanity and Medusa handle match the slug', async () => {
    const deps = createDeps({
      getProductBySlug: vi.fn(async () => ({ _id: 'sanity-target', title: 'Sanity Target' })),
      listStoreProductsForPricing: vi.fn(async () => [
        { id: 'med_2', handle: 'target-slug', title: 'Target From Medusa' }
      ])
    });

    const result = await resolvePdpSsrData({
      slugValue: 'target-slug',
      requestUrl: 'https://example.com/shop/target-slug',
      catIds: [],
      tagFilters: [],
      pricingTimeoutMs: 100,
      includeOptionalFetches: false,
      includePricingAttach: false,
      deps
    });

    expect(result.product).toBeTruthy();
    expect((result.product as any)?._id).toBe('sanity-target');
    expect(result.source).toBe('sanity');
  });

  it('returns null product for nonexistent slug (404 path)', async () => {
    const deps = createDeps({
      getProductBySlug: vi.fn(async () => null),
      listStoreProductsForPricing: vi.fn(async () => [])
    });

    const result = await resolvePdpSsrData({
      slugValue: 'missing-slug',
      requestUrl: 'https://example.com/shop/missing-slug',
      catIds: [],
      tagFilters: [],
      pricingTimeoutMs: 100,
      includeOptionalFetches: false,
      includePricingAttach: false,
      deps
    });

    expect(result.product).toBeNull();
    expect(result.fatalError).toBe(false);
  });

  it('continues rendering when related products fetch fails', async () => {
    const deps = createDeps({
      getRelatedProducts: vi.fn(async () => {
        throw new Error('related failed');
      })
    });

    const result = await resolvePdpSsrData({
      slugValue: 'sanity-product',
      requestUrl: 'https://example.com/shop/sanity-product',
      catIds: ['cat_1'],
      tagFilters: ['filter_1'],
      pricingTimeoutMs: 100,
      includeOptionalFetches: true,
      includePricingAttach: true,
      deps
    });

    expect(result.product).toBeTruthy();
    expect(result.relatedProducts).toEqual([]);
  });

  it('continues rendering when upsell products fetch fails', async () => {
    const deps = createDeps({
      getUpsellProducts: vi.fn(async () => {
        throw new Error('upsell failed');
      })
    });

    const result = await resolvePdpSsrData({
      slugValue: 'sanity-product',
      requestUrl: 'https://example.com/shop/sanity-product',
      catIds: ['cat_1'],
      tagFilters: ['filter_1'],
      pricingTimeoutMs: 100,
      includeOptionalFetches: true,
      includePricingAttach: true,
      deps
    });

    expect(result.product).toBeTruthy();
    expect(result.upsellProducts).toEqual([]);
  });

  it('continues rendering when pricing attach fails', async () => {
    const deps = createDeps({
      attachMedusaPricingBySanityIdentity: vi.fn(() => {
        throw new Error('pricing attach failed');
      })
    });

    const result = await resolvePdpSsrData({
      slugValue: 'sanity-product',
      requestUrl: 'https://example.com/shop/sanity-product',
      catIds: ['cat_1'],
      tagFilters: ['filter_1'],
      pricingTimeoutMs: 100,
      includeOptionalFetches: true,
      includePricingAttach: true,
      deps
    });

    expect(result.product).toBeTruthy();
    expect(result.fatalError).toBe(false);
  });
});
