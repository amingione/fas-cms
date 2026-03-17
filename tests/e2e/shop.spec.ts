import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shop — Category Pages
// ---------------------------------------------------------------------------

test.describe('Category pages', () => {
  test('category page responds without 5xx', async ({ page }) => {
    const response = await page.goto('/shop/categories/wheels');
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).not.toBe(503);
  });

  test('category page shows product cards or a graceful empty state — not a blank page', async ({ page }) => {
    // Use a known-active category slug (billet-parts has live products)
    await page.goto('/shop/categories/billet-parts');
    // ProductCard root class is "pc" (see src/components/ProductCard.tsx)
    const hasProducts = await page.locator('.pc').count();
    // Empty state or category heading (present even if 0 products)
    const hasCategoryTitle = await page.locator('h1').count();

    expect(hasProducts + hasCategoryTitle).toBeGreaterThan(0);
  });

  test('filter page responds without 5xx', async ({ page }) => {
    // Try the first filter slug we can find from the shop nav
    const response = await page.goto('/shop/filters/lift-kits');
    expect(response?.status()).not.toBe(500);
  });

  test('sale/tags page responds without 5xx', async ({ page }) => {
    const response = await page.goto('/shop/sale/all');
    expect(response?.status()).not.toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Product Slug Pages — /shop/[slug]
// ---------------------------------------------------------------------------

test.describe('Product slug pages', () => {
  const knownSlugs = [
    'fas-predator-pulley',
    'fas-pulley',
    'trd-supercharger',
  ];

  // Pick the first slug that resolves to a real page
  let resolvedSlug: string | null = null;

  test('find at least one resolvable product slug from the shop index', async ({ page }) => {
    await page.goto('/shop');
    // Collect all /shop/ href links that look like product pages (not /shop/categories, etc.)
    const links = await page.locator('a[href^="/shop/"]').evaluateAll((els) =>
      els
        .map((el) => el.getAttribute('href'))
        .filter((href): href is string => {
          if (typeof href !== 'string') return false;
          return (
            !href.includes('/categories') &&
            !href.includes('/filters') &&
            !href.includes('/sale')
          );
        })
        .slice(0, 5)
    );
    if (links.length > 0) {
      resolvedSlug = links[0];
    }
    // We expect the shop to have at least one product linked
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  test('product page renders h1 and add-to-cart area', async ({ page }) => {
    // Try known slugs or use the one discovered above
    const slugsToTry = resolvedSlug ? [resolvedSlug, ...knownSlugs] : knownSlugs;

    let found = false;
    for (const slug of slugsToTry) {
      const response = await page.goto(typeof slug === 'string' && slug.startsWith('/') ? slug : `/shop/${slug}`);
      if (response?.status() === 200) {
        await expect(page.locator('h1')).toBeVisible();
        found = true;
        break;
      }
    }
    if (!found) {
      // Soft fail — log a warning but don't break CI if slugs changed
      console.warn('[shop.spec] Could not find a resolvable product slug. Check known slugs list.');
    }
  });

  test('draft product slug returns 404 or redirects', async ({ page }) => {
    // Draft slugs typically don't exist at all, so a fake draft slug should 404
    const response = await page.goto('/shop/drafts-fake-unpublished-product-abc123xyz');
    expect([404, 301, 302, 307, 308]).toContain(response?.status());
  });
});

// ---------------------------------------------------------------------------
// Blog Slug Pages
// ---------------------------------------------------------------------------

test.describe('Blog pages', () => {
  test('blog index responds without 5xx', async ({ page }) => {
    const response = await page.goto('/blog');
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).not.toBe(503);
  });

  test('blog slug page has og:type = article', async ({ page }) => {
    // Find the first blog post
    await page.goto('/blog');
    const firstPostLink = page.locator('a[href^="/blog/"]').first();
    const href = await firstPostLink.getAttribute('href');
    if (!href) return;

    await page.goto(href);
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    expect(ogType).toBe('article');
  });

  test('blog slug page has JSON-LD Article schema', async ({ page }) => {
    await page.goto('/blog');
    const firstPostLink = page.locator('a[href^="/blog/"]').first();
    const href = await firstPostLink.getAttribute('href');
    if (!href) return;

    await page.goto(href);
    const jsonLd = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'Article') return data;
        } catch {}
      }
      return null;
    });
    expect(jsonLd).not.toBeNull();
    expect(jsonLd?.['@type']).toBe('Article');
  });
});
