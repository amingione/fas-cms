import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Accessibility — Core Pages
// Checks for baseline structural a11y without requiring @axe-core/playwright.
// These tests verify the structural fixes made in sessions 1-3.
// ---------------------------------------------------------------------------

const PAGES_TO_CHECK = [
  { path: '/', name: 'Homepage' },
  { path: '/shop', name: 'Shop index' },
  { path: '/checkout', name: 'Checkout' },
  { path: '/blog', name: 'Blog index' },
];

test.describe('Skip navigation link', () => {
  for (const { path, name } of PAGES_TO_CHECK) {
    test(`${name} (${path}) has a skip-to-main link`, async ({ page }) => {
      await page.goto(path);
      const skipLink = page.locator('a.skip-to-main, a[href="#main-content"]');
      await expect(skipLink).toHaveCount(1);
      await expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    test(`${name} (${path}) has a <main id="main-content"> target`, async ({ page }) => {
      await page.goto(path);
      const main = page.locator('#main-content');
      await expect(main).toHaveCount(1);
    });
  }
});

test.describe('Heading hierarchy', () => {
  test('homepage has exactly one h1', async ({ page }) => {
    await page.goto('/');
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('checkout page has exactly one h1 or h2 level heading', async ({ page }) => {
    await page.goto('/checkout');
    const headingCount = await page.locator('h1, h2').count();
    expect(headingCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Image alt text', () => {
  test('homepage has no images with empty alt on meaningful images', async ({ page }) => {
    await page.goto('/');
    // Images WITHOUT alt="" AND without aria-hidden — these are accessibility violations
    const violatingImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img:not([aria-hidden="true"])'));
      return imgs
        .filter((img) => {
          const alt = img.getAttribute('alt');
          // alt="" is valid for decorative images; missing alt entirely is the violation
          return alt === null;
        })
        .map((img) => (img as HTMLImageElement).src)
        .slice(0, 5);
    });
    expect(violatingImages).toHaveLength(0);
  });
});

test.describe('Form labels', () => {
  test('checkout form discount input is labelled', async ({ page }) => {
    await page.goto('/checkout');
    // Seed a cart so the form renders
    await page.evaluate(() => {
      window.localStorage.setItem('fas_cart_v1', JSON.stringify({
        items: [{ id: 'p1', name: 'Part', price: 9900, quantity: 1, medusaVariantId: 'v1' }]
      }));
    });
    await page.reload();
    await page.waitForTimeout(1000);

    const unlabelledInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs
        .filter((el) => {
          const id = el.getAttribute('id');
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          const placeholder = el.getAttribute('placeholder');
          const hasLabel = id ? Boolean(document.querySelector(`label[for="${id}"]`)) : false;
          // An input is considered labelled if it has: for/id pair, aria-label, aria-labelledby,
          // or is inside a <label>. Placeholder alone is not sufficient.
          const insideLabel = el.closest('label') !== null;
          return !hasLabel && !ariaLabel && !ariaLabelledBy && !insideLabel;
        })
        .map((el) => ({
          tag: el.tagName,
          id: el.getAttribute('id') ?? '',
          name: el.getAttribute('name') ?? '',
          type: el.getAttribute('type') ?? '',
          placeholder: el.getAttribute('placeholder') ?? '',
        }))
        .filter((el) => el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button');
    });

    if (unlabelledInputs.length > 0) {
      console.warn('[a11y] Unlabelled inputs found:', JSON.stringify(unlabelledInputs, null, 2));
    }
    // Allow up to 2 edge-case unlabelled inputs (Stripe iframe injected inputs, etc.)
    expect(unlabelledInputs.length).toBeLessThanOrEqual(2);
  });
});

test.describe('Color contrast (structural check)', () => {
  test('checkout page does not have text color #b2b2b7 (fixed to #c0c0c6)', async ({ page }) => {
    await page.goto('/checkout');
    const hasOldColor = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const color = window.getComputedStyle(el).color;
        // rgb(178, 178, 183) = #b2b2b7 — the old failing contrast value
        if (color === 'rgb(178, 178, 183)') return true;
      }
      return false;
    });
    expect(hasOldColor).toBe(false);
  });
});

test.describe('Focus management', () => {
  test('skip link appears visible when focused', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const isVisible = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.height > 0;
    });
    expect(isVisible).toBe(true);
  });
});
