import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    fetch: vi.fn().mockResolvedValue(null),
    patch: vi.fn(() => ({
      set: vi.fn().mockReturnThis(),
      commit: vi.fn().mockResolvedValue({ _id: 'customer.updated' })
    })),
    create: vi.fn().mockResolvedValue({ _id: 'customer.created' })
  }))
}));

import { POST as customerUpdateHandler } from '../src/pages/api/customer/update';

describe('customer/update API auth', () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...env,
      SANITY_PROJECT_ID: 'test-project',
      SANITY_DATASET: 'test-dataset',
      SANITY_WRITE_TOKEN: 'sanity-write-token',
      CUSTOMER_UPDATE_API_TOKEN: 'update-token'
    };
  });

  afterEach(() => {
    process.env = env;
    vi.clearAllMocks();
  });

  it('rejects requests without a bearer token', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    });

    const response = await customerUpdateHandler({ request } as any);
    expect(response.status).toBe(401);
  });

  it('accepts authorized requests', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer update-token'
      },
      body: JSON.stringify({ sub: 'abc123', email: 'test@example.com' })
    });

    const response = await customerUpdateHandler({ request } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });
});
