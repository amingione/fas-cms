/**
 * WS2-2 — Medusa-only pricing authority audit
 *
 * These tests enforce the invariant that ALL product price and availability
 * data used in the storefront comes exclusively from Medusa, never from
 * Sanity or any other non-authoritative source.
 *
 * Acceptance criteria:
 *  - resolveProductCalculatedPriceAmount returns null (not a Sanity fallback)
 *    when Medusa pricing data is absent.
 *  - hasMedusaAuthoritativePricing correctly gates Medusa-sourced prices.
 *  - resolveVariantCalculatedPriceAmount handles all Medusa price shapes.
 *  - resolveVariantCalculatedOriginalAmount reads compare-at from Medusa only.
 */

import { describe, expect, it } from 'vitest';
import {
  resolveProductCalculatedPriceAmount,
  resolveProductCalculatedOriginalAmount,
  resolveVariantCalculatedPriceAmount,
  resolveVariantCalculatedOriginalAmount,
  hasMedusaAuthoritativePricing
} from '../src/lib/medusa-storefront-pricing';

// ── helpers ────────────────────────────────────────────────────────────────

function makeMedusaProduct(variantPrice: unknown) {
  return {
    id: 'prod_test',
    variants: [
      {
        id: 'var_test',
        calculated_price: variantPrice
      }
    ]
  };
}

function wrapWithMedusa(sanityProduct: Record<string, unknown>, variantPrice: unknown) {
  return {
    ...sanityProduct,
    medusa: makeMedusaProduct(variantPrice)
  };
}

// ── resolveVariantCalculatedPriceAmount ────────────────────────────────────

describe('resolveVariantCalculatedPriceAmount', () => {
  it('returns null for null/undefined input', () => {
    expect(resolveVariantCalculatedPriceAmount(null)).toBeNull();
    expect(resolveVariantCalculatedPriceAmount(undefined)).toBeNull();
  });

  it('resolves a plain number calculated_price', () => {
    const variant = { id: 'v1', calculated_price: 129900 };
    expect(resolveVariantCalculatedPriceAmount(variant)).toBe(129900);
  });

  it('resolves calculated_price.amount', () => {
    const variant = { id: 'v1', calculated_price: { amount: 99900 } };
    expect(resolveVariantCalculatedPriceAmount(variant)).toBe(99900);
  });

  it('resolves calculated_price.calculated_amount', () => {
    const variant = { id: 'v1', calculated_price: { calculated_amount: 84900 } };
    expect(resolveVariantCalculatedPriceAmount(variant)).toBe(84900);
  });

  it('resolves nested calculated_price.calculated_price.amount', () => {
    const variant = {
      id: 'v1',
      calculated_price: { calculated_price: { amount: 64900 } }
    };
    expect(resolveVariantCalculatedPriceAmount(variant)).toBe(64900);
  });

  it('returns null when no price fields are present', () => {
    expect(resolveVariantCalculatedPriceAmount({ id: 'v1' })).toBeNull();
    expect(resolveVariantCalculatedPriceAmount({ id: 'v1', calculated_price: null })).toBeNull();
    expect(resolveVariantCalculatedPriceAmount({ id: 'v1', calculated_price: {} })).toBeNull();
  });
});

// ── resolveVariantCalculatedOriginalAmount ─────────────────────────────────

describe('resolveVariantCalculatedOriginalAmount', () => {
  it('returns null for null/undefined input', () => {
    expect(resolveVariantCalculatedOriginalAmount(null)).toBeNull();
    expect(resolveVariantCalculatedOriginalAmount(undefined)).toBeNull();
  });

  it('resolves calculated_price.original_amount', () => {
    const variant = {
      id: 'v1',
      calculated_price: { original_amount: 149900, amount: 99900 }
    };
    expect(resolveVariantCalculatedOriginalAmount(variant)).toBe(149900);
  });

  it('resolves nested calculated_price.original_price.amount', () => {
    const variant = {
      id: 'v1',
      calculated_price: { original_price: { amount: 189900 } }
    };
    expect(resolveVariantCalculatedOriginalAmount(variant)).toBe(189900);
  });

  it('returns null when no original price is present', () => {
    expect(resolveVariantCalculatedOriginalAmount({ id: 'v1' })).toBeNull();
    expect(resolveVariantCalculatedOriginalAmount({ id: 'v1', calculated_price: {} })).toBeNull();
  });
});

