import fs from 'node:fs/promises';
import { describe, it, expect } from 'vitest';

const checkoutPath = new URL(
  '../src/pages/api/legacy/stripe/create-checkout-session.ts',
  import.meta.url
);
const forbiddenTerms = [
  'fetchLiveShippingQuote',
  'getShippingQuoteBySkus',
  'SANITY_QUOTE_FN_PATH',
  'SHIPPING_LIVE_RATES_MODE',
  'flat_fallback',
  'buildQuoteKey'
] as const

describe('checkout API quote guardrail', () => {
  it('does not import or reference legacy quote helpers', async () => {
    const content = await fs.readFile(checkoutPath, 'utf-8');
    forbiddenTerms.forEach((term) => {
      expect(content).not.toContain(term);
    });
  });
});
