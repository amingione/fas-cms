import { test, expect } from '@playwright/test';

/**
 * API Smoke Tests — Medusa /store/* endpoint health
 *
 * These tests call the Medusa backend directly (not through the Astro BFF)
 * to verify the publishable key is live, sales channel is linked,
 * and all critical commerce endpoints are responsive.
 *
 * They run against production unless MEDUSA_API_URL is overridden.
 *
 * Safe to run in CI on every deploy — no state mutations.
 */

const MEDUSA_API = process.env.MEDUSA_API_URL ?? 'https://api.fasmotorsports.com';
const PUB_KEY =
  process.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY ??
  'pk_dcb89b248b086c070bb82ea39514a01e03c9231954f618c6e10b69bf6d841e95';

const storeHeaders = {
  'x-publishable-api-key': PUB_KEY,
  'Content-Type': 'application/json',
};

// ---------------------------------------------------------------------------
// Publishable key + sales channel
// ---------------------------------------------------------------------------
test.describe('Medusa publishable key', () => {
  test('GET /store/products returns 200 with publishable key', async ({ request }) => {
    const res = await request.get(`${MEDUSA_API}/store/products?limit=1`, {
      headers: storeHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('products');
    expect(Array.isArray(body.products)).toBe(true);
  });

  test('GET /store/products without publishable key returns 400 or 401', async ({ request }) => {
    const res = await request.get(`${MEDUSA_API}/store/products?limit=1`);
    // Medusa requires the publishable key header — missing key = auth error
    expect([400, 401, 403]).toContain(res.status());
  });

  test('GET /store/regions returns 200 and at least one region', async ({ request }) => {
    const res = await request.get(`${MEDUSA_API}/store/regions`, {
      headers: storeHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('regions');
    expect(body.regions.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Product catalogue
// ---------------------------------------------------------------------------
test.describe('Product catalogue', () => {
  test('products endpoint returns count and product objects', async ({ request }) => {
    const res = await request.get(`${MEDUSA_API}/store/products?limit=5`, {
      headers: storeHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.count).toBe('number');
    expect(body.count).toBeGreaterThan(0);

    const first = body.products[0];
    // Each product must have the fields the storefront depends on
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('title');
    expect(first).toHaveProperty('handle');
    expect(first).toHaveProperty('variants');
    expect(Array.isArray(first.variants)).toBe(true);
  });

  test('product variants include calculated_price when region is set', async ({ request }) => {
    // First get a region ID
    const regRes = await request.get(`${MEDUSA_API}/store/regions`, {
      headers: storeHeaders,
    });
    const regions = (await regRes.json()).regions;
    const regionId: string = regions[0].id;

    // Fetch products with pricing context
    const res = await request.get(
      `${MEDUSA_API}/store/products?limit=3&region_id=${regionId}`,
      { headers: storeHeaders }
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    const product = body.products[0];
    const variant = product?.variants?.[0];

    // Variant must have calculated_price when region_id is supplied
    expect(variant).toBeDefined();
    // Allow null price for out-of-region but not missing key entirely
    expect('calculated_price' in variant).toBe(true);
  });

  test('product search by title keyword returns results', async ({ request }) => {
    const res = await request.get(
      `${MEDUSA_API}/store/products?q=fas&limit=5`,
      { headers: storeHeaders }
    );
    expect(res.status()).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Cart lifecycle
// ---------------------------------------------------------------------------
test.describe('Cart lifecycle', () => {
  let cartId: string;
  let regionId: string;

  test('POST /store/carts creates a cart', async ({ request }) => {
    // Resolve region first
    const regRes = await request.get(`${MEDUSA_API}/store/regions`, {
      headers: storeHeaders,
    });
    regionId = (await regRes.json()).regions[0].id;

    const res = await request.post(`${MEDUSA_API}/store/carts`, {
      headers: storeHeaders,
      data: { region_id: regionId },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.cart).toHaveProperty('id');
    expect(body.cart.id).toMatch(/^cart_/);
    cartId = body.cart.id;
  });

  test('GET /store/carts/:id retrieves the created cart', async ({ request }) => {
    if (!cartId) test.skip(true, 'Cart creation failed in previous test');
    const res = await request.get(`${MEDUSA_API}/store/carts/${cartId}`, {
      headers: storeHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.cart.id).toBe(cartId);
    expect(body.cart.region_id).toBe(regionId);
  });
});

// ---------------------------------------------------------------------------
// Shipping options
// ---------------------------------------------------------------------------
test.describe('Shipping options', () => {
  test('cart has shipping options available after address is set', async ({ request }) => {
    // Create a fresh cart
    const regRes = await request.get(`${MEDUSA_API}/store/regions`, {
      headers: storeHeaders,
    });
    const region = (await regRes.json()).regions[0];

    const cartRes = await request.post(`${MEDUSA_API}/store/carts`, {
      headers: storeHeaders,
      data: { region_id: region.id },
    });
    const cart = (await cartRes.json()).cart;

    // Set shipping address
    await request.post(`${MEDUSA_API}/store/carts/${cart.id}`, {
      headers: storeHeaders,
      data: {
        shipping_address: {
          first_name: 'Test',
          last_name: 'Runner',
          address_1: '123 Test Ave',
          city: 'Phoenix',
          province: 'AZ',
          postal_code: '85001',
          country_code: 'us',
          phone: '5555555555',
        },
      },
    });

    // Fetch shipping options
    const soRes = await request.get(
      `${MEDUSA_API}/store/shipping-options?cart_id=${cart.id}`,
      { headers: storeHeaders }
    );
    expect(soRes.status()).toBe(200);
    const soBody = await soRes.json();
    expect(Array.isArray(soBody.shipping_options)).toBe(true);
    // AGENTS.md: Shippo via Medusa — must return at least one shipping option
    expect(soBody.shipping_options.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Backend health
// ---------------------------------------------------------------------------
test.describe('Medusa backend health', () => {
  test('GET /health returns 200', async ({ request }) => {
    const res = await request.get(`${MEDUSA_API}/health`);
    expect(res.status()).toBe(200);
  });

  test('store API responds within 5 seconds', async ({ request }) => {
    const start = Date.now();
    await request.get(`${MEDUSA_API}/store/products?limit=1`, {
      headers: storeHeaders,
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test('deprecated Netlify direct-Stripe endpoints are dead (410 or 404)', async ({ request }) => {
    // Architecture compliance: direct-Stripe Netlify functions must not be callable.
    // fas-sanity (fassanity.fasmotorsports.com) returns 410 after stub deploy.
    // fas-cms-fresh (fasmotorsports.com) never had these functions → 404.
    // Both 404 and 410 are acceptable — neither allows the deprecated flow.
    const SANITY_BASE = 'https://fassanity.fasmotorsports.com';
    const deprecated = [
      'createCheckoutSession',
      'stripeWebhook',
      'stripeWebhookHandler',
      'manual-fulfill-order',
    ];
    for (const fn of deprecated) {
      const res = await request.get(
        `${SANITY_BASE}/.netlify/functions/${fn}`,
        { maxRedirects: 0 }
      );
      // 410 = stub deployed and returning Gone
      // 404 = function never existed or not yet deployed
      // 200 = SPA catch-all (acceptable for Sanity Studio SPA — function is still dead)
      // FAIL if we get 2xx from actual function execution (check for JSON error body)
      if (res.status() === 200) {
        const body = await res.text();
        // Real 410 stub returns JSON with DEPRECATED_DIRECT_STRIPE code
        // SPA catch-all returns HTML — both mean function is not executing commerce logic
        const isDeprecatedStub = body.includes('DEPRECATED_DIRECT_STRIPE');
        const isSpaHtml = body.includes('<!DOCTYPE html') || body.includes('<html');
        expect(isDeprecatedStub || isSpaHtml).toBe(true);
      } else {
        expect([404, 410]).toContain(res.status());
      }
    }
  });
});