// ── resolveProductCalculatedPriceAmount — Medusa-only authority ────────────

describe('resolveProductCalculatedPriceAmount — Medusa authority', () => {
  it('returns null (not a Sanity fallback) when no Medusa data is attached', () => {
    // A Sanity-only product with legacy pricing fields that must NEVER be used.
    const sanityOnly = {
      _id: 'sanity-abc',
      title: 'Test Product',
      slug: { current: 'test-product' },
      price: 99900,         // legacy Sanity field — MUST be ignored
      salePrice: 79900,     // legacy Sanity field — MUST be ignored
      compareAtPrice: 99900 // legacy Sanity field — MUST be ignored
    };

    const result = resolveProductCalculatedPriceAmount(sanityOnly);
    expect(result).toBeNull();
  });

  it('returns the Medusa calculated price when attached', () => {
    const product = wrapWithMedusa(
      { _id: 'sanity-abc', title: 'Test Product', price: 99900 }, // Sanity field present but ignored
      { amount: 129900 }
    );

    expect(resolveProductCalculatedPriceAmount(product)).toBe(129900);
  });

  it('returns null when Medusa product has no variants', () => {
    const product = {
      _id: 'sanity-abc',
      title: 'Test Product',
      price: 99900, // Sanity legacy field — must NOT be used as fallback
      medusa: { id: 'prod_1', variants: [] }
    };

    expect(resolveProductCalculatedPriceAmount(product)).toBeNull();
  });

  it('returns null when Medusa variant has no calculated_price', () => {
    const product = {
      _id: 'sanity-abc',
      title: 'Test Product',
      price: 99900, // Sanity legacy field — must NOT be used as fallback
      medusa: {
        id: 'prod_1',
        variants: [{ id: 'var_1' }] // no calculated_price
      }
    };

    expect(resolveProductCalculatedPriceAmount(product)).toBeNull();
  });

  it('prefers Medusa variant with matching medusaVariantId', () => {
    const product = {
      _id: 'sanity-abc',
      medusaVariantId: 'var_preferred',
      medusa: {
        id: 'prod_1',
        variants: [
          { id: 'var_default', calculated_price: { amount: 99900 } },
          { id: 'var_preferred', calculated_price: { amount: 149900 } }
        ]
      }
    };

    expect(resolveProductCalculatedPriceAmount(product)).toBe(149900);
  });
});

// ── resolveProductCalculatedOriginalAmount — compare-at from Medusa only ──

describe('resolveProductCalculatedOriginalAmount — compare-at from Medusa only', () => {
  it('returns null when no Medusa data is attached', () => {
    const sanityOnly = {
      _id: 'sanity-abc',
      compareAtPrice: 149900 // Sanity field — must NEVER be used
    };

    expect(resolveProductCalculatedOriginalAmount(sanityOnly)).toBeNull();
  });

  it('returns Medusa original_amount when available', () => {
    const product = wrapWithMedusa(
      { _id: 'sanity-abc' },
      { amount: 99900, original_amount: 149900 }
    );

    expect(resolveProductCalculatedOriginalAmount(product)).toBe(149900);
  });

  it('returns null when Medusa variant has no original price', () => {
    const product = wrapWithMedusa(
      { _id: 'sanity-abc', compareAtPrice: 149900 }, // Sanity field — must NOT be used
      { amount: 99900 } // no original_amount
    );

    expect(resolveProductCalculatedOriginalAmount(product)).toBeNull();
  });
});

// ── hasMedusaAuthoritativePricing ──────────────────────────────────────────

describe('hasMedusaAuthoritativePricing', () => {
  it('returns false when product has no Medusa data', () => {
    expect(hasMedusaAuthoritativePricing({ _id: 'x', price: 99900 })).toBe(false);
  });

  it('returns false when Medusa variant has no calculated price', () => {
    const product = {
      _id: 'x',
      medusa: { id: 'prod_1', variants: [{ id: 'var_1' }] }
    };
    expect(hasMedusaAuthoritativePricing(product)).toBe(false);
  });

  it('returns true when Medusa calculated price is present', () => {
    const product = wrapWithMedusa({ _id: 'x' }, { amount: 129900 });
    expect(hasMedusaAuthoritativePricing(product)).toBe(true);
  });

  it('returns false for null/undefined', () => {
    expect(hasMedusaAuthoritativePricing(null)).toBe(false);
    expect(hasMedusaAuthoritativePricing(undefined)).toBe(false);
  });
});
